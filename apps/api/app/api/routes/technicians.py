from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_roles
from app.core.db import get_db
from app.models import Membership
from app.schemas.technician import TechnicianResponse
from app.services import technician_service

router = APIRouter(prefix="/technicians", tags=["technicians"])

READ_ROLES = ("owner", "admin", "dispatcher")


@router.get("", response_model=list[TechnicianResponse])
async def list_technicians(
    membership: Membership = Depends(require_roles(*READ_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> list[TechnicianResponse]:
    items = await technician_service.list_active_technicians(db, tenant_id=membership.tenant_id)
    return [TechnicianResponse.model_validate(item) for item in items]
