from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel
from app.schemas.work_order import WorkOrderResponse

TechnicianTransitionStatus = Literal["scheduled", "in_progress", "waiting", "finished"]


class TechnicianWorkOrderResponse(WorkOrderResponse):
    customer_name: str | None
    customer_phone: str | None
    customer_address: str | None
    customer_city: str | None
    customer_province: str | None
    customer_postal_code: str | None


class TechnicianWorkOrderListResponse(BaseModel):
    items: list[TechnicianWorkOrderResponse]
    total: int
    limit: int
    offset: int


class TechnicianTransitionRequest(BaseModel):
    to_status: TechnicianTransitionStatus
    notes: str | None = Field(default=None, max_length=2000)


class TechnicianNoteRequest(BaseModel):
    notes: str = Field(min_length=1, max_length=5000)
    client_request_id: str | None = Field(default=None, max_length=64)


class MaterialCreate(BaseModel):
    description: str = Field(min_length=1, max_length=200)
    quantity: Decimal = Field(gt=0, decimal_places=3)
    unit: str = Field(min_length=1, max_length=20)
    client_request_id: str | None = Field(default=None, max_length=64)


class MaterialResponse(ORMModel):
    id: UUID
    work_order_id: UUID
    tenant_id: UUID
    description: str
    quantity: Decimal
    unit: str
    created_by_user_id: UUID | None
    created_at: datetime
    updated_at: datetime


class AttachmentResponse(ORMModel):
    id: UUID
    filename: str
    mime_type: str
    size_bytes: int
    created_at: datetime
