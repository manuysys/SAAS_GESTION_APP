from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Plan, Subscription, User


@pytest.fixture
async def plans_fixture(db_session: AsyncSession) -> list[Plan]:
    plans = [
        Plan(
            code="starter",
            name="Starter",
            price_ars=Decimal("10000.00"),
            billing_period="monthly",
            limits={"users": 1, "technicians": 1, "orders_per_month": 100},
            active=True,
        ),
        Plan(
            code="professional",
            name="Professional",
            price_ars=Decimal("25000.00"),
            billing_period="monthly",
            limits={"users": 5, "technicians": 5, "orders_per_month": 1000},
            active=True,
        ),
        Plan(
            code="business",
            name="Business",
            price_ars=Decimal("60000.00"),
            billing_period="monthly",
            limits={"users": 20, "technicians": 20, "orders_per_month": 10000},
            active=True,
        ),
    ]
    for plan in plans:
        db_session.add(plan)
    await db_session.commit()
    return plans


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


def _headers(token: str, tenant_id: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}", "X-Tenant-ID": tenant_id}


async def test_list_plans_returns_three(client: AsyncClient, plans_fixture: list[Plan]) -> None:
    token, tenant_id = await _register(client, "owner-plans@example.com", "Empresa Plans")
    response = await client.get("/api/v1/plans", headers=_headers(token, tenant_id))
    assert response.status_code == 200, response.text
    body = response.json()
    assert len(body) == 3
    codes = {plan["code"] for plan in body}
    assert codes == {"starter", "professional", "business"}


async def test_register_creates_trial_subscription(
    client: AsyncClient,
    db_session: AsyncSession,
    plans_fixture: list[Plan],
) -> None:
    token, tenant_id = await _register(client, "owner-trial@example.com", "Empresa Trial")

    result = await db_session.execute(
        select(Subscription).where(Subscription.tenant_id == tenant_id)
    )
    subscription = result.scalar_one()
    assert subscription.status == "trialing"
    assert subscription.price_snapshot == Decimal("10000.00")
    assert subscription.current_period_end is not None
    assert subscription.started_at is not None

    response = await client.get("/api/v1/subscription", headers=_headers(token, tenant_id))
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["subscription"]["status"] == "trialing"
    assert body["subscription"]["plan"]["code"] == "starter"


async def test_register_without_plans_does_not_fail(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    token, tenant_id = await _register(client, "owner-noplans@example.com", "Empresa No Plans")

    result = await db_session.execute(
        select(Subscription).where(Subscription.tenant_id == tenant_id)
    )
    assert result.scalar_one_or_none() is None

    response = await client.get("/api/v1/subscription", headers=_headers(token, tenant_id))
    assert response.status_code == 404


async def test_change_subscription_updates_price_snapshot(
    client: AsyncClient,
    db_session: AsyncSession,
    plans_fixture: list[Plan],
) -> None:
    token, tenant_id = await _register(client, "owner-change@example.com", "Empresa Change")

    change = await client.post(
        "/api/v1/subscription/change",
        json={"plan_code": "professional"},
        headers=_headers(token, tenant_id),
    )
    assert change.status_code == 200, change.text
    body = change.json()
    assert body["subscription"]["plan"]["code"] == "professional"
    assert Decimal(body["subscription"]["price_snapshot"]) == Decimal("25000.00")

    result = await db_session.execute(
        select(Subscription).where(Subscription.tenant_id == tenant_id)
    )
    subscription = result.scalar_one()
    assert subscription.price_snapshot == Decimal("25000.00")


async def test_technician_cannot_change_plan(
    client: AsyncClient,
    db_session: AsyncSession,
    plans_fixture: list[Plan],
) -> None:
    _owner_token, tenant_id = await _register(client, "owner-tech@example.com", "Empresa Tech")

    tech_response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "tech-user@example.com",
            "password": "super-secret-123",
            "full_name": "Tech User",
            "company_name": "Empresa Tech 2",
        },
    )
    assert tech_response.status_code == 201, tech_response.text
    tech_token = tech_response.json()["access_token"]

    result = await db_session.execute(select(User).where(User.email == "tech-user@example.com"))
    tech_user = result.scalar_one()
    tech_user_id = tech_user.id

    from app.models import Membership

    result = await db_session.execute(
        select(Membership).where(
            Membership.tenant_id == tenant_id, Membership.user_id == tech_user_id
        )
    )
    membership = result.scalar_one_or_none()
    if membership is None:
        membership = Membership(tenant_id=tenant_id, user_id=tech_user_id, role="technician")
        db_session.add(membership)
    else:
        membership.role = "technician"
    await db_session.commit()

    change = await client.post(
        "/api/v1/subscription/change",
        json={"plan_code": "business"},
        headers=_headers(tech_token, tenant_id),
    )
    assert change.status_code == 403


