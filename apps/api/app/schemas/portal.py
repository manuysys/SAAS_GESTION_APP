from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_serializer

from app.schemas.common import ORMModel


class PortalSettings(BaseModel):
    display_name: str | None = None
    logo_url: str | None = None
    primary_color: str | None = "#0F766E"
    support_email: str | None = None
    support_phone: str | None = None
    welcome_message: str | None = None


class PortalTenantResponse(BaseModel):
    id: UUID
    name: str
    slug: str


class PortalPublicResponse(BaseModel):
    tenant: PortalTenantResponse
    portal: PortalSettings
    demo_available: bool


class PortalAuthRequest(BaseModel):
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=40)


class PortalAuthVerifyRequest(BaseModel):
    token: str = Field(min_length=8)


class PortalAuthRequestResponse(BaseModel):
    message: str
    dev_token: str | None = None


class PortalCustomerResponse(BaseModel):
    id: UUID
    name: str
    email: str | None
    phone: str | None


class PortalAuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"  # noqa: S105
    expires_in: int
    customer: PortalCustomerResponse
    tenant: PortalTenantResponse


class PortalSummaryResponse(BaseModel):
    open_requests: int
    open_orders: int
    pending_quotes: int
    next_appointment: dict[str, object] | None


class PortalRequestCreate(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    priority: Literal["low", "normal", "high", "urgent"] = "normal"


class PortalServiceRequestResponse(ORMModel):
    id: UUID
    title: str
    description: str | None
    priority: str
    status: str
    requested_at: datetime
    created_at: datetime


class PortalWorkOrderResponse(ORMModel):
    id: UUID
    code: str
    title: str
    description: str | None
    operational_status: str
    commercial_status: str
    payment_status: str
    scheduled_at: datetime | None
    started_at: datetime | None
    finished_at: datetime | None
    created_at: datetime


class PortalAppointmentResponse(ORMModel):
    id: UUID
    starts_at: datetime
    ends_at: datetime
    status: str
    notes: str | None


class PortalQuoteItemResponse(BaseModel):
    description: str
    quantity: Decimal
    unit_price: Decimal
    discount_rate: Decimal
    tax_rate: Decimal
    line_total: Decimal

    @field_serializer("quantity", "unit_price", "discount_rate", "tax_rate", "line_total")
    def serialize_decimal(self, value: Decimal) -> str:
        return str(value)


class PortalQuoteResponse(ORMModel):
    id: UUID
    number: str
    status: str
    currency: str
    subtotal: Decimal
    discount_total: Decimal
    tax_total: Decimal
    total: Decimal
    valid_until: datetime | None
    sent_at: datetime | None
    items: list[PortalQuoteItemResponse]

    @field_serializer("subtotal", "discount_total", "tax_total", "total")
    def serialize_decimal(self, value: Decimal) -> str:
        return str(value)


class PortalPaymentResponse(ORMModel):
    id: UUID
    amount: Decimal
    currency: str
    method: str
    status: str
    paid_at: datetime

    @field_serializer("amount")
    def serialize_decimal(self, value: Decimal) -> str:
        return str(value)


class PortalWorkOrderDetailResponse(ORMModel):
    id: UUID
    code: str
    title: str
    description: str | None
    operational_status: str
    commercial_status: str
    payment_status: str
    scheduled_at: datetime | None
    started_at: datetime | None
    finished_at: datetime | None
    appointments: list[PortalAppointmentResponse]
    quotes: list[PortalQuoteResponse]
    created_at: datetime
