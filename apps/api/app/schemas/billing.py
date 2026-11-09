from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class PlanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    code: str
    name: str
    price_ars: Decimal
    billing_period: str
    limits: dict[str, object] | None
    active: bool


class SubscriptionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    plan: PlanResponse
    status: str
    started_at: datetime | None
    current_period_end: datetime | None
    price_snapshot: Decimal


class SubscriptionUsage(BaseModel):
    orders_this_month: int
    users_count: int
    technicians_count: int
    ai_tokens_used: int


class SubscriptionDetailResponse(BaseModel):
    subscription: SubscriptionResponse
    usage: SubscriptionUsage


class SubscriptionChangeRequest(BaseModel):
    plan_code: str


class AdminTenantResponse(BaseModel):
    id: UUID
    name: str
    created_at: datetime
    plan_code: str | None
    plan_name: str | None
    subscription_status: str | None
    users_count: int
    orders_count: int
    price_snapshot: Decimal


class AdminTenantListResponse(BaseModel):
    items: list[AdminTenantResponse]
    total: int
    limit: int
    offset: int


class AdminMetricsResponse(BaseModel):
    tenants_total: int
    active_subscriptions: int
    trialing_subscriptions: int
    mrr_ars: Decimal
    orders_total: int
    orders_this_month: int
    ai_tokens_this_month: int


class AdminSubscriptionUpdate(BaseModel):
    plan_code: str
    status: Literal["trialing", "active", "past_due", "cancelled"]
