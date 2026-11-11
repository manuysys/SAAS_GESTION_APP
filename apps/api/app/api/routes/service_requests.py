from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_roles
from app.core.db import get_db
from app.models import Membership
from app.schemas.service_request import (
    ServiceRequestConvert,
    ServiceRequestCreate,
    ServiceRequestListResponse,
    ServiceRequestResponse,
    ServiceRequestUpdate,
)
from app.schemas.work_order import WorkOrderResponse
from app.services import plan_limits_service, service_request_service

router = APIRouter(prefix="/service-requests", tags=["service-requests"])

READ_ROLES = ("owner", "admin", "dispatcher", "technician", "viewer")
WRITE_ROLES = ("owner", "admin", "dispatcher")


@router.get("", response_model=ServiceRequestListResponse)
async def list_service_requests(
    status_filter: str | None = Query(default=None, alias="status"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    membership: Membership = Depends(require_roles(*READ_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> ServiceRequestListResponse:
    items, total = await service_request_service.list_tenant_service_requests(
        db,
        tenant_id=membership.tenant_id,
        status_filter=status_filter,
        limit=limit,
        offset=offset,
    )
    return ServiceRequestListResponse(
        items=[ServiceRequestResponse.model_validate(item) for item in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post("", response_model=ServiceRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_service_request(
    payload: ServiceRequestCreate,
    membership: Membership = Depends(require_roles(*WRITE_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> ServiceRequestResponse:
    request = await service_request_service.create_tenant_service_request(
        db, tenant_id=membership.tenant_id, payload=payload
    )
    return ServiceRequestResponse.model_validate(request)


@router.get("/{request_id}", response_model=ServiceRequestResponse)
async def get_service_request(
    request_id: UUID,
    membership: Membership = Depends(require_roles(*READ_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> ServiceRequestResponse:
    request = await service_request_service.get_tenant_service_request(
        db, tenant_id=membership.tenant_id, request_id=request_id
    )
    return ServiceRequestResponse.model_validate(request)


@router.patch("/{request_id}", response_model=ServiceRequestResponse)
async def update_service_request(
    request_id: UUID,
    payload: ServiceRequestUpdate,
    membership: Membership = Depends(require_roles(*WRITE_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> ServiceRequestResponse:
    request = await service_request_service.update_tenant_service_request(
        db, tenant_id=membership.tenant_id, request_id=request_id, payload=payload
    )
    return ServiceRequestResponse.model_validate(request)


@router.post(
    "/{request_id}/convert",
    response_model=WorkOrderResponse,
    status_code=status.HTTP_201_CREATED,
)
async def convert_service_request(
    request_id: UUID,
    payload: ServiceRequestConvert,
    membership: Membership = Depends(require_roles(*WRITE_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> WorkOrderResponse:
    await plan_limits_service.assert_can_create_work_order(db, tenant_id=membership.tenant_id)
    _, order = await service_request_service.convert_service_request(
        db,
        tenant_id=membership.tenant_id,
        request_id=request_id,
        payload=payload,
        actor_user_id=membership.user_id,
    )
    return WorkOrderResponse.model_validate(order)
