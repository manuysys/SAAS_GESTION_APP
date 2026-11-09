from __future__ import annotations

import hashlib
import secrets
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, Request, status
from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import get_logger
from app.core.rate_limit import check_rate_limit as _memory_check_rate_limit
from app.models import AuthAttempt, RateLimitBucket

logger = get_logger(__name__)

_WINDOW_SECONDS = 60


class LockoutError(HTTPException):
    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demasiados intentos. Esperá unos minutos.",
        )


def _client_identifier(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client is not None:
        return request.client.host
    return "unknown"


def _hash(value: str | None) -> str | None:
    if value is None:
        return None
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _bucket_hash(scope: str, identifier: str) -> str:
    return hashlib.sha256(f"{scope}:{identifier}".encode()).hexdigest()


def _window_start(now: datetime) -> datetime:
    return now.replace(second=0, microsecond=0, tzinfo=UTC)


async def check_rate_limit(
    db: AsyncSession,
    request: Request,
    *,
    scope: str,
    limit: int,
) -> None:
    if not settings.rate_limit_enabled:
        return

    identifier = _client_identifier(request)
    key_hash = _bucket_hash(scope, identifier)
    now = datetime.now(UTC)
    window = _window_start(now)
    expires_at = window + timedelta(seconds=_WINDOW_SECONDS)

    try:
        stmt = (
            insert(RateLimitBucket)
            .values(
                key_hash=key_hash,
                scope=scope,
                window_start=window,
                count=1,
                expires_at=expires_at,
            )
            .on_conflict_do_update(
                constraint="uq_rate_limit_bucket",
                set_={"count": RateLimitBucket.count + 1},
            )
            .returning(RateLimitBucket.count)
        )
        count = (await db.execute(stmt)).scalar_one()
        await db.commit()

        if secrets.randbelow(100) < 5:
            await _cleanup_expired_buckets(db)

        if count > limit:
            retry_after = max(1, int((expires_at - now).total_seconds()))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Demasiados intentos. Esperá un momento y volvé a probar.",
                headers={"Retry-After": str(retry_after)},
            )
    except SQLAlchemyError as exc:
        await db.rollback()
        logger.warning(
            "rate_limit_db_failed_fallback_to_memory",
            error=str(exc),
            scope=scope,
        )
        _memory_check_rate_limit(request, scope=scope, limit=limit)


async def _cleanup_expired_buckets(db: AsyncSession) -> None:
    now = datetime.now(UTC)
    await db.execute(delete(RateLimitBucket).where(RateLimitBucket.expires_at < now))
    await db.commit()


async def reset_rate_limits_db(db: AsyncSession) -> None:
    await db.execute(delete(RateLimitBucket))
    await db.commit()


async def record_auth_attempt(
    db: AsyncSession,
    *,
    email: str | None,
    ip: str | None,
    success: bool,
) -> None:
    db.add(
        AuthAttempt(
            email_hash=_hash(email),
            ip_hash=_hash(ip),
            success=success,
        )
    )
    await db.commit()

    if secrets.randbelow(100) < 10:
        await _cleanup_old_auth_attempts(db)


async def is_login_locked_out(
    db: AsyncSession,
    *,
    email: str | None,
    ip: str | None,
) -> bool:
    since = datetime.now(UTC) - timedelta(minutes=settings.lockout_window_minutes)
    email_hash = _hash(email)
    ip_hash = _hash(ip)

    if email_hash is not None:
        result = await db.execute(
            select(func.count(AuthAttempt.id)).where(
                AuthAttempt.email_hash == email_hash,
                AuthAttempt.success.is_(False),
                AuthAttempt.created_at >= since,
            )
        )
        if result.scalar_one() >= settings.lockout_max_attempts:
            return True

    if ip_hash is not None:
        result = await db.execute(
            select(func.count(AuthAttempt.id)).where(
                AuthAttempt.ip_hash == ip_hash,
                AuthAttempt.success.is_(False),
                AuthAttempt.created_at >= since,
            )
        )
        if result.scalar_one() >= settings.lockout_max_attempts:
            return True

    return False


async def _cleanup_old_auth_attempts(db: AsyncSession) -> None:
    cutoff = datetime.now(UTC) - timedelta(minutes=settings.lockout_window_minutes)
    await db.execute(delete(AuthAttempt).where(AuthAttempt.created_at < cutoff))
    await db.commit()
