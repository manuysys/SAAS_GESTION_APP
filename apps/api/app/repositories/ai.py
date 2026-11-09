from __future__ import annotations

from datetime import date, datetime, time, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    AIUsageLog,
    Appointment,
    Customer,
    Payment,
    Quote,
    ServiceRequest,
    User,
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


def _month_bounds(year: int | None = None, month: int | None = None) -> tuple[datetime, datetime]:
    from zoneinfo import ZoneInfo

    tz = ZoneInfo(_ARGENTINA_TZ)
    if year is None or month is None:
        today = datetime.now(tz).date()
        year = today.year
        month = today.month
    start = datetime(year, month, 1, 0, 0, 0, tzinfo=tz)
    if month == 12:
        end = datetime(year + 1, 1, 1, 0, 0, 0, tzinfo=tz)
    else:
        end = datetime(year, month + 1, 1, 0, 0, 0, tzinfo=tz)
    return start, end


async def get_monthly_token_usage(
    db: AsyncSession, *, tenant_id: UUID, year: int, month: int
) -> int:
    start, end = _month_bounds(year, month)
    result = await db.scalar(
        select(
            func.coalesce(func.sum(AIUsageLog.input_tokens + AIUsageLog.output_tokens), 0)
        ).where(
            AIUsageLog.tenant_id == tenant_id,
            AIUsageLog.created_at >= start,
            AIUsageLog.created_at < end,
        )
    )
    return int(result or 0)


async def get_snapshot_counts(db: AsyncSession, *, tenant_id: UUID) -> dict[str, int]:
    customers_total = await db.scalar(
        select(func.count())
        .select_from(Customer)
        .where(Customer.tenant_id == tenant_id, Customer.deleted_at.is_(None))
    )
    service_requests_new = await db.scalar(
        select(func.count())
        .select_from(ServiceRequest)
        .where(ServiceRequest.tenant_id == tenant_id, ServiceRequest.status == "new")
    )
    work_orders_open = await db.scalar(
        select(func.count())
        .select_from(WorkOrder)
        .where(
            WorkOrder.tenant_id == tenant_id,
            WorkOrder.operational_status.in_(["new", "scheduled", "in_progress", "waiting"]),
        )
    )
    quotes_pending = await db.scalar(
        select(func.count())
        .select_from(Quote)
        .where(Quote.tenant_id == tenant_id, Quote.status == "sent")
    )
    return {
        "customers_total": int(customers_total or 0),
        "service_requests_new": int(service_requests_new or 0),
        "work_orders_open": int(work_orders_open or 0),
        "quotes_pending": int(quotes_pending or 0),
    }


async def get_pending_quotes(
    db: AsyncSession, *, tenant_id: UUID, limit: int = 5
) -> list[dict[str, object]]:
    result = await db.execute(
        select(Quote.number, Customer.name, Quote.total)
        .join(Customer, Quote.customer_id == Customer.id)
        .where(Quote.tenant_id == tenant_id, Quote.status == "sent")
        .order_by(Quote.created_at.desc())
        .limit(limit)
    )
    return [
        {
            "number": row.number,
            "customer_name": row.name,
            "total": row.total,
        }
        for row in result.all()
    ]


async def get_today_appointments(db: AsyncSession, *, tenant_id: UUID) -> list[dict[str, object]]:
    from zoneinfo import ZoneInfo

    tz = ZoneInfo(_ARGENTINA_TZ)
    start, end = _today_bounds()
    result = await db.execute(
        select(
            Appointment.starts_at,
            WorkOrder.code,
            WorkOrder.title,
            User.full_name,
        )
        .join(WorkOrder, Appointment.work_order_id == WorkOrder.id)
        .outerjoin(User, Appointment.technician_id == User.id)
        .where(
            Appointment.tenant_id == tenant_id,
            Appointment.starts_at >= start,
            Appointment.starts_at < end,
            Appointment.status != "cancelled",
        )
        .order_by(Appointment.starts_at.asc())
    )
    rows: list[dict[str, object]] = []
    for starts_at, code, title, full_name in result.all():
        if isinstance(starts_at, datetime):
            localized = starts_at.astimezone(tz)
            time_str = localized.strftime("%H:%M")
        else:
            time_str = ""
        rows.append(
            {
                "time": time_str,
                "work_order_code": code,
                "work_order_title": title,
                "technician_name": full_name or "sin técnico",
            }
        )
    return rows


async def get_urgent_work_orders(
    db: AsyncSession, *, tenant_id: UUID, limit: int = 5
) -> list[dict[str, object]]:
    result = await db.execute(
        select(WorkOrder.code, WorkOrder.title, WorkOrder.operational_status, Customer.name)
        .join(Customer, WorkOrder.customer_id == Customer.id)
        .where(
            WorkOrder.tenant_id == tenant_id,
            WorkOrder.priority == "urgent",
            WorkOrder.operational_status.notin_(["finished", "cancelled"]),
        )
        .order_by(WorkOrder.created_at.desc())
        .limit(limit)
    )
    return [
        {
            "code": row.code,
            "title": row.title,
            "operational_status": row.operational_status,
            "customer_name": row.name,
        }
        for row in result.all()
    ]


async def get_pending_balance(db: AsyncSession, *, tenant_id: UUID) -> Decimal:
    approved = await db.scalar(
        select(func.coalesce(func.sum(Quote.total), Decimal("0.00"))).where(
            Quote.tenant_id == tenant_id, Quote.status == "approved"
        )
    )
    registered = await db.scalar(
        select(func.coalesce(func.sum(Payment.amount), Decimal("0.00"))).where(
            Payment.tenant_id == tenant_id, Payment.status == "registered"
        )
    )
    return max(Decimal("0.00"), Decimal(approved or "0.00") - Decimal(registered or "0.00"))


async def get_payments_this_month(db: AsyncSession, *, tenant_id: UUID) -> dict[str, object]:
    start, end = _month_bounds()
    result = await db.execute(
        select(
            func.coalesce(func.count(), 0),
            func.coalesce(func.sum(Payment.amount), Decimal("0.00")),
        ).where(
            Payment.tenant_id == tenant_id,
            Payment.status == "registered",
            Payment.paid_at >= start,
            Payment.paid_at < end,
        )
    )
    count, total = result.one()
    return {"count": int(count or 0), "total": Decimal(total or "0.00")}


async def list_usage_logs(
    db: AsyncSession, *, tenant_id: UUID, limit: int = 50, offset: int = 0
) -> tuple[list[AIUsageLog], int]:
    filters = [AIUsageLog.tenant_id == tenant_id]
    total = await db.scalar(select(func.count()).select_from(AIUsageLog).where(*filters))
    result = await db.execute(
        select(AIUsageLog)
        .where(*filters)
        .order_by(AIUsageLog.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(result.scalars().all()), int(total or 0)
