from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Appointment, Membership, WorkOrder
from app.repositories.appointments import (
    create_appointment,
    get_appointment,
    has_overlap,
    list_appointments,
)
from app.repositories.work_orders import get_work_order
from app.schemas.appointment import AppointmentCreate, AppointmentUpdate


async def _validate_technician(db: AsyncSession, *, tenant_id: UUID, technician_id: UUID) -> None:
    result = await db.execute(
        select(Membership).where(
            Membership.tenant_id == tenant_id,
            Membership.user_id == technician_id,
            Membership.status == "active",
            Membership.role == "technician",
        )
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Technician is not an active member of this tenant",
        )


async def _validate_work_order_for_appointment(
    db: AsyncSession, *, tenant_id: UUID, work_order_id: UUID
) -> WorkOrder:
    order = await get_work_order(db, tenant_id=tenant_id, order_id=work_order_id)
    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Work order not found",
        )
    if order.operational_status in ("finished", "cancelled"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot schedule an appointment for a finished or cancelled work order",
        )
    return order


async def _ensure_no_conflict(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    technician_id: UUID,
    starts_at: datetime,
    ends_at: datetime,
    exclude_appointment_id: UUID | None = None,
) -> None:
    if await has_overlap(
        db,
        tenant_id=tenant_id,
        technician_id=technician_id,
        starts_at=starts_at,
        ends_at=ends_at,
        exclude_appointment_id=exclude_appointment_id,
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Technician has a conflicting appointment",
        )


def _ensure_valid_window(starts_at: datetime, ends_at: datetime) -> None:
    if ends_at <= starts_at:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="ends_at must be after starts_at",
        )


async def list_tenant_appointments(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    start: datetime | None,
    end: datetime | None,
    technician_id: UUID | None,
    limit: int,
    offset: int,
) -> tuple[list[Appointment], int]:
    return await list_appointments(
        db,
        tenant_id=tenant_id,
        start=start,
        end=end,
        technician_id=technician_id,
        limit=limit,
        offset=offset,
    )


async def create_tenant_appointment(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    payload: AppointmentCreate,
) -> Appointment:
    _ensure_valid_window(payload.starts_at, payload.ends_at)
    order = await _validate_work_order_for_appointment(
        db, tenant_id=tenant_id, work_order_id=payload.work_order_id
    )
    await _validate_technician(db, tenant_id=tenant_id, technician_id=payload.technician_id)
    await _ensure_no_conflict(
        db,
        tenant_id=tenant_id,
        technician_id=payload.technician_id,
        starts_at=payload.starts_at,
        ends_at=payload.ends_at,
    )

    appointment = await create_appointment(
        db,
        tenant_id=tenant_id,
        work_order_id=payload.work_order_id,
        technician_id=payload.technician_id,
        starts_at=payload.starts_at,
        ends_at=payload.ends_at,
        notes=payload.notes,
    )

    if order.operational_status in ("new", "scheduled"):
        order.assigned_user_id = payload.technician_id
        order.scheduled_at = payload.starts_at
        order.operational_status = "scheduled"

    await db.commit()
    await db.refresh(appointment)
    return appointment


async def update_tenant_appointment(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    appointment_id: UUID,
    payload: AppointmentUpdate,
) -> Appointment:
    appointment = await get_appointment(db, tenant_id=tenant_id, appointment_id=appointment_id)
    if appointment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found",
        )
    if appointment.status == "cancelled":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cancelled appointments cannot be edited",
        )

    data = payload.model_dump(exclude_unset=True)
    next_technician_id = data.get("technician_id", appointment.technician_id)
    next_starts_at = data.get("starts_at", appointment.starts_at)
    next_ends_at = data.get("ends_at", appointment.ends_at)

    if next_starts_at.tzinfo is None:
        next_starts_at = next_starts_at.replace(tzinfo=UTC)
    if next_ends_at.tzinfo is None:
        next_ends_at = next_ends_at.replace(tzinfo=UTC)

    _ensure_valid_window(next_starts_at, next_ends_at)

    if next_technician_id != appointment.technician_id:
        await _validate_technician(db, tenant_id=tenant_id, technician_id=next_technician_id)

    if (
        next_technician_id != appointment.technician_id
        or next_starts_at != appointment.starts_at
        or next_ends_at != appointment.ends_at
    ):
        await _ensure_no_conflict(
            db,
            tenant_id=tenant_id,
            technician_id=next_technician_id,
            starts_at=next_starts_at,
            ends_at=next_ends_at,
            exclude_appointment_id=appointment.id,
        )

    for field, value in data.items():
        setattr(appointment, field, value)

    order = await get_work_order(db, tenant_id=tenant_id, order_id=appointment.work_order_id)
    if order is not None and order.operational_status in ("new", "scheduled"):
        order.assigned_user_id = appointment.technician_id
        order.scheduled_at = appointment.starts_at
        order.operational_status = "scheduled"

    await db.commit()
    await db.refresh(appointment)
    return appointment


async def cancel_tenant_appointment(
    db: AsyncSession, *, tenant_id: UUID, appointment_id: UUID
) -> Appointment:
    appointment = await get_appointment(db, tenant_id=tenant_id, appointment_id=appointment_id)
    if appointment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found",
        )
    if appointment.status == "cancelled":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Appointment is already cancelled",
        )

    appointment.status = "cancelled"
    await db.commit()
    await db.refresh(appointment)
    return appointment
