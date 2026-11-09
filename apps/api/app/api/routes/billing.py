from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_membership, require_roles
from app.core.db import get_db
from app.models import Membership
from app.schemas.billing import (
    PlanResponse,
    SubscriptionChangeRequest,
    SubscriptionDetailResponse,
)
from app.services import billing_service

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
    membership: Membership = Depends(require_roles(*OWNER_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> SubscriptionDetailResponse:
    await billing_service.change_subscription(db, membership.tenant_id, payload)
    return await billing_service.get_subscription_detail(db, membership.tenant_id)
