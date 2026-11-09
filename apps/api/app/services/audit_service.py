from __future__ import annotations

import hashlib
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models import AuditLog


def _hash(value: str | None) -> str | None:
    if value is None:
        return None
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _safe_metadata(value: dict | None) -> dict | None:
    if value is None:
        return None
    # Filtra claves sensibles sin mutar el diccionario del llamador.
    forbidden = {
        "password",
        "password_hash",
        "token",
        "refresh_token",
        "access_token",
        "api_key",
        "secret",
        "whatsapp_encryption_key",
        "authorization",
    }
    return {k: v for k, v in value.items() if k.lower() not in forbidden}


async def record(
    db: AsyncSession,
    *,
    action: str,
    entity_type: str,
    entity_id: str | None = None,
    tenant_id: UUID | None = None,
    actor_user_id: UUID | None = None,
    metadata: dict | None = None,
    ip: str | None = None,
    user_agent: str | None = None,
) -> AuditLog | None:
    if not settings.audit_enabled:
        return None

    audit = AuditLog(
        tenant_id=tenant_id,
        actor_user_id=actor_user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=_safe_metadata(metadata),
        ip_hash=_hash(ip),
        user_agent=user_agent[:300] if user_agent else None,
    )
    db.add(audit)
    await db.flush()
    return audit
