"""Validaciones de límites del plan contratado.

El objetivo es no prometer en la landing más de lo que el backend permite.
Se aplican límites de órdenes por mes, usuarios totales y técnicos.
"""

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import raiseload

from app.models import Invitation, Membership, Subscription
from app.repositories import billing as billing_repo


def _limit_value(limits: dict[str, object] | None, key: str) -> int | None:
    if not limits:
        return None
    raw = limits.get(key)
    if raw is None:
        return None
    if isinstance(raw, bool):
        return None
    if isinstance(raw, int):
        return raw
    if isinstance(raw, str) and raw.isdigit():
        return int(raw)
    return None


async def _lock_subscription(db: AsyncSession, tenant_id: UUID) -> Subscription | None:
    """Adquiere un lock pesimista sobre la suscripción del tenant."""
    result = await db.execute(
        select(Subscription)
        .where(Subscription.tenant_id == tenant_id)
        .options(raiseload(Subscription.plan))
        .with_for_update()
    )
    return result.scalar_one_or_none()


async def _count_active_memberships(db: AsyncSession, tenant_id: UUID) -> int:
    result = await db.scalar(
        select(func.count())
        .select_from(Membership)
        .where(Membership.tenant_id == tenant_id, Membership.status == "active")
    )
    return int(result or 0)


async def _count_active_technicians(db: AsyncSession, tenant_id: UUID) -> int:
    result = await db.scalar(
        select(func.count())
        .select_from(Membership)
        .where(
            Membership.tenant_id == tenant_id,
            Membership.status == "active",
            Membership.role == "technician",
        )
    )
    return int(result or 0)


async def _count_pending_invitations(db: AsyncSession, tenant_id: UUID) -> int:
    result = await db.scalar(
        select(func.count())
        .select_from(Invitation)
        .where(
            Invitation.tenant_id == tenant_id,
            Invitation.accepted_at.is_(None),
            Invitation.revoked_at.is_(None),
        )
    )
    return int(result or 0)


async def _count_pending_technician_invitations(db: AsyncSession, tenant_id: UUID) -> int:
    result = await db.scalar(
        select(func.count())
        .select_from(Invitation)
        .where(
            Invitation.tenant_id == tenant_id,
            Invitation.role == "technician",
            Invitation.accepted_at.is_(None),
            Invitation.revoked_at.is_(None),
        )
    )
    return int(result or 0)


async def assert_can_create_work_order(db: AsyncSession, *, tenant_id: UUID) -> None:
    row = await billing_repo.get_subscription_with_plan(db, tenant_id)
    if row is None:
        return

    _, plan = row
    limit = _limit_value(plan.limits, "max_orders_per_month")
    if limit is None:
        limit = _limit_value(plan.limits, "orders_per_month")
    if limit is None or limit <= 0:
        return

    used = await billing_repo.count_work_orders_this_month(db, tenant_id)
    if used >= limit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"El plan {plan.name} permite {limit} órdenes por mes. "
                "Cambiá de plan para crear más."
            ),
        )


async def assert_can_invite_user(db: AsyncSession, *, tenant_id: UUID) -> None:
    """Valida que el tenant no haya alcanzado el límite total de usuarios.

    El cálculo incluye membresías activas más invitaciones pendientes.
    """
    subscription = await _lock_subscription(db, tenant_id)
    if subscription is None:
        return

    plan = await db.get(billing_repo.Plan, subscription.plan_id)
    if plan is None:
        return

    limit = _limit_value(plan.limits, "max_users")
    if limit is None or limit <= 0:
        return

    active = await _count_active_memberships(db, tenant_id)
    pending = await _count_pending_invitations(db, tenant_id)
    if active + pending >= limit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"El plan {plan.name} permite hasta {limit} usuarios. "
                "Cambiá de plan o revocá invitaciones pendientes."
            ),
        )


async def assert_can_invite_technician(db: AsyncSession, *, tenant_id: UUID) -> None:
    """Valida que el tenant no haya alcanzado el límite de técnicos.

    El cálculo incluye técnicos activos más invitaciones pendientes a técnicos.
    """
    subscription = await _lock_subscription(db, tenant_id)
    if subscription is None:
        return

    plan = await db.get(billing_repo.Plan, subscription.plan_id)
    if plan is None:
        return

    limit = _limit_value(plan.limits, "max_technicians")
    if limit is None or limit <= 0:
        return

    active = await _count_active_technicians(db, tenant_id)
    pending = await _count_pending_technician_invitations(db, tenant_id)
    if active + pending >= limit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"El plan {plan.name} permite hasta {limit} técnicos. "
                "Cambiá de plan o revocá invitaciones pendientes."
            ),
        )
