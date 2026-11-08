from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel

AppointmentStatus = Literal["scheduled", "completed", "cancelled", "no_show"]


class AppointmentCreate(BaseModel):
    work_order_id: UUID
    technician_id: UUID
    starts_at: datetime
    ends_at: datetime
    notes: str | None = Field(default=None, max_length=2000)


class AppointmentUpdate(BaseModel):
    technician_id: UUID | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    notes: str | None = Field(default=None, max_length=2000)


class AppointmentResponse(ORMModel):
    id: UUID
    tenant_id: UUID
    work_order_id: UUID
    technician_id: UUID
    starts_at: datetime
    ends_at: datetime
    status: AppointmentStatus
    notes: str | None
    created_at: datetime
    updated_at: datetime


class AppointmentListResponse(BaseModel):
    items: list[AppointmentResponse]
    total: int
    limit: int
    offset: int
