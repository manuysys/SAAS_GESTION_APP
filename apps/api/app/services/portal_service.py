import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.security import create_portal_token
from app.models import (
    Appointment,
    Customer,
    Payment,
    Quote,
    ServiceRequest,
    Tenant,
    WorkOrder,
)
from app.repositories.customer_access_tokens import (
    consume_access_token,
    create_access_token,
    revoke_customer_tokens,
)
from app.repositories.customers import create_customer
from app.repositories.service_requests import create_service_request
from app.repositories.work_orders import create_work_order_event
from app.schemas.portal import (
    PortalAppointmentResponse,
    PortalAuthResponse,
    PortalCustomerResponse,
    PortalPaymentResponse,
    PortalPublicResponse,
    PortalQuoteItemResponse,
    PortalQuoteResponse,
    PortalRequestCreate,
    PortalSettings,
    PortalSummaryResponse,
    PortalTenantResponse,
    PortalWorkOrderDetailResponse,
)
from app.services import audit_service, automation_service, email_service

_DEMO_TENANT_SLUG = "servicios-demo"


def _setting_str(raw: dict[str, object], key: str, default: str | None = None) -> str | None:
    value = raw.get(key)
    return value if isinstance(value, str) else default


async def get_public_portal(db: AsyncSession, *, tenant_slug: str) -> PortalPublicResponse:
    result = await db.execute(select(Tenant).where(Tenant.slug == tenant_slug))
    tenant = result.scalar_one_or_none()
    if tenant is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found",
        )

    raw_settings = tenant.portal_settings or {}
    portal = PortalSettings(
        display_name=_setting_str(raw_settings, "display_name") or tenant.name,
        logo_url=_setting_str(raw_settings, "logo_url"),
        primary_color=_setting_str(raw_settings, "primary_color") or "#0F766E",
        support_email=_setting_str(raw_settings, "support_email"),
        support_phone=_setting_str(raw_settings, "support_phone"),
        welcome_message=_setting_str(raw_settings, "welcome_message"),
    )
    demo_available = settings.portal_dev_mode and tenant_slug == _DEMO_TENANT_SLUG
    return PortalPublicResponse(
        tenant=PortalTenantResponse(id=tenant.id, name=tenant.name, slug=tenant.slug),
        portal=portal,
        demo_available=demo_available,
    )


async def _get_active_customer_by_email_or_phone(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    email: str | None,
    phone: str | None,
) -> Customer | None:
    or_filters = []
    if email:
        or_filters.append(Customer.email == email.lower())
    if phone:
        or_filters.append(Customer.phone == phone)
    if not or_filters:
        return None

    result = await db.execute(
        select(Customer).where(
            Customer.tenant_id == tenant_id,
            Customer.status == "active",
            Customer.deleted_at.is_(None),
            or_(*or_filters),
        )
    )
    return result.scalar_one_or_none()


