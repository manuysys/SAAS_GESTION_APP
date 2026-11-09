from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel

EventType = Literal[
    "quote_sent",
    "quote_approved",
    "quote_rejected",
    "work_order_status_changed",
    "appointment_created",
    "payment_registered",
]

ActionType = Literal["notify", "notify_user", "send_whatsapp"]


class AutomationRuleCreate(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    event_type: EventType
    conditions: dict[str, object] | None = Field(default=None)
    action_type: ActionType
    action_config: dict[str, object] | None = Field(default=None)
    active: bool = True


class AutomationRuleUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=160)
    event_type: EventType | None = None
    conditions: dict[str, object] | None = Field(default=None)
    action_type: ActionType | None = None
    action_config: dict[str, object] | None = Field(default=None)
    active: bool | None = None


class AutomationRuleResponse(ORMModel):
    id: UUID
    tenant_id: UUID
    name: str
    event_type: str
    conditions: dict[str, object] | None
    action_type: str
    action_config: dict[str, object] | None
    active: bool
    created_at: datetime
    updated_at: datetime


class AutomationExecutionResponse(ORMModel):
    id: UUID
    rule_id: UUID
    event_type: str
    status: str
    payload: dict[str, object] | None
    error: str | None
    attempts: int
    created_at: datetime
    executed_at: datetime | None


class NotificationResponse(ORMModel):
    id: UUID
    title: str
    message: str
    type: str
    read_at: datetime | None
    created_at: datetime
    user_id: UUID | None


class NotificationListResponse(BaseModel):
    items: list[NotificationResponse]
    total: int
    unread: int
