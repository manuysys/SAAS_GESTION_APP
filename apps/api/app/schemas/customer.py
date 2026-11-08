from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.schemas.common import ORMModel


class CustomerCreate(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    phone: str | None = Field(default=None, max_length=40)
    email: EmailStr | None = None
    notes: str | None = Field(default=None, max_length=2000)


class CustomerUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=160)
    phone: str | None = Field(default=None, max_length=40)
    email: EmailStr | None = None
    notes: str | None = Field(default=None, max_length=2000)
    status: str | None = Field(default=None, max_length=20)


class CustomerResponse(ORMModel):
    id: UUID
    tenant_id: UUID
    name: str
    phone: str | None
    email: str | None
    notes: str | None
    status: str
    created_at: datetime
    updated_at: datetime


class CustomerListResponse(BaseModel):
    items: list[CustomerResponse]
    total: int
    limit: int
    offset: int
