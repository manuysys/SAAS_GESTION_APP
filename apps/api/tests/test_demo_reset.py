from __future__ import annotations

from uuid import UUID, uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    AuditLog,
    Customer,
    EmailDelivery,
    ImportJob,
    Membership,
    Notification,
    ServiceRequest,
    Tenant,
    User,
    WhatsAppMessage,
    WorkOrder,
)


async def _register(client: AsyncClient, email: str, company: str) -> tuple[str, str]:
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "super-secret-123",
            "full_name": "Test User",
            "company_name": company,
        },
    )
    assert response.status_code == 201, response.text
    body = response.json()
    return body["access_token"], body["tenants"][0]["id"]


async def _login(client: AsyncClient, email: str) -> tuple[str, str]:
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "super-secret-123"},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    return body["access_token"], body["tenants"][0]["id"]


def _headers(token: str, tenant_id: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}", "X-Tenant-ID": tenant_id}


@pytest.fixture
async def platform_admin(
    client: AsyncClient,
    db_session: AsyncSession,
) -> tuple[str, str, str]:
    """Devuelve (token, auth_tenant_id, demo_tenant_id). El usuario es técnico demo."""
    token, auth_tenant_id = await _register(client, "founder-demo@example.com", "SaaS HQ")
    user = await db_session.scalar(select(User).where(User.email == "founder-demo@example.com"))
    assert user is not None
    user.is_platform_admin = True

    demo_tenant = Tenant(name="Servicios Demo", slug="servicios-demo")
    db_session.add(demo_tenant)
    await db_session.flush()

    membership = Membership(
        tenant_id=demo_tenant.id,
        user_id=user.id,
        role="technician",
        status="active",
    )
    db_session.add(membership)
    await db_session.commit()

    token, _ = await _login(client, "founder-demo@example.com")
    return token, auth_tenant_id, str(demo_tenant.id)


