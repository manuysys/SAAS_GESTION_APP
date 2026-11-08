from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_roles
from app.core.db import get_db
from app.models import Membership
from app.schemas.work_order import (
    WorkOrderCreate,
    WorkOrderEventResponse,
    WorkOrderListResponse,
    WorkOrderResponse,
    WorkOrderTransition,
    WorkOrderUpdate,
)
from app.services import work_order_service

router = APIRouter(prefix="/work-orders", tags=["work-orders"])

READ_ROLES = ("owner", "admin", "dispatcher", "technician", "viewer")
WRITE_ROLES = ("owner", "admin", "dispatcher")
TRANSITION_ROLES = ("owner", "admin", "dispatcher", "technician")


def _technician_scope(membership: Membership) -> UUID | None:
    return membership.user_id if membership.role == "technician" else None


async def _ensure_technician_owns_order(
    db: AsyncSession,
    membership: Membership,
    order_id: UUID,
) -> None:
    if membership.role != "technician":
        return
    order = await work_order_service.get_tenant_work_order(
        db, tenant_id=membership.tenant_id, order_id=order_id
    )
    if order.assigned_user_id != membership.user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Work order not found",
        )


@router.get("", response_model=WorkOrderListResponse)
async def list_work_orders(
    operational_status: str | None = Query(default=None, alias="status"),
    assigned_user_id: UUID | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    membership: Membership = Depends(require_roles(*READ_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> WorkOrderListResponse:
    technician_id = _technician_scope(membership)
    if technician_id is not None:
        assigned_user_id = technician_id
    items, total = await work_order_service.list_tenant_work_orders(
        db,
        tenant_id=membership.tenant_id,
        operational_status=operational_status,
        assigned_user_id=assigned_user_id,
        limit=limit,
        offset=offset,
    )
    return WorkOrderListResponse(
        items=[WorkOrderResponse.model_validate(item) for item in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post("", response_model=WorkOrderResponse, status_code=status.HTTP_201_CREATED)
async def create_work_order(
    payload: WorkOrderCreate,
    membership: Membership = Depends(require_roles(*WRITE_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> WorkOrderResponse:
    order = await work_order_service.create_tenant_work_order(
        db,
        tenant_id=membership.tenant_id,
        payload=payload,
        actor_user_id=membership.user_id,
    )
    return WorkOrderResponse.model_validate(order)


@router.get("/{order_id}", response_model=WorkOrderResponse)
async def get_work_order(
    order_id: UUID,
    membership: Membership = Depends(require_roles(*READ_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> WorkOrderResponse:
    await _ensure_technician_owns_order(db, membership, order_id)
    order = await work_order_service.get_tenant_work_order(
        db, tenant_id=membership.tenant_id, order_id=order_id
    )
    return WorkOrderResponse.model_validate(order)


@router.patch("/{order_id}", response_model=WorkOrderResponse)
async def update_work_order(
    order_id: UUID,
    payload: WorkOrderUpdate,
    membership: Membership = Depends(require_roles(*WRITE_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> WorkOrderResponse:
    order = await work_order_service.update_tenant_work_order(
        db, tenant_id=membership.tenant_id, order_id=order_id, payload=payload
    )
    return WorkOrderResponse.model_validate(order)


@router.post("/{order_id}/transition", response_model=WorkOrderResponse)
async def transition_work_order(
    order_id: UUID,
    payload: WorkOrderTransition,
    membership: Membership = Depends(require_roles(*TRANSITION_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> WorkOrderResponse:
    await _ensure_technician_owns_order(db, membership, order_id)
    order = await work_order_service.transition_tenant_work_order(
        db,
        tenant_id=membership.tenant_id,
        order_id=order_id,
        payload=payload,
        actor_user_id=membership.user_id,
        actor_role=membership.role,
    )
    return WorkOrderResponse.model_validate(order)


@router.get("/{order_id}/events", response_model=list[WorkOrderEventResponse])
async def list_work_order_events(
    order_id: UUID,
    membership: Membership = Depends(require_roles(*READ_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> list[WorkOrderEventResponse]:
    await _ensure_technician_owns_order(db, membership, order_id)
    events = await work_order_service.list_tenant_work_order_events(
        db, tenant_id=membership.tenant_id, order_id=order_id
    )
    return [WorkOrderEventResponse.model_validate(event) for event in events]
