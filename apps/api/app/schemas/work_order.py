from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel

Priority = Literal["low", "normal", "high", "urgent"]
OperationalStatus = Literal["new", "scheduled", "in_progress", "waiting", "finished", "cancelled"]


class WorkOrderCreate(BaseModel):
    customer_id: UUID
    service_request_id: UUID | None = None
    title: str = Field(min_length=2, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    priority: Priority = "normal"
    assigned_user_id: UUID | None = None
    scheduled_at: datetime | None = None


class WorkOrderUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    priority: Priority | None = None
    assigned_user_id: UUID | None = None
    scheduled_at: datetime | None = None


class WorkOrderTransition(BaseModel):
    to_status: OperationalStatus
    notes: str | None = Field(default=None, max_length=2000)


class WorkOrderResponse(ORMModel):
    id: UUID
    tenant_id: UUID
    customer_id: UUID
    service_request_id: UUID | None
    code: str
    title: str
    description: str | None
    priority: str
    commercial_status: str
    operational_status: str
    payment_status: str
    assigned_user_id: UUID | None
    scheduled_at: datetime | None
    started_at: datetime | None
    finished_at: datetime | None
    created_at: datetime
    updated_at: datetime


class WorkOrderListResponse(BaseModel):
    items: list[WorkOrderResponse]
    total: int
    limit: int
    offset: int


class WorkOrderEventResponse(ORMModel):
    id: UUID
    work_order_id: UUID
    event_type: str
    from_status: str | None
    to_status: str | None
    actor_user_id: UUID | None
    payload: dict[str, object] | None
    created_at: datetime
