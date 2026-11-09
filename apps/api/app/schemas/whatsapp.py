from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


class WhatsAppConfigUpdate(BaseModel):
    phone_number_id: str = Field(min_length=3, max_length=80)
    business_account_id: str = Field(min_length=3, max_length=80)
    access_token: str | None = None
    verify_token: str | None = None
    app_secret: str | None = None
    active: bool = False


class WhatsAppConfigResponse(BaseModel):
    configured: bool
    active: bool
    phone_number_id: str | None
    business_account_id: str | None
    has_access_token: bool
    has_verify_token: bool
    has_app_secret: bool


class WhatsAppMessageResponse(ORMModel):
    id: UUID
    direction: str
    wa_message_id: str | None
    from_phone: str
    to_phone: str
    message_type: str
    body: str | None
    status: str
    created_at: datetime


class WhatsAppMessageListResponse(BaseModel):
    items: list[WhatsAppMessageResponse]
    total: int
    limit: int
    offset: int


class WhatsAppSendRequest(BaseModel):
    to_phone: str = Field(min_length=8, max_length=20)
    body: str = Field(min_length=1, max_length=4096)


class WhatsAppSendResponse(BaseModel):
    id: UUID
    status: str
    wa_message_id: str | None
