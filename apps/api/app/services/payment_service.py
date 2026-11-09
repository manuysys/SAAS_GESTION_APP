from datetime import UTC, datetime
from decimal import Decimal
from typing import Final
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Payment, Quote
from app.repositories.payments import (
    create_payment,
    get_payment,
    list_payments,
    sum_registered_by_work_order,
)
from app.repositories.work_orders import get_work_order
from app.schemas.payment import PaymentCreate
from app.services import automation_service

_ALLOWED_METHODS: Final = frozenset({"cash", "transfer", "card", "mercadopago", "other"})


async def _recalc_work_order_payment_status(
    db: AsyncSession, *, tenant_id: UUID, work_order_id: UUID
) -> None:
    order = await get_work_order(db, tenant_id=tenant_id, order_id=work_order_id)
    if order is None:
        return

    total_paid = await sum_registered_by_work_order(
        db, tenant_id=tenant_id, work_order_id=work_order_id
    )
    approved_result = await db.scalar(
        select(func.coalesce(func.sum(Quote.total), Decimal("0.00"))).where(
            Quote.tenant_id == tenant_id,
            Quote.work_order_id == work_order_id,
            Quote.status == "approved",
        )
    )
    approved_total = Decimal(approved_result or "0.00")

    if approved_total == Decimal("0.00"):
        order.payment_status = "partial" if total_paid > Decimal("0.00") else "pending"
    elif total_paid >= approved_total:
        order.payment_status = "paid"
    elif total_paid > Decimal("0.00"):
        order.payment_status = "partial"
    else:
        order.payment_status = "pending"


async def list_tenant_payments(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    work_order_id: UUID | None,
    limit: int,
    offset: int,
) -> tuple[list[Payment], int]:
    return await list_payments(
        db,
        tenant_id=tenant_id,
        work_order_id=work_order_id,
        limit=limit,
        offset=offset,
    )


async def create_tenant_payment(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    payload: PaymentCreate,
) -> Payment:
    if payload.method not in _ALLOWED_METHODS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Invalid payment method",
        )

    order = await get_work_order(db, tenant_id=tenant_id, order_id=payload.work_order_id)
    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Work order not found",
        )

    if payload.quote_id:
        quote_result = await db.execute(
            select(Quote).where(
                Quote.id == payload.quote_id,
                Quote.tenant_id == tenant_id,
            )
        )
        quote = quote_result.scalar_one_or_none()
        if quote is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Quote not found",
            )
        if quote.work_order_id not in (None, payload.work_order_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Quote does not belong to the selected work order",
            )

    paid_at = payload.paid_at or datetime.now(UTC)
    if paid_at.tzinfo is None:
        paid_at = paid_at.replace(tzinfo=UTC)

    payment = await create_payment(
        db,
        tenant_id=tenant_id,
        work_order_id=payload.work_order_id,
        quote_id=payload.quote_id,
        amount=payload.amount,
        currency="ARS",
        method=payload.method,
        paid_at=paid_at,
        reference=payload.reference,
        notes=payload.notes,
    )
    await _recalc_work_order_payment_status(
        db, tenant_id=tenant_id, work_order_id=payload.work_order_id
    )
    await automation_service.emit_event(
        db,
        tenant_id=tenant_id,
        event_type="payment_registered",
        payload={
            "payment_id": str(payment.id),
            "work_order_id": str(payment.work_order_id),
            "amount": str(payment.amount),
            "method": payment.method,
        },
    )
    await db.commit()
    await db.refresh(payment)
    return payment


async def void_tenant_payment(db: AsyncSession, *, tenant_id: UUID, payment_id: UUID) -> Payment:
    payment = await get_payment(db, tenant_id=tenant_id, payment_id=payment_id)
    if payment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found",
        )
    if payment.status == "voided":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Payment is already voided",
        )

    payment.status = "voided"
    await db.flush()
    await _recalc_work_order_payment_status(
        db, tenant_id=tenant_id, work_order_id=payment.work_order_id
    )
    await db.commit()
    await db.refresh(payment)
    return payment
