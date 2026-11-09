from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_platform_admin
from app.core.db import get_db
from app.models import Membership
from app.schemas.billing import (
    AdminMetricsResponse,
    AdminSubscriptionUpdate,
    AdminTenantListResponse,
    SubscriptionResponse,
)
from app.services import billing_service

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/tenants", response_model=AdminTenantListResponse)
async def list_tenants(
    search: str | None = Query(default=None, max_length=120),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    membership: Membership = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminTenantListResponse:
    return await billing_service.admin_list_tenants(db, search=search, limit=limit, offset=offset)


@router.get("/metrics", response_model=AdminMetricsResponse)
async def get_metrics(
    membership: Membership = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminMetricsResponse:
    return await billing_service.admin_metrics(db)


@router.post("/tenants/{tenant_id}/subscription", response_model=SubscriptionResponse)
async def update_tenant_subscription(
    tenant_id: UUID,
    payload: AdminSubscriptionUpdate,
    membership: Membership = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db),
) -> SubscriptionResponse:
    return await billing_service.admin_update_subscription(
        db, tenant_id, payload.plan_code, payload.status
    )
