from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ServiceRequest
from app.repositories.customers import get_customer
from app.repositories.service_requests import (
    create_service_request,
    get_service_request,
    list_service_requests,
)
from app.repositories.work_orders import (
    create_work_order,
    create_work_order_event,
    next_work_order_code,
)
from app.schemas.service_request import (
    ServiceRequestConvert,
    ServiceRequestCreate,
    ServiceRequestUpdate,
)
from app.services.work_order_service import validate_assignee


async def list_tenant_service_requests(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    status_filter: str | None,
    limit: int,
    offset: int,
) -> tuple[list[ServiceRequest], int]:
    return await list_service_requests(
        db,
        tenant_id=tenant_id,
        status=status_filter,
        limit=limit,
        offset=offset,
    )


async def get_tenant_service_request(
    db: AsyncSession, *, tenant_id: UUID, request_id: UUID
) -> ServiceRequest:
    request = await get_service_request(db, tenant_id=tenant_id, request_id=request_id)
    if request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Service request not found"
        )
    return request


async def create_tenant_service_request(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    payload: ServiceRequestCreate,
) -> ServiceRequest:
    customer = await get_customer(db, tenant_id=tenant_id, customer_id=payload.customer_id)
    if customer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    request = await create_service_request(
        db,
        tenant_id=tenant_id,
        customer_id=payload.customer_id,
        title=payload.title.strip(),
        description=payload.description,
        priority=payload.priority,
        source=payload.source,
    )
    await db.commit()
    await db.refresh(request)
    return request


async def update_tenant_service_request(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    request_id: UUID,
    payload: ServiceRequestUpdate,
) -> ServiceRequest:
    request = await get_tenant_service_request(db, tenant_id=tenant_id, request_id=request_id)
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(request, field, value)
    await db.commit()
    await db.refresh(request)
    return request


async def convert_service_request(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    request_id: UUID,
    payload: ServiceRequestConvert,
    actor_user_id: UUID,
):
    request = await get_tenant_service_request(db, tenant_id=tenant_id, request_id=request_id)
    if request.status == "converted":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Service request already converted",
        )

    customer = await get_customer(db, tenant_id=tenant_id, customer_id=request.customer_id)
    if customer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    if payload.assigned_user_id:
        await validate_assignee(db, tenant_id, payload.assigned_user_id)

    code = await next_work_order_code(db, tenant_id=tenant_id)
    order = await create_work_order(
        db,
        tenant_id=tenant_id,
        customer_id=request.customer_id,
        service_request_id=request.id,
        code=code,
        title=payload.title or request.title,
        description=payload.description or request.description,
        priority=request.priority,
        assigned_user_id=payload.assigned_user_id,
        scheduled_at=payload.scheduled_at,
    )
    request.status = "converted"
    await create_work_order_event(
        db,
        tenant_id=tenant_id,
        work_order_id=order.id,
        event_type="created_from_request",
        from_status=None,
        to_status=order.operational_status,
        actor_user_id=actor_user_id,
        payload={"service_request_id": str(request.id)},
    )
    await db.commit()
    await db.refresh(order)
    await db.refresh(request)
    return request, order