async def request_magic_link(
    db: AsyncSession,
    *,
    tenant_slug: str,
    email: str | None,
    phone: str | None,
    client_ip: str | None,
) -> tuple[str, str | None]:
    result = await db.execute(select(Tenant).where(Tenant.slug == tenant_slug))
    tenant = result.scalar_one_or_none()
    if tenant is None:
        return "Si los datos coinciden, te enviamos un acceso.", None

    customer = await _get_active_customer_by_email_or_phone(
        db, tenant_id=tenant.id, email=email, phone=phone
    )

    dev_token: str | None = None
    if customer is not None:
        raw = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw.encode("utf-8")).hexdigest()
        expires_at = datetime.now(UTC) + timedelta(minutes=settings.portal_magic_ttl_minutes)
        await create_access_token(
            db,
            tenant_id=tenant.id,
            customer_id=customer.id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        await db.commit()

        if (
            settings.app_env.lower() != "production"
            and settings.portal_dev_mode
            and tenant_slug == settings.portal_dev_tenant_slug
        ):
            dev_token = raw

    return "Si los datos coinciden, te enviamos un acceso.", dev_token


def _portal_access_url(raw_token: str, tenant_slug: str) -> str:
    base = settings.app_public_url.rstrip("/")
    return f"{base}/portal/{tenant_slug}?token={raw_token}"


async def create_portal_access_for_customer(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    customer: Customer,
    created_by_user_id: UUID,
    send_email: bool,
) -> tuple[str, datetime, str]:
    raw = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    expires_at = datetime.now(UTC) + timedelta(hours=settings.portal_token_ttl_hours)
    await revoke_customer_tokens(db, tenant_id=tenant_id, customer_id=customer.id)
    # Un enlace nuevo invalida las sesiones de portal ya abiertas.
    customer.portal_access_version += 1
    await create_access_token(
        db,
        tenant_id=tenant_id,
        customer_id=customer.id,
        token_hash=token_hash,
        expires_at=expires_at,
        created_by=created_by_user_id,
        purpose="portal_access",
    )
    await db.flush()

    tenant = await db.get(Tenant, tenant_id)
    assert tenant is not None
    access_url = _portal_access_url(raw, tenant.slug)

    email_status = "not_sent"
    if send_email:
        email_result = await email_service.send_email(
            db,
            template="portal_access",
            to_email=customer.email or "",
            tenant_id=tenant_id,
            variables={
                "subject": f"Tu acceso a {tenant.name}",
                "tenant_name": tenant.name,
                "access_url": access_url,
                "expires_hours": settings.portal_token_ttl_hours,
                "customer_name": customer.name,
            },
            idempotency_key=hashlib.sha256(
                f"portal_access:{tenant_id}:{customer.id}:{raw}".encode()
            ).hexdigest(),
        )
        email_status = email_result.status

    await audit_service.record(
        db,
        action="customer_portal_access_created",
        entity_type="customer",
        entity_id=str(customer.id),
        tenant_id=tenant_id,
        actor_user_id=created_by_user_id,
        metadata={
            "send_email": send_email,
            "email_status": email_status,
        },
    )
    await db.commit()
    return access_url, expires_at, email_status


async def revoke_portal_access_for_customer(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    customer: Customer,
    revoked_by_user_id: UUID,
) -> int:
    revoked_count = await revoke_customer_tokens(db, tenant_id=tenant_id, customer_id=customer.id)
    customer.portal_access_version += 1
    await audit_service.record(
        db,
        action="customer_portal_access_revoked",
        entity_type="customer",
        entity_id=str(customer.id),
        tenant_id=tenant_id,
        actor_user_id=revoked_by_user_id,
        metadata={"revoked_count": revoked_count},
    )
    await db.commit()
    return revoked_count


async def verify_magic_link(
    db: AsyncSession,
    *,
    tenant_slug: str,
    raw_token: str,
) -> PortalAuthResponse:
    result = await db.execute(select(Tenant).where(Tenant.slug == tenant_slug))
    tenant = result.scalar_one_or_none()
    if tenant is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found",
        )

    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    access_token = await consume_access_token(db, token_hash=token_hash)

    if access_token is None or access_token.tenant_id != tenant.id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    customer = await db.get(Customer, access_token.customer_id)
    if customer is None or customer.status != "active" or customer.tenant_id != tenant.id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Customer not found or inactive",
        )

    await db.commit()
    access_token_value, expires_in = create_portal_token(
        str(customer.id), str(tenant.id), customer.portal_access_version
    )
    return _auth_response(customer, tenant, access_token_value, expires_in)


async def demo_login(db: AsyncSession, *, tenant_slug: str) -> PortalAuthResponse:
    if not settings.portal_dev_mode or tenant_slug != _DEMO_TENANT_SLUG:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Demo not available",
        )

    result = await db.execute(select(Tenant).where(Tenant.slug == tenant_slug))
    tenant = result.scalar_one_or_none()
    if tenant is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found",
        )

    customer = await _get_active_customer_by_email_or_phone(
        db, tenant_id=tenant.id, email="carlos@example.com", phone=None
    )
    if customer is None:
        customer = await create_customer(
            db,
            tenant_id=tenant.id,
            name="Carlos Gomez",
            phone="+54 11 5555-1001",
            email="carlos@example.com",
            address="Av. Siempre Viva 742",
            city="CABA",
            province="Buenos Aires",
            postal_code="1425",
            notes="Cliente demo del portal",
        )
        await db.commit()
        await db.refresh(customer)

    access_token_value, expires_in = create_portal_token(
        str(customer.id), str(tenant.id), customer.portal_access_version
    )
    return _auth_response(customer, tenant, access_token_value, expires_in)


