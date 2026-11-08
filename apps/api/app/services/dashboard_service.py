from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories import dashboard as dashboard_repo


async def get_tenant_summary(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    today: date | None = None,
) -> dict[str, object]:
    customers_total = await dashboard_repo.count_customers(db, tenant_id=tenant_id)
    service_requests_total = await dashboard_repo.count_service_requests(db, tenant_id=tenant_id)
    service_requests_new = await dashboard_repo.count_service_requests(
        db, tenant_id=tenant_id, status="new"
    )
    work_orders_total = await dashboard_repo.count_work_orders(db, tenant_id=tenant_id)
    work_orders_open = await dashboard_repo.count_work_orders(
        db,
        tenant_id=tenant_id,
        statuses=["new", "scheduled", "in_progress", "waiting"],
    )
    quotes_total = await dashboard_repo.count_quotes(db, tenant_id=tenant_id)
    quotes_pending = await dashboard_repo.count_quotes(db, tenant_id=tenant_id, status="sent")
    approved_total = await dashboard_repo.sum_approved_quotes(db, tenant_id=tenant_id)
    registered_total = await dashboard_repo.sum_registered_payments(db, tenant_id=tenant_id)
    pending_balance = max(Decimal("0.00"), approved_total - registered_total)
    appointments_today = await dashboard_repo.count_appointments_today(
        db, tenant_id=tenant_id, today=today
    )

    return {
        "customers_total": customers_total,
        "service_requests_total": service_requests_total,
        "service_requests_new": service_requests_new,
        "work_orders_total": work_orders_total,
        "work_orders_open": work_orders_open,
        "quotes_total": quotes_total,
        "quotes_pending": quotes_pending,
        "payments_total": registered_total,
        "pending_balance": pending_balance,
        "appointments_today": appointments_today,
    }
