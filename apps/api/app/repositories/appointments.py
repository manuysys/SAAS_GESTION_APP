from datetime import datetime
from uuid import UUID

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Appointment


async def list_appointments(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    start: datetime | None = None,
    end: datetime | None = None,
    technician_id: UUID | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[Appointment], int]:
    filters = [Appointment.tenant_id == tenant_id]
    if start:
        filters.append(Appointment.starts_at >= start)
    if end:
        filters.append(Appointment.starts_at < end)
    if technician_id:
        filters.append(Appointment.technician_id == technician_id)

    total = await db.scalar(select(func.count()).select_from(Appointment).where(*filters))
    result = await db.execute(
        select(Appointment)
        .where(*filters)
        .order_by(Appointment.starts_at.asc())
        .limit(limit)
        .offset(offset)
    )
    return list(result.scalars().all()), int(total or 0)


async def get_appointment(
    db: AsyncSession, *, tenant_id: UUID, appointment_id: UUID
) -> Appointment | None:
    result = await db.execute(
        select(Appointment).where(
            Appointment.id == appointment_id,
            Appointment.tenant_id == tenant_id,
        )
    )
    return result.scalar_one_or_none()


async def create_appointment(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    work_order_id: UUID,
    technician_id: UUID,
    starts_at: datetime,
    ends_at: datetime,
    notes: str | None,
) -> Appointment:
    appointment = Appointment(
        tenant_id=tenant_id,
        work_order_id=work_order_id,
        technician_id=technician_id,
        starts_at=starts_at,
        ends_at=ends_at,
        notes=notes,
    )
    db.add(appointment)
    await db.flush()
    return appointment


async def has_overlap(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    technician_id: UUID,
    starts_at: datetime,
    ends_at: datetime,
    exclude_appointment_id: UUID | None = None,
) -> bool:
    filters = [
        Appointment.tenant_id == tenant_id,
        Appointment.technician_id == technician_id,
        Appointment.status != "cancelled",
        Appointment.starts_at < ends_at,
        Appointment.ends_at > starts_at,
    ]
    if exclude_appointment_id:
        filters.append(Appointment.id != exclude_appointment_id)

    result = await db.execute(select(func.count()).select_from(Appointment).where(and_(*filters)))
    return int(result.scalar_one() or 0) > 0
