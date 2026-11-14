from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Tenant
from app.schemas.onboarding import OnboardingState, OnboardingUpdate


def _default_state() -> OnboardingState:
    return OnboardingState()


def _deep_merge(base: dict, patch: dict) -> dict:
    """Mezcla recursiva de diccionarios; listas y escalares se reemplazan."""
    result = dict(base)
    for key, value in patch.items():
        if isinstance(value, dict) and isinstance(result.get(key), dict):
            result[key] = _deep_merge(result[key], value)
        else:
            result[key] = value
    return result


def _serialize_state(completed: bool, state: OnboardingState) -> dict[str, object]:
    return {"completed": completed, **state.model_dump(mode="json")}


async def _load_tenant(db: AsyncSession, tenant_id: UUID) -> Tenant:
    tenant = await db.scalar(select(Tenant).where(Tenant.id == tenant_id).with_for_update())
    if tenant is None:
        raise ValueError("Tenant not found")
    return tenant


async def get_onboarding_state(
    db: AsyncSession,
    tenant_id: UUID,
) -> tuple[bool, OnboardingState]:
    tenant = await _load_tenant(db, tenant_id)
    raw: dict[str, object] = dict(tenant.onboarding_state) if tenant.onboarding_state else {}
    completed = bool(raw.get("completed", False))
    state_dict = {k: v for k, v in raw.items() if k != "completed"}
    merged = _deep_merge(_default_state().model_dump(mode="json"), state_dict)
    return completed, OnboardingState.model_validate(merged)


async def update_onboarding_state(
    db: AsyncSession,
    tenant_id: UUID,
    patch: OnboardingUpdate,
) -> tuple[bool, OnboardingState]:
    tenant = await _load_tenant(db, tenant_id)
    raw: dict[str, object] = dict(tenant.onboarding_state) if tenant.onboarding_state else {}
    completed = bool(raw.get("completed", False))
    state_dict = {k: v for k, v in raw.items() if k != "completed"}

    merged = _deep_merge(_default_state().model_dump(mode="json"), state_dict)
    patch_dict = patch.model_dump(exclude_unset=True, exclude_none=True)

    # El horario se reemplaza completo: el frontend envia solo los dias activos.
    if "schedule" in patch_dict:
        raw_schedule = patch_dict["schedule"]
        merged["schedule"] = {
            day: value for day, value in raw_schedule.items() if value is not None
        }
        patch_dict.pop("schedule")

    merged = _deep_merge(merged, patch_dict)

    state = OnboardingState.model_validate(merged)
    tenant.onboarding_state = _serialize_state(completed, state)
    await db.flush()
    return completed, state


async def complete_onboarding(
    db: AsyncSession,
    tenant_id: UUID,
) -> tuple[bool, OnboardingState]:
    tenant = await _load_tenant(db, tenant_id)
    raw: dict[str, object] = dict(tenant.onboarding_state) if tenant.onboarding_state else {}
    state_dict = {k: v for k, v in raw.items() if k != "completed"}

    merged = _deep_merge(_default_state().model_dump(mode="json"), state_dict)
    merged["step"] = 4
    state = OnboardingState.model_validate(merged)

    tenant.onboarding_state = _serialize_state(True, state)
    await db.flush()
    return True, state
