from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import CustomerAccessToken


async def get_access_token_by_hash(
    db: AsyncSession, *, token_hash: str
) -> CustomerAccessToken | None:
    result = await db.execute(
        select(CustomerAccessToken).where(CustomerAccessToken.token_hash == token_hash)
    )
    return result.scalar_one_or_none()


async def get_active_access_token_by_hash(
    db: AsyncSession, *, token_hash: str
) -> CustomerAccessToken | None:
    now = datetime.now(UTC)
    result = await db.execute(
        select(CustomerAccessToken).where(
            CustomerAccessToken.token_hash == token_hash,
            CustomerAccessToken.revoked_at.is_(None),
            CustomerAccessToken.used_at.is_(None),
            CustomerAccessToken.expires_at > now,
        )
    )
    return result.scalar_one_or_none()


async def create_access_token(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    customer_id: UUID,
    token_hash: str,
    expires_at: datetime,
    created_by: UUID | None = None,
    purpose: str = "portal_access",
) -> CustomerAccessToken:
    token = CustomerAccessToken(
        tenant_id=tenant_id,
        customer_id=customer_id,
        token_hash=token_hash,
        expires_at=expires_at,
        created_by=created_by,
        purpose=purpose,
        created_at=datetime.now(UTC),
    )
    db.add(token)
    await db.flush()
    return token


async def revoke_customer_tokens(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    customer_id: UUID,
) -> int:
    result = await db.execute(
        select(CustomerAccessToken).where(
            CustomerAccessToken.tenant_id == tenant_id,
            CustomerAccessToken.customer_id == customer_id,
            CustomerAccessToken.revoked_at.is_(None),
            CustomerAccessToken.used_at.is_(None),
        )
    )
    now = datetime.now(UTC)
    count = 0
    for token in result.scalars().all():
        token.revoked_at = now
        count += 1
    return count
