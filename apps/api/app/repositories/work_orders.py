from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Tenant, WorkOrder, WorkOrderEvent


async def list_work_orders(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    operational_status: str | None = None,
    assigned_user_id: UUID | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[WorkOrder], int]:
    filters = [WorkOrder.tenant_id == tenant_id]
    if operational_status:
        filters.append(WorkOrder.operational_status == operational_status)
    if assigned_user_id:
        filters.append(WorkOrder.assigned_user_id == assigned_user_id)

    total = await db.scalar(select(func.count()).select_from(WorkOrder).where(*filters))
    result = await db.execute(
        select(WorkOrder)
        .where(*filters)
        .order_by(WorkOrder.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(result.scalars().all()), int(total or 0)


async def get_work_order(db: AsyncSession, *, tenant_id: UUID, order_id: UUID) -> WorkOrder | None:
    result = await db.execute(
        select(WorkOrder).where(
            WorkOrder.id == order_id,
            WorkOrder.tenant_id == tenant_id,
        )
    )
    return result.scalar_one_or_none()


async def next_work_order_code(db: AsyncSession, *, tenant_id: UUID) -> str:
    # Serializa la numeración por tenant dentro de la transacción actual.
    await db.execute(select(Tenant.id).where(Tenant.id == tenant_id).with_for_update())
    year = datetime.now(UTC).year
    prefix = f"WO-{year}-"
    result = await db.execute(
        select(func.count()).select_from(WorkOrder).where(WorkOrder.tenant_id == tenant_id)
    )
    sequence = int(result.scalar_one() or 0) + 1
    return f"{prefix}{sequence:04d}"


async def create_work_order(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    customer_id: UUID,
    service_request_id: UUID | None,
    code: str,
    title: str,
    description: str | None,
    priority: str,
    assigned_user_id: UUID | None,
    scheduled_at: datetime | None,
) -> WorkOrder:
    order = WorkOrder(
        tenant_id=tenant_id,
        customer_id=customer_id,
        service_request_id=service_request_id,
        code=code,
        title=title,
        description=description,
        priority=priority,
        assigned_user_id=assigned_user_id,
        scheduled_at=scheduled_at,
        operational_status="scheduled" if scheduled_at else "new",
    )
    db.add(order)
    await db.flush()
    return order


async def create_work_order_event(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    work_order_id: UUID,
    event_type: str,
    from_status: str | None,
    to_status: str | None,
    actor_user_id: UUID | None,
    payload: dict[str, object] | None = None,
) -> WorkOrderEvent:
    event = WorkOrderEvent(
        tenant_id=tenant_id,
        work_order_id=work_order_id,
        event_type=event_type,
        from_status=from_status,
        to_status=to_status,
        actor_user_id=actor_user_id,
        payload=payload,
    )
    db.add(event)
    await db.flush()
    return event


async def list_work_order_events(
    db: AsyncSession, *, tenant_id: UUID, work_order_id: UUID
) -> list[WorkOrderEvent]:
    result = await db.execute(
        select(WorkOrderEvent)
        .where(
            WorkOrderEvent.tenant_id == tenant_id,
            WorkOrderEvent.work_order_id == work_order_id,
        )
        .order_by(WorkOrderEvent.created_at.asc())
    )
    return list(result.scalars().all())
