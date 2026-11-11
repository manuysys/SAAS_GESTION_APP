from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_serializer

from app.schemas.common import ORMModel

QuoteStatus = Literal["draft", "sent", "approved", "rejected", "expired"]


class QuoteItemInput(BaseModel):
    description: str = Field(min_length=1, max_length=300)
    quantity: Decimal = Field(gt=Decimal("0"), max_digits=12, decimal_places=3)
    unit_price: Decimal = Field(ge=Decimal("0"), max_digits=14, decimal_places=2)
    discount_rate: Decimal = Field(
        default=Decimal("0"), ge=Decimal("0"), le=Decimal("100"), max_digits=5, decimal_places=2
    )
    tax_rate: Decimal = Field(
        default=Decimal("0"),
        ge=Decimal("0"),
        le=Decimal("100"),
        max_digits=5,
        decimal_places=2,
    )
    sort_order: int = Field(default=0, ge=0)


class QuoteItemResponse(ORMModel):
    id: UUID
    description: str
    quantity: Decimal
    unit_price: Decimal
    discount_rate: Decimal
    tax_rate: Decimal
    line_total: Decimal
    sort_order: int
    created_at: datetime


class QuoteCreate(BaseModel):
    customer_id: UUID
    work_order_id: UUID | None = None
    valid_until: datetime | None = None
    notes: str | None = Field(default=None, max_length=5000)
    items: list[QuoteItemInput] = Field(min_length=1)


class QuoteUpdate(BaseModel):
    customer_id: UUID | None = None
    work_order_id: UUID | None = None
    valid_until: datetime | None = None
    notes: str | None = Field(default=None, max_length=5000)
    items: list[QuoteItemInput] | None = Field(default=None, min_length=1)


class QuoteResponse(ORMModel):
    id: UUID
    tenant_id: UUID
    customer_id: UUID
    work_order_id: UUID | None
    number: str
    status: QuoteStatus
    currency: str
    subtotal: Decimal
    discount_total: Decimal
    tax_total: Decimal
    total: Decimal
    notes: str | None
    valid_until: datetime | None
    sent_at: datetime | None
    approved_at: datetime | None
    rejected_at: datetime | None
    public_token: str
    public_token_revoked_at: datetime | None
    items: list[QuoteItemResponse]
    created_at: datetime
    updated_at: datetime

    @field_serializer("valid_until")
    def serialize_valid_until(self, value: datetime | None) -> str | None:
        return value.date().isoformat() if value else None


class QuoteSummaryResponse(ORMModel):
    id: UUID
    tenant_id: UUID
    customer_id: UUID
    work_order_id: UUID | None
    number: str
    status: QuoteStatus
    currency: str
    total: Decimal
    valid_until: datetime | None
    sent_at: datetime | None
    created_at: datetime
    updated_at: datetime

    @field_serializer("valid_until")
    def serialize_valid_until(self, value: datetime | None) -> str | None:
        return value.date().isoformat() if value else None


class QuoteListResponse(BaseModel):
    items: list[QuoteSummaryResponse]
    total: int
    limit: int
    offset: int


class QuoteEventResponse(ORMModel):
    id: UUID
    quote_id: UUID
    event_type: str
    actor_user_id: UUID | None
    payload: dict[str, object] | None
    created_at: datetime


class PublicQuoteItem(BaseModel):
    description: str
    quantity: Decimal
    unit_price: Decimal
    discount_rate: Decimal
    tax_rate: Decimal
    line_total: Decimal
    sort_order: int


class PublicQuoteResponse(BaseModel):
    tenant_name: str
    customer_name: str
    number: str
    status: QuoteStatus
    currency: str
    subtotal: Decimal
    discount_total: Decimal
    tax_total: Decimal
    total: Decimal
    notes: str | None
    valid_until: datetime | None
    items: list[PublicQuoteItem]

    @field_serializer("valid_until")
    def serialize_valid_until(self, value: datetime | None) -> str | None:
        return value.date().isoformat() if value else None


class PublicQuoteDecision(BaseModel):
    notes: str | None = Field(default=None, max_length=2000)
