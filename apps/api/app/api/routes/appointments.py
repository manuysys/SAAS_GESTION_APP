from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_roles
from app.core.db import get_db
from app.models import Membership
from app.repositories.appointments import get_appointment as get_appointment_repo
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentListResponse,
    AppointmentResponse,
    AppointmentUpdate,
)
from app.services import appointment_service

router = APIRouter(prefix="/appointments", tags=["appointments"])

READ_ROLES = ("owner", "admin", "dispatcher", "technician", "viewer")
WRITE_ROLES = ("owner", "admin", "dispatcher")


def _technician_scope(membership: Membership) -> UUID | None:
    return membership.user_id if membership.role == "technician" else None


@router.get("", response_model=AppointmentListResponse)
async def list_appointments(
    start: datetime | None = Query(default=None),
    end: datetime | None = Query(default=None),
    technician_id: UUID | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    membership: Membership = Depends(require_roles(*READ_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> AppointmentListResponse:
    scoped_technician_id = _technician_scope(membership) or technician_id
    items, total = await appointment_service.list_tenant_appointments(
        db,
        tenant_id=membership.tenant_id,
        start=start,
        end=end,
        technician_id=scoped_technician_id,
        limit=limit,
        offset=offset,
    )
    return AppointmentListResponse(
        items=[AppointmentResponse.model_validate(item) for item in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post("", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
async def create_appointment(
    payload: AppointmentCreate,
    membership: Membership = Depends(require_roles(*WRITE_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> AppointmentResponse:
    appointment = await appointment_service.create_tenant_appointment(
        db,
        tenant_id=membership.tenant_id,
        payload=payload,
    )
    return AppointmentResponse.model_validate(appointment)


@router.get("/{appointment_id}", response_model=AppointmentResponse)
async def get_appointment(
    appointment_id: UUID,
    membership: Membership = Depends(require_roles(*READ_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> AppointmentResponse:
    item = await get_appointment_repo(
        db, tenant_id=membership.tenant_id, appointment_id=appointment_id
    )
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found",
        )
    if membership.role == "technician" and item.technician_id != membership.user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found",
        )
    return AppointmentResponse.model_validate(item)


@router.patch("/{appointment_id}", response_model=AppointmentResponse)
async def update_appointment(
    appointment_id: UUID,
    payload: AppointmentUpdate,
    membership: Membership = Depends(require_roles(*WRITE_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> AppointmentResponse:
    appointment = await appointment_service.update_tenant_appointment(
        db,
        tenant_id=membership.tenant_id,
        appointment_id=appointment_id,
        payload=payload,
    )
    return AppointmentResponse.model_validate(appointment)


@router.post("/{appointment_id}/cancel", response_model=AppointmentResponse)
async def cancel_appointment(
    appointment_id: UUID,
    membership: Membership = Depends(require_roles(*WRITE_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> AppointmentResponse:
    appointment = await appointment_service.cancel_tenant_appointment(
        db,
        tenant_id=membership.tenant_id,
        appointment_id=appointment_id,
    )
    return AppointmentResponse.model_validate(appointment)
