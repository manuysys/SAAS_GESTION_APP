from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_client_ip, require_roles
from app.core.db import get_db
from app.models import Membership
from app.schemas.payment import (
    PaymentCreate,
    PaymentListResponse,
    PaymentResponse,
)
from app.services import audit_service, payment_service

router = APIRouter(prefix="/payments", tags=["payments"])

READ_WRITE_ROLES = ("owner", "admin", "dispatcher")


@router.get("", response_model=PaymentListResponse)
async def list_payments(
    work_order_id: UUID | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    membership: Membership = Depends(require_roles(*READ_WRITE_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> PaymentListResponse:
    items, total = await payment_service.list_tenant_payments(
        db,
        tenant_id=membership.tenant_id,
        work_order_id=work_order_id,
        limit=limit,
        offset=offset,
    )
    return PaymentListResponse(
        items=[PaymentResponse.model_validate(item) for item in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post("", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
async def create_payment(
    payload: PaymentCreate,
    request: Request,
    membership: Membership = Depends(require_roles(*READ_WRITE_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> PaymentResponse:
    payment = await payment_service.create_tenant_payment(
        db,
        tenant_id=membership.tenant_id,
        payload=payload,
    )
    await audit_service.record(
        db,
        action="payment_created",
        entity_type="payment",
        entity_id=str(payment.id),
        tenant_id=membership.tenant_id,
        actor_user_id=membership.user_id,
        metadata={
            "amount": str(payment.amount),
            "method": payment.method,
            "work_order_id": str(payment.work_order_id),
        },
        ip=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    await db.commit()
    return PaymentResponse.model_validate(payment)


@router.post("/{payment_id}/void", response_model=PaymentResponse)
async def void_payment(
    payment_id: UUID,
    request: Request,
    membership: Membership = Depends(require_roles(*READ_WRITE_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> PaymentResponse:
    payment = await payment_service.void_tenant_payment(
        db,
        tenant_id=membership.tenant_id,
        payment_id=payment_id,
    )
    await audit_service.record(
        db,
        action="payment_voided",
        entity_type="payment",
        entity_id=str(payment.id),
        tenant_id=membership.tenant_id,
        actor_user_id=membership.user_id,
        metadata={"work_order_id": str(payment.work_order_id)},
        ip=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    await db.commit()
    return PaymentResponse.model_validate(payment)
