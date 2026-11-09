from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Subscription
from app.repositories import billing as billing_repo
from app.schemas.billing import (
    AdminMetricsResponse,
    AdminTenantListResponse,
    AdminTenantResponse,
    PlanResponse,
    SubscriptionChangeRequest,
    SubscriptionDetailResponse,
    SubscriptionResponse,
    SubscriptionUsage,
)


async def list_plans(db: AsyncSession) -> list[PlanResponse]:
    plans = await billing_repo.list_active_plans(db)
    return [PlanResponse.model_validate(plan) for plan in plans]


async def get_subscription_detail(db: AsyncSession, tenant_id: UUID) -> SubscriptionDetailResponse:
    row = await billing_repo.get_subscription_with_plan(db, tenant_id)
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found",
        )
    subscription, plan = row
    subscription.plan = plan

    usage = SubscriptionUsage(
        orders_this_month=await billing_repo.count_work_orders_this_month(db, tenant_id),
        users_count=await billing_repo.count_tenant_memberships(db, tenant_id),
        technicians_count=await billing_repo.count_tenant_technicians(db, tenant_id),
        ai_tokens_used=await billing_repo.count_ai_tokens_this_month(db, tenant_id),
    )
    return SubscriptionDetailResponse(
        subscription=SubscriptionResponse.model_validate(subscription),
        usage=usage,
    )


async def change_subscription(
    db: AsyncSession, tenant_id: UUID, payload: SubscriptionChangeRequest
) -> SubscriptionResponse:
    plan = await billing_repo.get_active_plan_by_code(db, payload.plan_code)
    if plan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found",
        )

    subscription = await billing_repo.get_subscription_by_tenant(db, tenant_id)
    if subscription is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found",
        )

    subscription.plan_id = plan.id
    subscription.price_snapshot = plan.price_ars
    await db.commit()
    await db.refresh(subscription)
    subscription.plan = plan
    return SubscriptionResponse.model_validate(subscription)


async def create_trial_subscription(db: AsyncSession, tenant_id: UUID) -> Subscription | None:
    plan = await billing_repo.get_active_plan_by_code(db, "starter")
    if plan is None:
        return None

    now = datetime.now(UTC)
    subscription = await billing_repo.create_subscription(
        db,
        tenant_id=tenant_id,
        plan_id=plan.id,
        status="trialing",
        started_at=now,
        current_period_end=now + timedelta(days=30),
        price_snapshot=plan.price_ars,
    )
    return subscription


async def admin_list_tenants(
    db: AsyncSession,
    *,
    search: str | None,
    limit: int,
    offset: int,
) -> AdminTenantListResponse:
    rows, total = await billing_repo.admin_list_tenants(
        db, search=search, limit=limit, offset=offset
    )
    return AdminTenantListResponse(
        items=[AdminTenantResponse.model_validate(row) for row in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


async def admin_metrics(db: AsyncSession) -> AdminMetricsResponse:
    data: dict[str, Any] = await billing_repo.admin_metrics(db)
    return AdminMetricsResponse.model_validate(data)


async def admin_update_subscription(
    db: AsyncSession, tenant_id: UUID, plan_code: str, new_status: str
) -> SubscriptionResponse:
    plan = await billing_repo.get_active_plan_by_code(db, plan_code)
    if plan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found",
        )

    subscription = await billing_repo.get_subscription_by_tenant(db, tenant_id)
    if subscription is None:
        now = datetime.now(UTC)
        subscription = await billing_repo.create_subscription(
            db,
            tenant_id=tenant_id,
            plan_id=plan.id,
            status=new_status,
            started_at=now,
            current_period_end=now + timedelta(days=30),
            price_snapshot=plan.price_ars,
        )
    else:
        subscription.plan_id = plan.id
        subscription.status = new_status
        subscription.price_snapshot = plan.price_ars

    await db.commit()
    await db.refresh(subscription)
    subscription.plan = plan
    return SubscriptionResponse.model_validate(subscription)
