from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel

Priority = Literal["low", "normal", "high", "urgent"]
RequestSource = Literal["whatsapp", "phone", "email", "web", "manual"]


class ServiceRequestCreate(BaseModel):
    customer_id: UUID
    title: str = Field(min_length=2, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    priority: Priority = "normal"
    source: RequestSource = "manual"


class ServiceRequestUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    priority: Priority | None = None
    source: RequestSource | None = None
    status: Literal["new", "triaged", "converted", "closed"] | None = None


class ServiceRequestResponse(ORMModel):
    id: UUID
    tenant_id: UUID
    customer_id: UUID
    title: str
    description: str | None
    priority: str
    source: str
    status: str
    requested_at: datetime
    created_at: datetime
    updated_at: datetime


class ServiceRequestListResponse(BaseModel):
    items: list[ServiceRequestResponse]
    total: int
    limit: int
    offset: int


class ServiceRequestConvert(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    assigned_user_id: UUID | None = None
    scheduled_at: datetime | None = None
