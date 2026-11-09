from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_client_ip, get_current_membership, require_roles
from app.core.db import get_db
from app.models import Membership
from app.schemas.billing import (
    PlanResponse,
    SubscriptionChangeRequest,
    SubscriptionDetailResponse,
)
from app.services import audit_service, billing_service

router = APIRouter(tags=["billing"])

OWNER_ROLES = ("owner",)


@router.get("/plans", response_model=list[PlanResponse])
async def list_plans(
    membership: Membership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
) -> list[PlanResponse]:
    return await billing_service.list_plans(db)


@router.get("/subscription", response_model=SubscriptionDetailResponse)
async def get_subscription(
    membership: Membership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
) -> SubscriptionDetailResponse:
    return await billing_service.get_subscription_detail(db, membership.tenant_id)


@router.post("/subscription/change", response_model=SubscriptionDetailResponse)
async def change_subscription(
    payload: SubscriptionChangeRequest,
    request: Request,
    membership: Membership = Depends(require_roles(*OWNER_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> SubscriptionDetailResponse:
    subscription = await billing_service.change_subscription(db, membership.tenant_id, payload)
    await audit_service.record(
        db,
        action="subscription_changed",
        entity_type="subscription",
        entity_id=str(subscription.id),
        tenant_id=membership.tenant_id,
        actor_user_id=membership.user_id,
        metadata={"plan_code": payload.plan_code},
        ip=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    await db.commit()
    return await billing_service.get_subscription_detail(db, membership.tenant_id)
