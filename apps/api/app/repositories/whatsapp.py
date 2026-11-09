from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import WhatsAppConfig, WhatsAppMessage


async def get_config_by_tenant(
    db: AsyncSession,
    tenant_id: UUID,
) -> WhatsAppConfig | None:
    result = await db.execute(select(WhatsAppConfig).where(WhatsAppConfig.tenant_id == tenant_id))
    return result.scalar_one_or_none()


async def get_config_by_phone_number_id(
    db: AsyncSession,
    phone_number_id: str,
) -> WhatsAppConfig | None:
    result = await db.execute(
        select(WhatsAppConfig).where(WhatsAppConfig.phone_number_id == phone_number_id)
    )
    return result.scalar_one_or_none()


async def upsert_config(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    phone_number_id: str,
    business_account_id: str,
    access_token_encrypted: str | None,
    verify_token_encrypted: str | None,
    app_secret_encrypted: str | None,
    active: bool,
) -> WhatsAppConfig:
    config = await get_config_by_tenant(db, tenant_id)
    if config is None:
        config = WhatsAppConfig(tenant_id=tenant_id)
        db.add(config)

    config.phone_number_id = phone_number_id
    config.business_account_id = business_account_id
    if access_token_encrypted is not None:
        config.access_token_encrypted = access_token_encrypted
    if verify_token_encrypted is not None:
        config.verify_token_encrypted = verify_token_encrypted
    if app_secret_encrypted is not None:
        config.app_secret_encrypted = app_secret_encrypted
    config.active = active

    await db.flush()
    await db.refresh(config)
    return config


async def list_messages(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[WhatsAppMessage], int]:
    filters = [WhatsAppMessage.tenant_id == tenant_id]
    total = await db.scalar(select(func.count()).select_from(WhatsAppMessage).where(*filters))
    result = await db.execute(
        select(WhatsAppMessage)
        .where(*filters)
        .order_by(WhatsAppMessage.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(result.scalars().all()), int(total or 0)


async def get_message_by_wa_message_id(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    wa_message_id: str,
) -> WhatsAppMessage | None:
    result = await db.execute(
        select(WhatsAppMessage).where(
            WhatsAppMessage.tenant_id == tenant_id,
            WhatsAppMessage.wa_message_id == wa_message_id,
        )
    )
    return result.scalar_one_or_none()


async def create_message(
    db: AsyncSession,
    *,
    tenant_id: UUID | None,
    direction: str,
    wa_message_id: str | None,
    from_phone: str,
    to_phone: str,
    message_type: str,
    body: str | None,
    status: str,
    payload: dict[str, object] | None = None,
) -> WhatsAppMessage:
    message = WhatsAppMessage(
        tenant_id=tenant_id,
        direction=direction,
        wa_message_id=wa_message_id,
        from_phone=from_phone,
        to_phone=to_phone,
        message_type=message_type,
        body=body,
        status=status,
        payload=payload,
    )
    db.add(message)
    await db.flush()
    await db.refresh(message)
    return message
