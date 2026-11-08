from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Payment


async def list_payments(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    work_order_id: UUID | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[Payment], int]:
    filters = [Payment.tenant_id == tenant_id]
    if work_order_id:
        filters.append(Payment.work_order_id == work_order_id)

    total = await db.scalar(select(func.count()).select_from(Payment).where(*filters))
    result = await db.execute(
        select(Payment).where(*filters).order_by(Payment.paid_at.desc()).limit(limit).offset(offset)
    )
    return list(result.scalars().all()), int(total or 0)


async def get_payment(db: AsyncSession, *, tenant_id: UUID, payment_id: UUID) -> Payment | None:
    result = await db.execute(
        select(Payment).where(
            Payment.id == payment_id,
            Payment.tenant_id == tenant_id,
        )
    )
    return result.scalar_one_or_none()


async def create_payment(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    work_order_id: UUID,
    quote_id: UUID | None,
    amount: Decimal,
    currency: str,
    method: str,
    paid_at: datetime,
    reference: str | None,
    notes: str | None,
) -> Payment:
    payment = Payment(
        tenant_id=tenant_id,
        work_order_id=work_order_id,
        quote_id=quote_id,
        amount=amount,
        currency=currency,
        method=method,
        paid_at=paid_at,
        reference=reference,
        notes=notes,
    )
    db.add(payment)
    await db.flush()
    return payment


async def sum_registered_by_work_order(
    db: AsyncSession, *, tenant_id: UUID, work_order_id: UUID
) -> Decimal:
    result = await db.scalar(
        select(func.coalesce(func.sum(Payment.amount), Decimal("0.00"))).where(
            Payment.tenant_id == tenant_id,
            Payment.work_order_id == work_order_id,
            Payment.status == "registered",
        )
    )
    return Decimal(result or "0.00")
