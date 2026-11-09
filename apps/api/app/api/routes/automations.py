from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_roles
from app.core.db import get_db
from app.models import Membership
from app.schemas.automation import (
    AutomationExecutionResponse,
    AutomationRuleCreate,
    AutomationRuleResponse,
    AutomationRuleUpdate,
)
from app.schemas.common import MessageResponse
from app.services import automation_service

router = APIRouter(prefix="/automations", tags=["automations"])

ADMIN_ROLES = ("owner", "admin")


@router.get("", response_model=list[AutomationRuleResponse])
async def list_automation_rules(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    membership: Membership = Depends(require_roles(*ADMIN_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> list[AutomationRuleResponse]:
    items, _total = await automation_service.list_tenant_rules(
        db, tenant_id=membership.tenant_id, limit=limit, offset=offset
    )
    return [AutomationRuleResponse.model_validate(item) for item in items]


@router.post("", response_model=AutomationRuleResponse, status_code=status.HTTP_201_CREATED)
async def create_automation_rule(
    payload: AutomationRuleCreate,
    membership: Membership = Depends(require_roles(*ADMIN_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> AutomationRuleResponse:
    rule = await automation_service.create_tenant_rule(
        db, tenant_id=membership.tenant_id, payload=payload
    )
    return AutomationRuleResponse.model_validate(rule)


@router.patch("/{rule_id}", response_model=AutomationRuleResponse)
async def update_automation_rule(
    rule_id: UUID,
    payload: AutomationRuleUpdate,
    membership: Membership = Depends(require_roles(*ADMIN_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> AutomationRuleResponse:
    rule = await automation_service.update_tenant_rule(
        db, tenant_id=membership.tenant_id, rule_id=rule_id, payload=payload
    )
    return AutomationRuleResponse.model_validate(rule)


@router.post("/{rule_id}/toggle", response_model=AutomationRuleResponse)
async def toggle_automation_rule(
    rule_id: UUID,
    membership: Membership = Depends(require_roles(*ADMIN_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> AutomationRuleResponse:
    rule = await automation_service.toggle_tenant_rule(
        db, tenant_id=membership.tenant_id, rule_id=rule_id
    )
    return AutomationRuleResponse.model_validate(rule)


@router.delete("/{rule_id}", response_model=MessageResponse)
async def delete_automation_rule(
    rule_id: UUID,
    membership: Membership = Depends(require_roles(*ADMIN_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    await automation_service.delete_tenant_rule(db, tenant_id=membership.tenant_id, rule_id=rule_id)
    return MessageResponse(message="Rule deleted")


@router.get("/executions", response_model=list[AutomationExecutionResponse])
async def list_automation_executions(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    membership: Membership = Depends(require_roles(*ADMIN_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> list[AutomationExecutionResponse]:
    items, _total = await automation_service.list_tenant_executions(
        db, tenant_id=membership.tenant_id, limit=limit, offset=offset
    )
    return [AutomationExecutionResponse.model_validate(item) for item in items]
