from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import EmailDelivery


async def get_delivery_by_idempotency_key(
    db: AsyncSession, *, idempotency_key: str
) -> EmailDelivery | None:
    result = await db.execute(
        select(EmailDelivery).where(EmailDelivery.idempotency_key == idempotency_key)
    )
    return result.scalar_one_or_none()


async def create_delivery(
    db: AsyncSession,
    *,
    tenant_id: UUID | None,
    to_email: str,
    template: str,
    subject: str,
    status: str,
    provider: str,
    idempotency_key: str,
    provider_message_id: str | None = None,
    error: str | None = None,
) -> EmailDelivery:
    delivery = EmailDelivery(
        tenant_id=tenant_id,
        to_email=to_email.lower(),
        template=template,
        subject=subject,
        status=status,
        provider=provider,
        provider_message_id=provider_message_id,
        idempotency_key=idempotency_key,
        error=error,
    )
    db.add(delivery)
    await db.flush()
    return delivery


async def mark_delivery_sent(
    db: AsyncSession,
    *,
    delivery_id: UUID,
    provider_message_id: str | None = None,
) -> None:
    delivery = await db.get(EmailDelivery, delivery_id)
    if delivery is not None:
        delivery.status = "sent"
        delivery.provider_message_id = provider_message_id
        delivery.updated_at = datetime.now(UTC)


async def mark_delivery_failed(
    db: AsyncSession,
    *,
    delivery_id: UUID,
    error: str,
) -> None:
    delivery = await db.get(EmailDelivery, delivery_id)
    if delivery is not None:
        delivery.status = "failed"
        delivery.error = error
        delivery.updated_at = datetime.now(UTC)
