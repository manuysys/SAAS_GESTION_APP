from uuid import UUID

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import (
    get_client_ip,
    require_customer_tenant_slug,
    require_roles,
)
from app.core.config import settings
from app.core.db import get_db
from app.models import Customer, Membership, Tenant
from app.schemas.portal import (
    PortalAuthRequest,
    PortalAuthRequestResponse,
    PortalAuthResponse,
    PortalAuthVerifyRequest,
    PortalCustomerResponse,
    PortalPaymentResponse,
    PortalPublicResponse,
    PortalQuoteResponse,
    PortalRequestCreate,
    PortalServiceRequestResponse,
    PortalSettings,
    PortalSummaryResponse,
    PortalWorkOrderDetailResponse,
    PortalWorkOrderResponse,
)
from app.services import portal_service, security_service

router = APIRouter(prefix="/portal", tags=["portal"])
WRITE_ROLES = ("owner", "admin")


@router.get("/tenants/portal-settings", response_model=PortalSettings)
async def get_tenant_portal_settings(
    membership: Membership = Depends(require_roles(*WRITE_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> PortalSettings:
    raw = await portal_service.get_portal_settings(db, tenant_id=membership.tenant_id)
    return PortalSettings.model_validate(raw)


@router.put("/tenants/portal-settings", response_model=PortalSettings)
async def update_tenant_portal_settings(
    payload: PortalSettings,
    membership: Membership = Depends(require_roles(*WRITE_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> PortalSettings:
    raw = await portal_service.update_portal_settings(
        db,
        tenant_id=membership.tenant_id,
        settings_data=payload.model_dump(exclude_unset=True),
    )
    return PortalSettings.model_validate(raw)


@router.get("/{tenant_slug}", response_model=PortalPublicResponse)
async def get_public_portal(
    tenant_slug: str,
    db: AsyncSession = Depends(get_db),
) -> PortalPublicResponse:
    return await portal_service.get_public_portal(db, tenant_slug=tenant_slug)


@router.post("/{tenant_slug}/auth/request", response_model=PortalAuthRequestResponse)
async def request_magic_link(
    tenant_slug: str,
    payload: PortalAuthRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> PortalAuthRequestResponse:
    await security_service.check_rate_limit(
        db,
        request,
        scope="portal-auth",
        limit=settings.rate_limit_auth_per_minute,
    )
    message, dev_token = await portal_service.request_magic_link(
        db,
        tenant_slug=tenant_slug,
        email=str(payload.email).lower() if payload.email else None,
        phone=payload.phone,
        client_ip=get_client_ip(request),
    )
    return PortalAuthRequestResponse(message=message, dev_token=dev_token)


@router.post("/{tenant_slug}/auth/verify", response_model=PortalAuthResponse)
async def verify_magic_link(
    tenant_slug: str,
    payload: PortalAuthVerifyRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> PortalAuthResponse:
    await security_service.check_rate_limit(
        db,
        request,
        scope="portal-auth",
        limit=settings.rate_limit_auth_per_minute,
    )
    return await portal_service.verify_magic_link(
        db, tenant_slug=tenant_slug, raw_token=payload.token
    )


@router.post("/{tenant_slug}/auth/demo", response_model=PortalAuthResponse)
async def demo_login(
    tenant_slug: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> PortalAuthResponse:
    await security_service.check_rate_limit(
        db,
        request,
        scope="portal-auth",
        limit=settings.rate_limit_auth_per_minute,
    )
    return await portal_service.demo_login(db, tenant_slug=tenant_slug)


@router.get("/{tenant_slug}/me", response_model=PortalCustomerResponse)
async def get_me(
    customer_tenant: tuple[Customer, Tenant] = Depends(require_customer_tenant_slug),
) -> PortalCustomerResponse:
    customer, _tenant = customer_tenant
    return PortalCustomerResponse(
        id=customer.id,
        name=customer.name,
        email=customer.email,
        phone=customer.phone,
    )


@router.get("/{tenant_slug}/summary", response_model=PortalSummaryResponse)
async def get_summary(
    customer_tenant: tuple[Customer, Tenant] = Depends(require_customer_tenant_slug),
    db: AsyncSession = Depends(get_db),
) -> PortalSummaryResponse:
    customer, _tenant = customer_tenant
    return await portal_service.get_customer_summary(db, customer=customer)


@router.get("/{tenant_slug}/requests", response_model=list[PortalServiceRequestResponse])
async def list_requests(
    customer_tenant: tuple[Customer, Tenant] = Depends(require_customer_tenant_slug),
    db: AsyncSession = Depends(get_db),
) -> list[PortalServiceRequestResponse]:
    customer, _tenant = customer_tenant
    items = await portal_service.list_customer_requests(db, customer=customer)
    return [PortalServiceRequestResponse.model_validate(item) for item in items]


@router.post(
    "/{tenant_slug}/requests",
    response_model=PortalServiceRequestResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_request(
    payload: PortalRequestCreate,
    customer_tenant: tuple[Customer, Tenant] = Depends(require_customer_tenant_slug),
    db: AsyncSession = Depends(get_db),
) -> PortalServiceRequestResponse:
    customer, _tenant = customer_tenant
    request = await portal_service.create_customer_request(db, customer=customer, payload=payload)
    return PortalServiceRequestResponse.model_validate(request)


@router.get("/{tenant_slug}/orders", response_model=list[PortalWorkOrderResponse])
async def list_orders(
    customer_tenant: tuple[Customer, Tenant] = Depends(require_customer_tenant_slug),
    db: AsyncSession = Depends(get_db),
) -> list[PortalWorkOrderResponse]:
    customer, _tenant = customer_tenant
    items = await portal_service.list_customer_orders(db, customer=customer)
    return [PortalWorkOrderResponse.model_validate(item) for item in items]


@router.get("/{tenant_slug}/orders/{order_id}", response_model=PortalWorkOrderDetailResponse)
async def get_order(
    order_id: UUID,
    customer_tenant: tuple[Customer, Tenant] = Depends(require_customer_tenant_slug),
    db: AsyncSession = Depends(get_db),
) -> PortalWorkOrderDetailResponse:
    customer, _tenant = customer_tenant
    return await portal_service.get_customer_order_detail(db, customer=customer, order_id=order_id)


@router.get("/{tenant_slug}/quotes", response_model=list[PortalQuoteResponse])
async def list_quotes(
    customer_tenant: tuple[Customer, Tenant] = Depends(require_customer_tenant_slug),
    db: AsyncSession = Depends(get_db),
) -> list[PortalQuoteResponse]:
    customer, _tenant = customer_tenant
    items = await portal_service.list_customer_quotes(db, customer=customer)
    return [portal_service._quote_response(q) for q in items]


@router.post("/{tenant_slug}/quotes/{quote_id}/approve", response_model=PortalQuoteResponse)
async def approve_quote(
    quote_id: UUID,
    customer_tenant: tuple[Customer, Tenant] = Depends(require_customer_tenant_slug),
    db: AsyncSession = Depends(get_db),
) -> PortalQuoteResponse:
    customer, _tenant = customer_tenant
    return await portal_service.approve_customer_quote(db, customer=customer, quote_id=quote_id)


@router.post("/{tenant_slug}/quotes/{quote_id}/reject", response_model=PortalQuoteResponse)
async def reject_quote(
    quote_id: UUID,
    customer_tenant: tuple[Customer, Tenant] = Depends(require_customer_tenant_slug),
    db: AsyncSession = Depends(get_db),
) -> PortalQuoteResponse:
    customer, _tenant = customer_tenant
    return await portal_service.reject_customer_quote(db, customer=customer, quote_id=quote_id)


@router.get("/{tenant_slug}/appointments")
async def list_appointments(
    customer_tenant: tuple[Customer, Tenant] = Depends(require_customer_tenant_slug),
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, object]]:
    customer, _tenant = customer_tenant
    items = await portal_service.list_customer_appointments(db, customer=customer)
    return [item.model_dump() for item in items]


@router.get("/{tenant_slug}/payments", response_model=list[PortalPaymentResponse])
async def list_payments(
    customer_tenant: tuple[Customer, Tenant] = Depends(require_customer_tenant_slug),
    db: AsyncSession = Depends(get_db),
) -> list[PortalPaymentResponse]:
    customer, _tenant = customer_tenant
    items = await portal_service.list_customer_payments(db, customer=customer)
    return [PortalPaymentResponse.model_validate(item) for item in items]
