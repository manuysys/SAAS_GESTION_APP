from datetime import date, datetime, time, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Appointment,
    Customer,
    Payment,
    Quote,
    ServiceRequest,
    WorkOrder,
)

_ARGENTINA_TZ = "America/Argentina/Buenos_Aires"


def _today_bounds(today: date | None = None) -> tuple[datetime, datetime]:
    from zoneinfo import ZoneInfo

    tz = ZoneInfo(_ARGENTINA_TZ)
    reference = today or datetime.now(tz).date()
    start = datetime.combine(reference, time.min, tzinfo=tz)
    end = datetime.combine(reference + timedelta(days=1), time.min, tzinfo=tz)
    return start, end


async def count_customers(db: AsyncSession, *, tenant_id: UUID) -> int:
    result = await db.scalar(
        select(func.count())
        .select_from(Customer)
        .where(Customer.tenant_id == tenant_id, Customer.deleted_at.is_(None))
    )
    return int(result or 0)


async def count_service_requests(
    db: AsyncSession, *, tenant_id: UUID, status: str | None = None
) -> int:
    filters = [ServiceRequest.tenant_id == tenant_id]
    if status:
        filters.append(ServiceRequest.status == status)
    result = await db.scalar(select(func.count()).select_from(ServiceRequest).where(*filters))
    return int(result or 0)


async def count_work_orders(
    db: AsyncSession, *, tenant_id: UUID, statuses: list[str] | None = None
) -> int:
    filters = [WorkOrder.tenant_id == tenant_id]
    if statuses:
        filters.append(WorkOrder.operational_status.in_(statuses))
    result = await db.scalar(select(func.count()).select_from(WorkOrder).where(*filters))
    return int(result or 0)


async def count_quotes(db: AsyncSession, *, tenant_id: UUID, status: str | None = None) -> int:
    filters = [Quote.tenant_id == tenant_id]
    if status:
        filters.append(Quote.status == status)
    result = await db.scalar(select(func.count()).select_from(Quote).where(*filters))
    return int(result or 0)


async def sum_approved_quotes(db: AsyncSession, *, tenant_id: UUID) -> Decimal:
    result = await db.scalar(
        select(func.coalesce(func.sum(Quote.total), Decimal("0.00"))).where(
            Quote.tenant_id == tenant_id, Quote.status == "approved"
        )
    )
    return Decimal(result or "0.00")


async def sum_registered_payments(db: AsyncSession, *, tenant_id: UUID) -> Decimal:
    result = await db.scalar(
        select(func.coalesce(func.sum(Payment.amount), Decimal("0.00"))).where(
            Payment.tenant_id == tenant_id, Payment.status == "registered"
        )
    )
    return Decimal(result or "0.00")


async def count_payments(db: AsyncSession, *, tenant_id: UUID, status: str | None = None) -> int:
    filters = [Payment.tenant_id == tenant_id]
    if status:
        filters.append(Payment.status == status)
    result = await db.scalar(select(func.count()).select_from(Payment).where(*filters))
    return int(result or 0)


async def count_appointments_today(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    today: date | None = None,
) -> int:
    start, end = _today_bounds(today)
    result = await db.scalar(
        select(func.count())
        .select_from(Appointment)
        .where(
            Appointment.tenant_id == tenant_id,
            Appointment.starts_at >= start,
            Appointment.starts_at < end,
            Appointment.status != "cancelled",
        )
    )
    return int(result or 0)