async def test_platform_admin_can_reset_demo(
    client: AsyncClient, platform_admin: tuple[str, str, str]
) -> None:
    token, auth_tenant_id, demo_tenant_id = platform_admin

    response = await client.post(
        "/api/v1/admin/demo/reset", headers=_headers(token, auth_tenant_id)
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["tenant_id"] == demo_tenant_id
    assert body["counts"]["customers"] == 3
    assert body["counts"]["service_requests"] == 2
    assert body["counts"]["work_orders"] == 2
    assert body["counts"]["quotes"] == 1
    assert body["counts"]["appointments"] == 1
    assert body["counts"]["payments"] == 1


async def test_reset_demo_seed_states_are_coherent(
    client: AsyncClient,
    db_session: AsyncSession,
    platform_admin: tuple[str, str, str],
) -> None:
    token, auth_tenant_id, demo_tenant_id = platform_admin

    response = await client.post(
        "/api/v1/admin/demo/reset", headers=_headers(token, auth_tenant_id)
    )
    assert response.status_code == 200, response.text

    service_request = await db_session.scalar(
        select(ServiceRequest).where(ServiceRequest.tenant_id == UUID(demo_tenant_id))
    )
    assert service_request is not None
    assert service_request.status == "converted"

    work_order = await db_session.scalar(
        select(WorkOrder).where(
            WorkOrder.tenant_id == UUID(demo_tenant_id),
            WorkOrder.service_request_id == service_request.id,
        )
    )
    assert work_order is not None
    assert work_order.commercial_status == "sent"
    assert work_order.payment_status == "partial"


async def test_common_user_cannot_reset_demo(
    client: AsyncClient,
) -> None:
    token, tenant_id = await _register(client, "regular@example.com", "Regular Tenant")
    response = await client.post("/api/v1/admin/demo/reset", headers=_headers(token, tenant_id))
    assert response.status_code == 403, response.text


async def test_reset_demo_returns_404_when_tenant_missing(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    token, _tenant_id = await _register(client, "founder-nodemo@example.com", "SaaS No Demo")
    user = await db_session.scalar(select(User).where(User.email == "founder-nodemo@example.com"))
    assert user is not None
    user.is_platform_admin = True
    await db_session.commit()

    response = await client.post(
        "/api/v1/admin/demo/reset",
        headers=_headers(token, _tenant_id),
    )
    assert response.status_code == 404, response.text


async def test_reset_demo_does_not_touch_other_tenant(
    client: AsyncClient,
    db_session: AsyncSession,
    platform_admin: tuple[str, str, str],
) -> None:
    token, auth_tenant_id, _demo_tenant_id = platform_admin

    _other_token, other_tenant_id = await _register(
        client, "owner-other@example.com", "Other Tenant"
    )
    await db_session.scalar(select(User).where(User.email == "owner-other@example.com"))
    other_customer = Customer(
        tenant_id=other_tenant_id,
        name="Cliente Otro Tenant",
        email="cliente@other.example.com",
    )
    db_session.add(other_customer)
    await db_session.commit()

    await client.post("/api/v1/admin/demo/reset", headers=_headers(token, auth_tenant_id))

    other_count = await db_session.scalar(
        select(func.count()).select_from(Customer).where(Customer.tenant_id == other_tenant_id)
    )
    assert other_count == 1


async def test_reset_demo_is_idempotent(
    client: AsyncClient,
    db_session: AsyncSession,
    platform_admin: tuple[str, str, str],
) -> None:
    token, auth_tenant_id, demo_tenant_id = platform_admin

    first = await client.post("/api/v1/admin/demo/reset", headers=_headers(token, auth_tenant_id))
    assert first.status_code == 200, first.text

    second = await client.post("/api/v1/admin/demo/reset", headers=_headers(token, auth_tenant_id))
    assert second.status_code == 200, second.text

    assert first.json()["counts"] == second.json()["counts"]

    demo_customer_count = await db_session.scalar(
        select(func.count()).select_from(Customer).where(Customer.tenant_id == demo_tenant_id)
    )
    assert demo_customer_count == 3


async def test_reset_demo_clears_import_jobs_notifications_messages_and_emails(
    client: AsyncClient,
    db_session: AsyncSession,
    platform_admin: tuple[str, str, str],
) -> None:
    token, auth_tenant_id, demo_tenant_id = platform_admin

    db_session.add(
        ImportJob(
            tenant_id=UUID(demo_tenant_id),
            created_by=None,
            file_name="demo.csv",
            status="preview",
        )
    )
    db_session.add(
        Notification(
            tenant_id=UUID(demo_tenant_id),
            user_id=None,
            title="Demo",
            message="Demo notification",
            type="info",
        )
    )
    db_session.add(
        WhatsAppMessage(
            tenant_id=UUID(demo_tenant_id),
            direction="outbound",
            from_phone="+54110000001",
            to_phone="+54110000002",
            message_type="text",
            body="Demo",
        )
    )
    db_session.add(
        EmailDelivery(
            tenant_id=UUID(demo_tenant_id),
            to_email="demo@example.com",
            template="demo",
            subject="Demo",
            status="queued",
            provider="console",
            idempotency_key=str(uuid4()),
        )
    )
    await db_session.commit()

    await client.post("/api/v1/admin/demo/reset", headers=_headers(token, auth_tenant_id))

    for model in (ImportJob, Notification, WhatsAppMessage, EmailDelivery):
        count = await db_session.scalar(
            select(func.count()).select_from(model).where(model.tenant_id == demo_tenant_id)
        )
        assert count == 0


async def test_reset_demo_clears_onboarding_state(
    client: AsyncClient,
    db_session: AsyncSession,
    platform_admin: tuple[str, str, str],
) -> None:
    token, auth_tenant_id, demo_tenant_id = platform_admin

    tenant = await db_session.get(Tenant, UUID(demo_tenant_id))
    assert tenant is not None
    tenant.onboarding_state = {"completed": True, "step": 4}
    await db_session.commit()

    response = await client.post(
        "/api/v1/admin/demo/reset", headers=_headers(token, auth_tenant_id)
    )
    assert response.status_code == 200, response.text

    await db_session.refresh(tenant)
    assert tenant.onboarding_state is None


async def test_reset_demo_preserves_audit_logs(
    client: AsyncClient,
    db_session: AsyncSession,
    platform_admin: tuple[str, str, str],
) -> None:
    token, auth_tenant_id, demo_tenant_id = platform_admin

    db_session.add(
        AuditLog(
            tenant_id=UUID(demo_tenant_id),
            action="demo_action",
            entity_type="tenant",
            entity_id=demo_tenant_id,
        )
    )
    await db_session.commit()

    await client.post("/api/v1/admin/demo/reset", headers=_headers(token, auth_tenant_id))

    audit_count = await db_session.scalar(
        select(func.count()).select_from(AuditLog).where(AuditLog.tenant_id == demo_tenant_id)
    )
    assert audit_count is not None and audit_count >= 1


async def test_reset_demo_does_not_assign_actor_unless_technician_member(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    demo_tenant = Tenant(name="Servicios Demo", slug="servicios-demo")
    db_session.add(demo_tenant)
    await db_session.commit()

    token, auth_tenant_id = await _register(client, "foreign-founder@example.com", "SaaS Foreign")
    user = await db_session.scalar(select(User).where(User.email == "foreign-founder@example.com"))
    assert user is not None
    user.is_platform_admin = True
    await db_session.commit()
    token, _ = await _login(client, "foreign-founder@example.com")

    response = await client.post(
        "/api/v1/admin/demo/reset", headers=_headers(token, auth_tenant_id)
    )
    assert response.status_code == 200, response.text
    # El actor ajeno no se asigna a la orden, pero el seed garantiza un turno futuro.
    assert response.json()["counts"]["appointments"] == 1

    work_orders = await db_session.scalars(
        select(WorkOrder).where(WorkOrder.assigned_user_id.is_not(None))
    )
    assert work_orders.all() == []


async def test_reset_demo_records_ip_in_audit(
    client: AsyncClient,
    db_session: AsyncSession,
    platform_admin: tuple[str, str, str],
) -> None:
    token, auth_tenant_id, demo_tenant_id = platform_admin

    headers = _headers(token, auth_tenant_id)
    headers["X-Real-IP"] = "203.0.113.42"
    response = await client.post("/api/v1/admin/demo/reset", headers=headers)
    assert response.status_code == 200, response.text

    log = await db_session.scalar(
        select(AuditLog)
        .where(AuditLog.tenant_id == demo_tenant_id, AuditLog.action == "demo_reset")
        .order_by(AuditLog.created_at.desc())
    )
    assert log is not None
    assert log.ip_hash is not None