def _auth_response(
    customer: Customer, tenant: Tenant, access_token: str, expires_in: int
) -> PortalAuthResponse:
    return PortalAuthResponse(
        access_token=access_token,
        expires_in=expires_in,
        customer=PortalCustomerResponse(
            id=customer.id,
            name=customer.name,
            email=customer.email,
            phone=customer.phone,
        ),
        tenant=PortalTenantResponse(id=tenant.id, name=tenant.name, slug=tenant.slug),
    )


async def get_customer_summary(db: AsyncSession, *, customer: Customer) -> PortalSummaryResponse:
    open_requests_count = await db.scalar(
        select(func.count())
        .select_from(ServiceRequest)
        .where(
            ServiceRequest.tenant_id == customer.tenant_id,
            ServiceRequest.customer_id == customer.id,
            ServiceRequest.status.in_(["new", "triaged"]),
        )
    )
    open_orders_count = await db.scalar(
        select(func.count())
        .select_from(WorkOrder)
        .where(
            WorkOrder.tenant_id == customer.tenant_id,
            WorkOrder.customer_id == customer.id,
            WorkOrder.operational_status.notin_(["finished", "cancelled"]),
        )
    )
    pending_quotes_count = await db.scalar(
        select(func.count())
        .select_from(Quote)
        .where(
            Quote.tenant_id == customer.tenant_id,
            Quote.customer_id == customer.id,
            Quote.status == "sent",
        )
    )
    next_appointment_result = await db.execute(
        select(Appointment)
        .where(
            Appointment.tenant_id == customer.tenant_id,
            Appointment.work_order_id.in_(
                select(WorkOrder.id).where(
                    WorkOrder.tenant_id == customer.tenant_id,
                    WorkOrder.customer_id == customer.id,
                )
            ),
            Appointment.status != "cancelled",
            Appointment.starts_at >= datetime.now(UTC),
        )
        .order_by(Appointment.starts_at.asc())
        .limit(1)
    )
    next_appointment = next_appointment_result.scalar_one_or_none()
    next_appointment_data: dict[str, object] | None = None
    if next_appointment is not None:
        next_appointment_data = {
            "id": str(next_appointment.id),
            "starts_at": next_appointment.starts_at.isoformat(),
            "ends_at": next_appointment.ends_at.isoformat(),
            "status": next_appointment.status,
        }

    return PortalSummaryResponse(
        open_requests=int(open_requests_count or 0),
        open_orders=int(open_orders_count or 0),
        pending_quotes=int(pending_quotes_count or 0),
        next_appointment=next_appointment_data,
    )


async def list_customer_requests(db: AsyncSession, *, customer: Customer) -> list[ServiceRequest]:
    result = await db.execute(
        select(ServiceRequest)
        .where(
            ServiceRequest.tenant_id == customer.tenant_id,
            ServiceRequest.customer_id == customer.id,
        )
        .order_by(ServiceRequest.requested_at.desc())
    )
    return list(result.scalars().all())


async def create_customer_request(
    db: AsyncSession,
    *,
    customer: Customer,
    payload: PortalRequestCreate,
) -> ServiceRequest:
    request = await create_service_request(
        db,
        tenant_id=customer.tenant_id,
        customer_id=customer.id,
        title=payload.title.strip(),
        description=payload.description,
        priority=payload.priority,
        source="web",
    )
    await db.commit()
    await db.refresh(request)
    return request


async def list_customer_orders(db: AsyncSession, *, customer: Customer) -> list[WorkOrder]:
    result = await db.execute(
        select(WorkOrder)
        .where(
            WorkOrder.tenant_id == customer.tenant_id,
            WorkOrder.customer_id == customer.id,
        )
        .order_by(WorkOrder.created_at.desc())
    )
    return list(result.scalars().all())