async def test_admin_endpoints_require_platform_admin(
    client: AsyncClient, plans_fixture: list[Plan]
) -> None:
    token, tenant_id = await _register(client, "owner-normal@example.com", "Empresa Normal")

    tenants = await client.get("/api/v1/admin/tenants", headers=_headers(token, tenant_id))
    assert tenants.status_code == 403

    metrics = await client.get("/api/v1/admin/metrics", headers=_headers(token, tenant_id))
    assert metrics.status_code == 403

    update = await client.post(
        f"/api/v1/admin/tenants/{tenant_id}/subscription",
        json={"plan_code": "business", "status": "active"},
        headers=_headers(token, tenant_id),
    )
    assert update.status_code == 403


async def test_admin_metrics_return_mrr(
    client: AsyncClient,
    db_session: AsyncSession,
    plans_fixture: list[Plan],
) -> None:
    _, tenant_id_a = await _register(client, "owner-admin-a@example.com", "Empresa Admin A")
    _, _tenant_id_b = await _register(client, "owner-admin-b@example.com", "Empresa Admin B")

    result = await db_session.execute(select(User).where(User.email == "owner-admin-a@example.com"))
    user_a = result.scalar_one()
    user_a.is_platform_admin = True
    await db_session.commit()

    token_response = await client.post(
        "/api/v1/auth/login",
        json={"email": "owner-admin-a@example.com", "password": "super-secret-123"},
    )
    assert token_response.status_code == 200, token_response.text
    owner_token = token_response.json()["access_token"]

    await client.post(
        f"/api/v1/admin/tenants/{tenant_id_a}/subscription",
        json={"plan_code": "professional", "status": "active"},
        headers=_headers(owner_token, tenant_id_a),
    )

    response = await client.get("/api/v1/admin/metrics", headers=_headers(owner_token, tenant_id_a))
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["tenants_total"] >= 2
    assert body["active_subscriptions"] == 1
    assert body["trialing_subscriptions"] >= 1
    assert Decimal(body["mrr_ars"]) == Decimal("25000.00")


async def test_admin_list_tenants_isolated(
    client: AsyncClient,
    db_session: AsyncSession,
    plans_fixture: list[Plan],
) -> None:
    _, tenant_id_a = await _register(client, "owner-list-a@example.com", "Empresa List A")
    _, _tenant_id_b = await _register(client, "owner-list-b@example.com", "Empresa List B")

    result = await db_session.execute(select(User).where(User.email == "owner-list-a@example.com"))
    user_a = result.scalar_one()
    user_a.is_platform_admin = True
    await db_session.commit()

    token_a = (
        await client.post(
            "/api/v1/auth/login",
            json={"email": "owner-list-a@example.com", "password": "super-secret-123"},
        )
    ).json()["access_token"]

    response = await client.get("/api/v1/admin/tenants", headers=_headers(token_a, tenant_id_a))
    assert response.status_code == 200, response.text
    body = response.json()
    tenant_ids = {item["id"] for item in body["items"]}
    assert tenant_id_a in tenant_ids
    assert _tenant_id_b in tenant_ids
