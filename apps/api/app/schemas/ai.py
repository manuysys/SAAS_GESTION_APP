from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class AIChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)


class AIChatResponse(BaseModel):
    reply: str
    provider: str
    model: str
    input_tokens: int
    output_tokens: int
    estimated_cost: Decimal
    used_tokens: int


class AIStatusResponse(BaseModel):
    provider: str
    model: str
    configured: bool
    available: bool
    deterministic_available: bool = True
    monthly_token_limit: int
    tokens_used: int
    capabilities: list[str]


class AIUsageItem(BaseModel):
    id: UUID
    provider: str
    model: str
    feature: str
    input_tokens: int
    output_tokens: int
    estimated_cost: Decimal
    created_at: datetime


class AIUsageResponse(BaseModel):
    items: list[AIUsageItem]
    total_tokens: int
    total_cost: Decimal
    monthly_limit: int
    remaining: int
