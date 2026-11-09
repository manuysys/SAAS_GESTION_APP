from datetime import UTC, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    AIUsageLog,
    Membership,
    Plan,
    Subscription,
    Tenant,
    WorkOrder,
)


async def list_active_plans(db: AsyncSession) -> list[Plan]:
    result = await db.execute(
        select(Plan).where(Plan.active.is_(True)).order_by(Plan.price_ars.asc())
    )
    return list(result.scalars().all())


async def get_active_plan_by_code(db: AsyncSession, code: str) -> Plan | None:
    result = await db.execute(select(Plan).where(Plan.code == code, Plan.active.is_(True)))
    return result.scalar_one_or_none()


async def get_subscription_by_tenant(db: AsyncSession, tenant_id: UUID) -> Subscription | None:
    result = await db.execute(select(Subscription).where(Subscription.tenant_id == tenant_id))
    return result.scalar_one_or_none()


async def get_subscription_with_plan(
    db: AsyncSession, tenant_id: UUID
) -> tuple[Subscription, Plan] | None:
    result = await db.execute(
        select(Subscription, Plan)
        .join(Plan, Plan.id == Subscription.plan_id)
        .where(Subscription.tenant_id == tenant_id)
    )
    row = result.one_or_none()
    if row is None:
        return None
    return row[0], row[1]


async def count_tenant_memberships(db: AsyncSession, tenant_id: UUID) -> int:
    result = await db.scalar(
        select(func.count())
        .select_from(Membership)
        .where(Membership.tenant_id == tenant_id, Membership.status == "active")
    )
    return int(result or 0)


async def count_tenant_technicians(db: AsyncSession, tenant_id: UUID) -> int:
    result = await db.scalar(
        select(func.count())
        .select_from(Membership)
        .where(
            Membership.tenant_id == tenant_id,
            Membership.status == "active",
            Membership.role == "technician",
        )
    )
    return int(result or 0)


async def count_work_orders_this_month(db: AsyncSession, tenant_id: UUID) -> int:
    now = datetime.now(UTC)
    start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    result = await db.scalar(
        select(func.count())
        .select_from(WorkOrder)
        .where(
            WorkOrder.tenant_id == tenant_id,
            WorkOrder.created_at >= start,
        )
    )
    return int(result or 0)


async def count_ai_tokens_this_month(db: AsyncSession, tenant_id: UUID) -> int:
    now = datetime.now(UTC)
    start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    result = await db.scalar(
        select(func.coalesce(func.sum(AIUsageLog.input_tokens + AIUsageLog.output_tokens), 0))
        .select_from(AIUsageLog)
        .where(
            AIUsageLog.tenant_id == tenant_id,
            AIUsageLog.created_at >= start,
        )
    )
    return int(result or 0)


async def admin_list_tenants(
    db: AsyncSession,
    *,
    search: str | None,
    limit: int,
    offset: int,
) -> tuple[list[dict[str, Any]], int]:
    filters = []
    if search:
        pattern = f"%{search.strip()}%"
        filters.append(Tenant.name.ilike(pattern))

    total = await db.scalar(select(func.count()).select_from(Tenant).where(*filters))

    users_sub = (
        select(
            Membership.tenant_id.label("tenant_id"),
            func.count().label("users_count"),
        )
        .where(Membership.status == "active")
        .group_by(Membership.tenant_id)
        .subquery()
    )

    orders_sub = (
        select(
            WorkOrder.tenant_id.label("tenant_id"),
            func.count().label("orders_count"),
        )
        .group_by(WorkOrder.tenant_id)
        .subquery()
    )

    stmt = (
        select(
            Tenant,
            Plan.code,
            Plan.name,
            Subscription.status,
            Subscription.price_snapshot,
            func.coalesce(users_sub.c.users_count, 0).label("users_count"),
            func.coalesce(orders_sub.c.orders_count, 0).label("orders_count"),
        )
        .outerjoin(Subscription, Subscription.tenant_id == Tenant.id)
        .outerjoin(Plan, Plan.id == Subscription.plan_id)
        .outerjoin(users_sub, users_sub.c.tenant_id == Tenant.id)
        .outerjoin(orders_sub, orders_sub.c.tenant_id == Tenant.id)
        .where(*filters)
        .order_by(Tenant.created_at.desc())
        .limit(limit)
        .offset(offset)
    )

    result = await db.execute(stmt)
    rows = []
    for row in result.all():
        tenant, plan_code, plan_name, sub_status, price_snapshot, users_count, orders_count = row
        rows.append(
            {
                "id": tenant.id,
                "name": tenant.name,
                "created_at": tenant.created_at,
                "plan_code": plan_code,
                "plan_name": plan_name,
                "subscription_status": sub_status,
                "users_count": int(users_count or 0),
                "orders_count": int(orders_count or 0),
                "price_snapshot": Decimal(price_snapshot or "0.00"),
            }
        )
    return rows, int(total or 0)


async def admin_metrics(db: AsyncSession) -> dict[str, Any]:
    tenants_total = await db.scalar(select(func.count()).select_from(Tenant))
    active_subscriptions = await db.scalar(
        select(func.count()).select_from(Subscription).where(Subscription.status == "active")
    )
    trialing_subscriptions = await db.scalar(
        select(func.count()).select_from(Subscription).where(Subscription.status == "trialing")
    )
    mrr_result = await db.scalar(
        select(func.coalesce(func.sum(Subscription.price_snapshot), Decimal("0.00"))).where(
            Subscription.status == "active"
        )
    )
    orders_total = await db.scalar(select(func.count()).select_from(WorkOrder))

    now = datetime.now(UTC)
    start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    orders_this_month = await db.scalar(
        select(func.count()).select_from(WorkOrder).where(WorkOrder.created_at >= start)
    )
    ai_tokens_this_month = await db.scalar(
        select(func.coalesce(func.sum(AIUsageLog.input_tokens + AIUsageLog.output_tokens), 0))
        .select_from(AIUsageLog)
        .where(AIUsageLog.created_at >= start)
    )

    return {
        "tenants_total": int(tenants_total or 0),
        "active_subscriptions": int(active_subscriptions or 0),
        "trialing_subscriptions": int(trialing_subscriptions or 0),
        "mrr_ars": Decimal(mrr_result or "0.00"),
        "orders_total": int(orders_total or 0),
        "orders_this_month": int(orders_this_month or 0),
        "ai_tokens_this_month": int(ai_tokens_this_month or 0),
    }


async def create_subscription(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    plan_id: UUID,
    status: str,
    started_at: datetime,
    current_period_end: datetime,
    price_snapshot: Decimal,
) -> Subscription:
    subscription = Subscription(
        tenant_id=tenant_id,
        plan_id=plan_id,
        status=status,
        started_at=started_at,
        current_period_end=current_period_end,
        price_snapshot=price_snapshot,
    )
    db.add(subscription)
    await db.flush()
    return subscription
