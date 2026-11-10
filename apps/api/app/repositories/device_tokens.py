from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import DeviceToken


async def get_device_token_by_token(db: AsyncSession, *, token: str) -> DeviceToken | None:
    result = await db.execute(select(DeviceToken).where(DeviceToken.token == token))
    return result.scalar_one_or_none()


async def list_device_tokens_for_user(
    db: AsyncSession, *, tenant_id: UUID, user_id: UUID
) -> list[DeviceToken]:
    result = await db.execute(
        select(DeviceToken).where(
            DeviceToken.tenant_id == tenant_id,
            DeviceToken.user_id == user_id,
        )
    )
    return list(result.scalars().all())


async def create_device_token(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    user_id: UUID,
    token: str,
    platform: str,
) -> DeviceToken:
    device = DeviceToken(
        tenant_id=tenant_id,
        user_id=user_id,
        token=token,
        platform=platform,
    )
    db.add(device)
    await db.flush()
    return device


async def delete_device_token(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    user_id: UUID,
    token: str,
) -> bool:
    result = await db.execute(
        select(DeviceToken).where(
            DeviceToken.tenant_id == tenant_id,
            DeviceToken.user_id == user_id,
            DeviceToken.token == token,
        )
    )
    device = result.scalar_one_or_none()
    if device is None:
        return False
    await db.delete(device)
    await db.flush()
    return True
