from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.statuses import OPERATIONAL_TRANSITIONS, TECHNICIAN_TRANSITIONS
from app.models import Membership, WorkOrder
from app.repositories.customers import get_customer
from app.repositories.service_requests import get_service_request
from app.repositories.work_orders import (
    create_work_order,
    create_work_order_event,
    get_work_order,
    list_work_order_events,
    list_work_orders,
    next_work_order_code,
)
from app.schemas.work_order import (
    WorkOrderCreate,
    WorkOrderTransition,
    WorkOrderUpdate,
)


async def validate_assignee(db: AsyncSession, tenant_id: UUID, user_id: UUID) -> None:
    result = await db.execute(
        select(Membership).where(
            Membership.tenant_id == tenant_id,
            Membership.user_id == user_id,
            Membership.status == "active",
        )
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assigned user is not a member of this tenant",
        )


async def list_tenant_work_orders(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    operational_status: str | None,
    assigned_user_id: UUID | None,
    limit: int,
    offset: int,
) -> tuple[list[WorkOrder], int]:
    return await list_work_orders(
        db,
        tenant_id=tenant_id,
        operational_status=operational_status,
        assigned_user_id=assigned_user_id,
        limit=limit,
        offset=offset,
    )


async def get_tenant_work_order(db: AsyncSession, *, tenant_id: UUID, order_id: UUID) -> WorkOrder:
    order = await get_work_order(db, tenant_id=tenant_id, order_id=order_id)
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work order not found")
    return order


async def create_tenant_work_order(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    payload: WorkOrderCreate,
    actor_user_id: UUID,
) -> WorkOrder:
    customer = await get_customer(db, tenant_id=tenant_id, customer_id=payload.customer_id)
    if customer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    if payload.service_request_id:
        request = await get_service_request(
            db, tenant_id=tenant_id, request_id=payload.service_request_id
        )
        if request is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Service request not found"
            )

    if payload.assigned_user_id:
        await validate_assignee(db, tenant_id, payload.assigned_user_id)

    code = await next_work_order_code(db, tenant_id=tenant_id)
    order = await create_work_order(
        db,
        tenant_id=tenant_id,
        customer_id=payload.customer_id,
        service_request_id=payload.service_request_id,
        code=code,
        title=payload.title.strip(),
        description=payload.description,
        priority=payload.priority,
        assigned_user_id=payload.assigned_user_id,
        scheduled_at=payload.scheduled_at,
    )
    await create_work_order_event(
        db,
        tenant_id=tenant_id,
        work_order_id=order.id,
        event_type="created",
        from_status=None,
        to_status=order.operational_status,
        actor_user_id=actor_user_id,
    )
    await db.commit()
    await db.refresh(order)
    return order


async def update_tenant_work_order(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    order_id: UUID,
    payload: WorkOrderUpdate,
) -> WorkOrder:
    order = await get_tenant_work_order(db, tenant_id=tenant_id, order_id=order_id)
    data = payload.model_dump(exclude_unset=True)
    assigned_user_id = data.get("assigned_user_id")
    if assigned_user_id:
        await validate_assignee(db, tenant_id, assigned_user_id)
    for field, value in data.items():
        setattr(order, field, value)
    await db.commit()
    await db.refresh(order)
    return order


async def transition_tenant_work_order(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    order_id: UUID,
    payload: WorkOrderTransition,
    actor_user_id: UUID,
    actor_role: str,
) -> WorkOrder:
    order = await get_tenant_work_order(db, tenant_id=tenant_id, order_id=order_id)
    current = order.operational_status
    target = payload.to_status

    if target == current:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Work order is already in that status",
        )

    allowed = OPERATIONAL_TRANSITIONS.get(current, frozenset())
    if target not in allowed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Invalid transition from {current} to {target}",
        )

    if actor_role == "technician":
        if order.assigned_user_id != actor_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Technician is not assigned to this work order",
            )
        if target not in TECHNICIAN_TRANSITIONS.get(current, frozenset()):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Technician cannot perform this transition",
            )

    order.operational_status = target
    now = datetime.now(UTC)
    if target == "in_progress" and order.started_at is None:
        order.started_at = now
    if target == "finished":
        order.finished_at = now

    await create_work_order_event(
        db,
        tenant_id=tenant_id,
        work_order_id=order.id,
        event_type="status_changed",
        from_status=current,
        to_status=target,
        actor_user_id=actor_user_id,
        payload={"notes": payload.notes} if payload.notes else None,
    )
    await db.commit()
    await db.refresh(order)
    return order


async def list_tenant_work_order_events(db: AsyncSession, *, tenant_id: UUID, order_id: UUID):
    await get_tenant_work_order(db, tenant_id=tenant_id, order_id=order_id)
    return await list_work_order_events(db, tenant_id=tenant_id, work_order_id=order_id)
