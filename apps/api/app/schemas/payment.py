from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel

PaymentMethod = Literal["cash", "transfer", "card", "mercadopago", "other"]
PaymentStatus = Literal["registered", "voided"]


class PaymentCreate(BaseModel):
    work_order_id: UUID
    quote_id: UUID | None = None
    amount: Decimal = Field(gt=Decimal("0"), max_digits=14, decimal_places=2)
    method: PaymentMethod
    paid_at: datetime | None = None
    reference: str | None = Field(default=None, max_length=120)
    notes: str | None = Field(default=None, max_length=2000)


class PaymentResponse(ORMModel):
    id: UUID
    tenant_id: UUID
    work_order_id: UUID
    quote_id: UUID | None
    amount: Decimal
    currency: str
    method: str
    status: PaymentStatus
    paid_at: datetime
    reference: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime


class PaymentListResponse(BaseModel):
    items: list[PaymentResponse]
    total: int
    limit: int
    offset: int