async def get_customer_order_detail(
    db: AsyncSession, *, customer: Customer, order_id: UUID
) -> PortalWorkOrderDetailResponse:
    result = await db.execute(
        select(WorkOrder)
        .where(
            WorkOrder.id == order_id,
            WorkOrder.tenant_id == customer.tenant_id,
            WorkOrder.customer_id == customer.id,
        )
        .options(selectinload(WorkOrder.appointments), selectinload(WorkOrder.quotes))
    )
    order = result.scalar_one_or_none()
    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Work order not found",
        )

    appointments = [
        PortalAppointmentResponse(
            id=a.id,
            starts_at=a.starts_at,
            ends_at=a.ends_at,
            status=a.status,
            notes=a.notes,
        )
        for a in order.appointments
        if a.status != "cancelled"
    ]
    quotes = [_quote_response(q) for q in order.quotes]

    return PortalWorkOrderDetailResponse(
        id=order.id,
        code=order.code,
        title=order.title,
        description=order.description,
        operational_status=order.operational_status,
        commercial_status=order.commercial_status,
        payment_status=order.payment_status,
        scheduled_at=order.scheduled_at,
        started_at=order.started_at,
        finished_at=order.finished_at,
        appointments=appointments,
        quotes=quotes,
        created_at=order.created_at,
    )


def _quote_response(quote: Quote) -> PortalQuoteResponse:
    return PortalQuoteResponse(
        id=quote.id,
        number=quote.number,
        status=quote.status,
        currency=quote.currency,
        subtotal=quote.subtotal,
        discount_total=quote.discount_total,
        tax_total=quote.tax_total,
        total=quote.total,
        valid_until=quote.valid_until,
        sent_at=quote.sent_at,
        items=[
            PortalQuoteItemResponse(
                description=item.description,
                quantity=item.quantity,
                unit_price=item.unit_price,
                discount_rate=item.discount_rate,
                tax_rate=item.tax_rate,
                line_total=item.line_total,
            )
            for item in quote.items
        ],
    )


async def list_customer_quotes(db: AsyncSession, *, customer: Customer) -> list[Quote]:
    result = await db.execute(
        select(Quote)
        .where(
            Quote.tenant_id == customer.tenant_id,
            Quote.customer_id == customer.id,
        )
        .order_by(Quote.created_at.desc())
        .options(selectinload(Quote.items))
    )
    return list(result.scalars().all())


async def _get_customer_quote(db: AsyncSession, *, customer: Customer, quote_id: UUID) -> Quote:
    result = await db.execute(
        select(Quote)
        .where(
            Quote.id == quote_id,
            Quote.tenant_id == customer.tenant_id,
            Quote.customer_id == customer.id,
        )
        .options(selectinload(Quote.items))
    )
    quote = result.scalar_one_or_none()
    if quote is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quote not found",
        )
    return quote


def _ensure_quote_not_expired(quote: Quote) -> None:
    if quote.valid_until is None:
        return
    valid_until = quote.valid_until
    if valid_until.tzinfo is None:
        valid_until = valid_until.replace(tzinfo=UTC)
    today_ar = datetime.now(ZoneInfo("America/Argentina/Buenos_Aires")).date()
    if valid_until.date() < today_ar:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Quote expired",
        )


def _quote_event_payload(quote: Quote) -> dict[str, object]:
    return {
        "quote_id": str(quote.id),
        "number": quote.number,
        "work_order_id": str(quote.work_order_id) if quote.work_order_id else None,
        "customer_id": str(quote.customer_id),
        "total": str(quote.total),
    }


async def approve_customer_quote(
    db: AsyncSession,
    *,
    customer: Customer,
    quote_id: UUID,
) -> PortalQuoteResponse:
    quote = await _get_customer_quote(db, customer=customer, quote_id=quote_id)
    _ensure_quote_not_expired(quote)
    if quote.status != "sent":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Quote must be sent to be approved",
        )

    quote.status = "approved"
    quote.approved_at = datetime.now(UTC)
    if quote.work_order_id is not None:
        order = await db.get(WorkOrder, quote.work_order_id)
        if order is not None and order.commercial_status != "approved":
            order.commercial_status = "approved"

    if quote.work_order_id is not None:
        await create_work_order_event(
            db,
            tenant_id=customer.tenant_id,
            work_order_id=quote.work_order_id,
            event_type="quote_approved_by_customer",
            from_status=None,
            to_status=None,
            actor_user_id=None,
            payload={"quote_id": str(quote.id), "number": quote.number},
        )
    await audit_service.record(
        db,
        action="quote_approved_by_customer",
        entity_type="quote",
        entity_id=str(quote.id),
        tenant_id=customer.tenant_id,
        metadata={"number": quote.number, "customer_id": str(customer.id)},
    )
    await automation_service.emit_event(
        db,
        tenant_id=quote.tenant_id,
        event_type="quote_approved",
        payload=_quote_event_payload(quote),
    )
    await db.commit()
    await db.refresh(quote)
    return _quote_response(quote)


