from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_roles
from app.core.db import get_db
from app.models import Membership
from app.schemas.dashboard import DashboardOperationsResponse, DashboardSummaryResponse
from app.services import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

READ_ROLES = ("owner", "admin", "dispatcher")


@router.get("/summary", response_model=DashboardSummaryResponse)
async def get_summary(
    membership: Membership = Depends(require_roles(*READ_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> DashboardSummaryResponse:
    data = await dashboard_service.get_tenant_summary(db, tenant_id=membership.tenant_id)
    return DashboardSummaryResponse.model_validate(data)


@router.get("/operations", response_model=DashboardOperationsResponse)
async def get_operations(
    membership: Membership = Depends(require_roles(*READ_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> DashboardOperationsResponse:
    data = await dashboard_service.get_tenant_operations(db, tenant_id=membership.tenant_id)
    return DashboardOperationsResponse.model_validate(data)
