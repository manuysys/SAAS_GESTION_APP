from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_roles
from app.core.db import get_db
from app.models import Membership
from app.schemas.customer import (
    CustomerCreate,
    CustomerListResponse,
    CustomerResponse,
    CustomerUpdate,
)
from app.services import customer_service

router = APIRouter(prefix="/customers", tags=["customers"])

READ_ROLES = ("owner", "admin", "dispatcher", "technician", "viewer")
WRITE_ROLES = ("owner", "admin", "dispatcher")
ADMIN_ROLES = ("owner", "admin")


@router.get("", response_model=CustomerListResponse)
async def list_customers(
    query: str | None = Query(default=None, max_length=120),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    membership: Membership = Depends(require_roles(*READ_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> CustomerListResponse:
    items, total = await customer_service.list_tenant_customers(
        db,
        tenant_id=membership.tenant_id,
        query=query,
        limit=limit,
        offset=offset,
    )
    return CustomerListResponse(
        items=[CustomerResponse.model_validate(item) for item in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(
    payload: CustomerCreate,
    membership: Membership = Depends(require_roles(*WRITE_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> CustomerResponse:
    customer = await customer_service.create_tenant_customer(
        db,
        tenant_id=membership.tenant_id,
        payload=payload,
    )
    return CustomerResponse.model_validate(customer)


@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(
    customer_id: UUID,
    membership: Membership = Depends(require_roles(*READ_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> CustomerResponse:
    customer = await customer_service.get_tenant_customer(
        db,
        tenant_id=membership.tenant_id,
        customer_id=customer_id,
    )
    return CustomerResponse.model_validate(customer)


@router.patch("/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    customer_id: UUID,
    payload: CustomerUpdate,
    membership: Membership = Depends(require_roles(*WRITE_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> CustomerResponse:
    customer = await customer_service.update_tenant_customer(
        db,
        tenant_id=membership.tenant_id,
        customer_id=customer_id,
        payload=payload,
    )
    return CustomerResponse.model_validate(customer)


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer(
    customer_id: UUID,
    membership: Membership = Depends(require_roles(*ADMIN_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> Response:
    await customer_service.delete_tenant_customer(
        db,
        tenant_id=membership.tenant_id,
        customer_id=customer_id,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
