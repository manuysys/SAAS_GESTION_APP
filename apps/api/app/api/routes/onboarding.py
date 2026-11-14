from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_client_ip, require_roles
from app.core.db import get_db
from app.models import Membership
from app.schemas.onboarding import OnboardingResponse, OnboardingUpdate
from app.services import audit_service, onboarding_service

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


@router.get("", response_model=OnboardingResponse)
async def get_onboarding(
    membership: Membership = Depends(require_roles("owner", "admin")),
    db: AsyncSession = Depends(get_db),
) -> OnboardingResponse:
    completed, state = await onboarding_service.get_onboarding_state(db, membership.tenant_id)
    return OnboardingResponse(completed=completed, state=state)


@router.patch("", response_model=OnboardingResponse)
async def patch_onboarding(
    payload: OnboardingUpdate,
    membership: Membership = Depends(require_roles("owner", "admin")),
    db: AsyncSession = Depends(get_db),
) -> OnboardingResponse:
    completed, state = await onboarding_service.update_onboarding_state(
        db, membership.tenant_id, payload
    )
    await db.commit()
    return OnboardingResponse(completed=completed, state=state)


@router.post("/complete", response_model=OnboardingResponse)
async def complete_onboarding(
    request: Request,
    membership: Membership = Depends(require_roles("owner", "admin")),
    db: AsyncSession = Depends(get_db),
) -> OnboardingResponse:
    completed, state = await onboarding_service.complete_onboarding(db, membership.tenant_id)
    await audit_service.record(
        db,
        action="onboarding_completed",
        entity_type="tenant",
        entity_id=str(membership.tenant_id),
        tenant_id=membership.tenant_id,
        actor_user_id=membership.user_id,
        ip=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    await db.commit()
    return OnboardingResponse(completed=completed, state=state)
