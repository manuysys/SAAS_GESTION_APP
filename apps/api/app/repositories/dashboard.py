from datetime import date, datetime, time, timedelta
from decimal import Decimal
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Appointment,
    Customer,
    Payment,
    Quote,
    ServiceRequest,
    User,
    WorkOrder,
)

_ARGENTINA_TZ = "America/Argentina/Buenos_Aires"
_OPEN_STATUSES = ("new", "scheduled", "in_progress", "waiting")


def _today_bounds(today: date | None = None) -> tuple[datetime, datetime]:
    tz = ZoneInfo(_ARGENTINA_TZ)
    reference = today or datetime.now(tz).date()
    start = datetime.combine(reference, time.min, tzinfo=tz)
    end = datetime.combine(reference + timedelta(days=1), time.min, tzinfo=tz)
    return start, end


def _argentina_now(reference: datetime | None = None) -> datetime:
    tz = ZoneInfo(_ARGENTINA_TZ)
    if reference is None:
        return datetime.now(tz)
    if reference.tzinfo is None:
        return reference.replace(tzinfo=tz)
    return reference.astimezone(tz)


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


async def get_today_appointments(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    limit: int = 10,
    today: date | None = None,
) -> tuple[list[dict[str, object]], int]:
    start, end = _today_bounds(today)
    filters = [
        Appointment.tenant_id == tenant_id,
        Appointment.starts_at >= start,
        Appointment.starts_at < end,
        Appointment.status != "cancelled",
    ]
    total = await db.scalar(select(func.count()).select_from(Appointment).where(*filters))

    stmt = (
        select(Appointment, WorkOrder, Customer, User)
        .join(WorkOrder, Appointment.work_order_id == WorkOrder.id)
        .join(Customer, WorkOrder.customer_id == Customer.id)
        .outerjoin(User, Appointment.technician_id == User.id)
        .where(*filters)
        .order_by(Appointment.starts_at)
        .limit(limit)
    )
    rows = (await db.execute(stmt)).all()
    items: list[dict[str, object]] = []
    for appointment, order, customer, technician in rows:
        items.append(
            {
                "id": appointment.id,
                "starts_at": appointment.starts_at,
                "ends_at": appointment.ends_at,
                "status": appointment.status,
                "order_code": order.code,
                "order_title": order.title,
                "customer_name": customer.name,
                "technician_name": technician.full_name if technician is not None else None,
            }
        )
    return items, int(total or 0)


async def get_overdue_orders(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    limit: int = 10,
    reference: datetime | None = None,
) -> tuple[list[dict[str, object]], int]:
    now = _argentina_now(reference)
    filters = [
        WorkOrder.tenant_id == tenant_id,
        WorkOrder.operational_status.in_(_OPEN_STATUSES),
        WorkOrder.scheduled_at.is_not(None),
        WorkOrder.scheduled_at < now,
    ]
    total = await db.scalar(select(func.count()).select_from(WorkOrder).where(*filters))

    stmt = (
        select(WorkOrder, Customer)
        .join(Customer, WorkOrder.customer_id == Customer.id)
        .where(*filters)
        .order_by(WorkOrder.scheduled_at)
        .limit(limit)
    )
    rows = (await db.execute(stmt)).all()
    items: list[dict[str, object]] = []
    for order, customer in rows:
        assert order.scheduled_at is not None
        scheduled_local = order.scheduled_at.astimezone(ZoneInfo(_ARGENTINA_TZ))
        days_overdue = max(0, (now.date() - scheduled_local.date()).days)
        items.append(
            {
                "id": order.id,
                "code": order.code,
                "title": order.title,
                "customer_name": customer.name,
                "operational_status": order.operational_status,
                "scheduled_at": order.scheduled_at,
                "days_overdue": days_overdue,
            }
        )
    return items, int(total or 0)


