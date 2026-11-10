from uuid import UUID

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.repositories.device_tokens import (
    create_device_token,
    delete_device_token,
    get_device_token_by_token,
    list_device_tokens_for_user,
)

logger = get_logger(__name__)

_EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


async def register_device_token(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    user_id: UUID,
    token: str,
    platform: str,
) -> None:
    existing = await get_device_token_by_token(db, token=token)
    if existing is not None:
        existing.user_id = user_id
        existing.tenant_id = tenant_id
        existing.platform = platform
        await db.flush()
        return

    await create_device_token(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        token=token,
        platform=platform,
    )
    await db.commit()


async def unregister_device_token(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    user_id: UUID,
    token: str,
) -> bool:
    deleted = await delete_device_token(db, tenant_id=tenant_id, user_id=user_id, token=token)
    if deleted:
        await db.commit()
    return deleted


async def send_push_to_user(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    user_id: UUID,
    title: str,
    body: str,
    data: dict[str, object] | None = None,
) -> None:
    devices = await list_device_tokens_for_user(db, tenant_id=tenant_id, user_id=user_id)
    if not devices:
        return

    messages = [
        {
            "to": device.token,
            "title": title,
            "body": body,
            "data": data or {},
        }
        for device in devices
    ]

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(_EXPO_PUSH_URL, json=messages)
            response.raise_for_status()
    except Exception as exc:
        logger.warning(
            "push_notification_failed",
            user_id=str(user_id),
            tenant_id=str(tenant_id),
            error=str(exc),
        )
