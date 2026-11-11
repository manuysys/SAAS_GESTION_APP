"""Validaciones de límites del plan contratado.

El objetivo es no prometer en la landing más de lo que el backend permite.
Por ahora se aplica el límite de órdenes por mes; los límites de usuarios y
técnicos se aplicarán cuando exista un endpoint de invitación/creación de
miembros.
"""

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

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