async def reject_customer_quote(
    db: AsyncSession,
    *,
    customer: Customer,
    quote_id: UUID,
) -> PortalQuoteResponse:
    quote = await _get_customer_quote(db, customer=customer, quote_id=quote_id)
    _ensure_quote_not_expired(quote)
    if quote.status != "sent":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Quote must be sent to be rejected",
        )

    quote.status = "rejected"
    quote.rejected_at = datetime.now(UTC)
    if quote.work_order_id is not None:
        order = await db.get(WorkOrder, quote.work_order_id)
        if order is not None and order.commercial_status != "approved":
            order.commercial_status = "rejected"

    if quote.work_order_id is not None:
        await create_work_order_event(
            db,
            tenant_id=customer.tenant_id,
            work_order_id=quote.work_order_id,
            event_type="quote_rejected_by_customer",
            from_status=None,
            to_status=None,
            actor_user_id=None,
            payload={"quote_id": str(quote.id), "number": quote.number},
        )
    await audit_service.record(
        db,
        action="quote_rejected_by_customer",
        entity_type="quote",
        entity_id=str(quote.id),
        tenant_id=customer.tenant_id,
        metadata={"number": quote.number, "customer_id": str(customer.id)},
    )
    await automation_service.emit_event(
        db,
        tenant_id=quote.tenant_id,
        event_type="quote_rejected",
        payload=_quote_event_payload(quote),
    )
    await db.commit()
    await db.refresh(quote)
    return _quote_response(quote)


async def list_customer_appointments(
    db: AsyncSession, *, customer: Customer
) -> list[PortalAppointmentResponse]:
    result = await db.execute(
        select(Appointment)
        .join(WorkOrder, Appointment.work_order_id == WorkOrder.id)
        .where(
            Appointment.tenant_id == customer.tenant_id,
            WorkOrder.customer_id == customer.id,
            Appointment.status != "cancelled",
        )
        .order_by(Appointment.starts_at.desc())
    )
    return [
        PortalAppointmentResponse(
            id=a.id,
            starts_at=a.starts_at,
            ends_at=a.ends_at,
            status=a.status,
            notes=a.notes,
        )
        for a in result.scalars().all()
    ]


async def list_customer_payments(
    db: AsyncSession, *, customer: Customer
) -> list[PortalPaymentResponse]:
    result = await db.execute(
        select(Payment)
        .join(WorkOrder, Payment.work_order_id == WorkOrder.id)
        .where(
            Payment.tenant_id == customer.tenant_id,
            WorkOrder.customer_id == customer.id,
        )
        .order_by(Payment.paid_at.desc())
    )
    return [
        PortalPaymentResponse(
            id=p.id,
            amount=p.amount,
            currency=p.currency,
            method=p.method,
            status=p.status,
            paid_at=p.paid_at,
        )
        for p in result.scalars().all()
    ]


async def get_portal_settings(db: AsyncSession, *, tenant_id: UUID) -> dict[str, Any]:
    tenant = await db.get(Tenant, tenant_id)
    if tenant is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found",
        )
    return tenant.portal_settings or {}


async def update_portal_settings(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    settings_data: dict[str, Any],
) -> dict[str, Any]:
    tenant = await db.get(Tenant, tenant_id)
    if tenant is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found",
        )

    allowed = {
        "display_name",
        "logo_url",
        "primary_color",
        "support_email",
        "support_phone",
        "welcome_message",
    }
    merged = (tenant.portal_settings or {}).copy()
    for key, value in settings_data.items():
        if key in allowed:
            merged[key] = value
    tenant.portal_settings = merged
    await db.commit()
    await db.refresh(tenant)
    return tenant.portal_settings or {}