async def get_unassigned_orders(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    limit: int = 10,
) -> tuple[list[dict[str, object]], int]:
    filters = [
        WorkOrder.tenant_id == tenant_id,
        WorkOrder.assigned_user_id.is_(None),
        WorkOrder.operational_status.in_(_OPEN_STATUSES),
    ]
    total = await db.scalar(select(func.count()).select_from(WorkOrder).where(*filters))

    stmt = (
        select(WorkOrder, Customer)
        .join(Customer, WorkOrder.customer_id == Customer.id)
        .where(*filters)
        .order_by(WorkOrder.created_at.desc())
        .limit(limit)
    )
    rows = (await db.execute(stmt)).all()
    items: list[dict[str, object]] = []
    for order, customer in rows:
        items.append(
            {
                "id": order.id,
                "code": order.code,
                "title": order.title,
                "customer_name": customer.name,
                "priority": order.priority,
                "created_at": order.created_at,
            }
        )
    return items, int(total or 0)


async def get_expiring_quotes(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    limit: int = 10,
    today: date | None = None,
) -> tuple[list[dict[str, object]], int]:
    start, end = _today_bounds(today)
    end = end + timedelta(days=7)
    tz = ZoneInfo(_ARGENTINA_TZ)
    filters = [
        Quote.tenant_id == tenant_id,
        Quote.status == "sent",
        Quote.valid_until.is_not(None),
        Quote.valid_until >= start,
        Quote.valid_until < end,
    ]
    total = await db.scalar(select(func.count()).select_from(Quote).where(*filters))

    stmt = (
        select(Quote, Customer)
        .join(Customer, Quote.customer_id == Customer.id)
        .where(*filters)
        .order_by(Quote.valid_until)
        .limit(limit)
    )
    rows = (await db.execute(stmt)).all()
    reference = datetime.now(tz).date()
    items: list[dict[str, object]] = []
    for quote, customer in rows:
        assert quote.valid_until is not None
        valid_local = quote.valid_until.astimezone(tz)
        days_left = max(0, (valid_local.date() - reference).days)
        items.append(
            {
                "id": quote.id,
                "number": quote.number,
                "customer_name": customer.name,
                "total": quote.total,
                "valid_until": quote.valid_until,
                "days_left": days_left,
            }
        )
    return items, int(total or 0)


async def get_finished_orders_with_balance(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    limit: int = 10,
) -> tuple[list[dict[str, object]], int]:
    approved_sq = (
        select(
            Quote.work_order_id,
            func.coalesce(func.sum(Quote.total), Decimal("0.00")).label("approved_total"),
        )
        .where(Quote.tenant_id == tenant_id, Quote.status == "approved")
        .group_by(Quote.work_order_id)
        .subquery()
    )
    paid_sq = (
        select(
            Payment.work_order_id,
            func.coalesce(func.sum(Payment.amount), Decimal("0.00")).label("paid_total"),
        )
        .where(Payment.tenant_id == tenant_id, Payment.status == "registered")
        .group_by(Payment.work_order_id)
        .subquery()
    )

    approved_total = func.coalesce(approved_sq.c.approved_total, Decimal("0.00"))
    paid_total = func.coalesce(paid_sq.c.paid_total, Decimal("0.00"))
    balance_expr = approved_total - paid_total

    filters = [
        WorkOrder.tenant_id == tenant_id,
        WorkOrder.operational_status == "finished",
        approved_total > paid_total,
    ]
    total = await db.scalar(
        select(func.count())
        .select_from(WorkOrder)
        .outerjoin(approved_sq, approved_sq.c.work_order_id == WorkOrder.id)
        .outerjoin(paid_sq, paid_sq.c.work_order_id == WorkOrder.id)
        .where(*filters)
    )

    stmt = (
        select(WorkOrder, Customer, approved_total, paid_total, balance_expr)
        .join(Customer, WorkOrder.customer_id == Customer.id)
        .outerjoin(approved_sq, approved_sq.c.work_order_id == WorkOrder.id)
        .outerjoin(paid_sq, paid_sq.c.work_order_id == WorkOrder.id)
        .where(*filters)
        .order_by(balance_expr.desc())
        .limit(limit)
    )
    rows = (await db.execute(stmt)).all()
    items: list[dict[str, object]] = []
    for order, customer, approved, paid, balance in rows:
        items.append(
            {
                "id": order.id,
                "code": order.code,
                "title": order.title,
                "customer_name": customer.name,
                "total": Decimal(approved),
                "paid": Decimal(paid),
                "balance": Decimal(balance),
            }
        )
    return items, int(total or 0)
