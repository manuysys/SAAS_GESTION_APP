from datetime import datetime, timedelta
from decimal import Decimal
from uuid import UUID
from zoneinfo import ZoneInfo

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Membership

CUSTOMER = {
    "name": "Cliente Dashboard",
    "phone": "+54 11 5555-5000",
    "email": "dashboard@example.com",
}


async def _register(client: AsyncClient, email: str, company: str) -> tuple[str, str, str]:
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
    token = body["access_token"]
    tenant_id = body["tenants"][0]["id"]
    me = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}", "X-Tenant-ID": tenant_id},
    )
    assert me.status_code == 200, me.text
    return token, tenant_id, me.json()["user"]["id"]


def _headers(token: str, tenant_id: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}", "X-Tenant-ID": tenant_id}


async def _create_customer(client: AsyncClient, token: str, tenant_id: str) -> str:
    response = await client.post(
        "/api/v1/customers", json=CUSTOMER, headers=_headers(token, tenant_id)
    )
    assert response.status_code == 201, response.text
    return response.json()["id"]


async def _create_work_order(
    client: AsyncClient, token: str, tenant_id: str, customer_id: str
) -> str:
    response = await client.post(
        "/api/v1/work-orders",
        json={"customer_id": customer_id, "title": "Orden de prueba"},
        headers=_headers(token, tenant_id),
    )
    assert response.status_code == 201, response.text
    return response.json()["id"]


async def _add_technician(db_session: AsyncSession, tenant_id: str, user_id: str) -> None:
    db_session.add(
        Membership(
            tenant_id=UUID(tenant_id),
            user_id=UUID(user_id),
            role="technician",
        )
    )
    await db_session.commit()


async def test_dashboard_summary_returns_counts(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    owner_token, tenant_id, _ = await _register(client, "owner-dash@example.com", "Empresa Dash")
    _tech_token, _, tech_user_id = await _register(client, "tech-dash@example.com", "Tech Dash")
    await _add_technician(db_session, tenant_id, tech_user_id)
    customer_id = await _create_customer(client, owner_token, tenant_id)
    work_order_id = await _create_work_order(client, owner_token, tenant_id, customer_id)

    response = await client.get(
        "/api/v1/dashboard/summary", headers=_headers(owner_token, tenant_id)
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["customers_total"] == 1
    assert body["work_orders_total"] == 1
    assert body["work_orders_open"] == 1
    assert body["pending_balance"] == "0.00"
    assert body["appointments_today"] == 0

    start = datetime.now(ZoneInfo("America/Argentina/Buenos_Aires")).replace(
        hour=12, minute=0, second=0, microsecond=0
    )
    appointment = await client.post(
        "/api/v1/appointments",
        json={
            "work_order_id": work_order_id,
            "technician_id": tech_user_id,
            "starts_at": start.isoformat(),
            "ends_at": (start + timedelta(hours=1)).isoformat(),
        },
        headers=_headers(owner_token, tenant_id),
    )
    assert appointment.status_code == 201, appointment.text

    quote_response = await client.post(
        "/api/v1/quotes",
        json={
            "customer_id": customer_id,
            "work_order_id": work_order_id,
            "items": [
                {
                    "description": "Servicio vinculado",
                    "quantity": "1.000",
                    "unit_price": "1000.00",
                }
            ],
        },
        headers=_headers(owner_token, tenant_id),
    )
    assert quote_response.status_code == 201, quote_response.text
    quote_id = quote_response.json()["id"]

    await client.post(f"/api/v1/quotes/{quote_id}/send", headers=_headers(owner_token, tenant_id))

    summary = await client.get(
        "/api/v1/dashboard/summary", headers=_headers(owner_token, tenant_id)
    )
    assert summary.status_code == 200, summary.text
    summary_body = summary.json()
    assert summary_body["quotes_total"] == 1
    assert summary_body["quotes_pending"] == 1
    assert summary_body["appointments_today"] == 1

    public_token = quote_response.json()["public_token"]
    await client.post(f"/api/v1/public/quotes/{public_token}/approve", json={})

    payment = await client.post(
        "/api/v1/payments",
        json={
            "work_order_id": work_order_id,
            "amount": "400.00",
            "method": "cash",
        },
        headers=_headers(owner_token, tenant_id),
    )
    assert payment.status_code == 201, payment.text

    final = await client.get("/api/v1/dashboard/summary", headers=_headers(owner_token, tenant_id))
    assert final.status_code == 200, final.text
    final_body = final.json()
    assert Decimal(final_body["payments_total"]) == Decimal("400.00")
    assert final_body["pending_balance"] == "600.00"


async def test_dashboard_isolation_between_tenants(client: AsyncClient) -> None:
    token_a, tenant_a, _ = await _register(client, "owner-a@example.com", "Empresa A")
    token_b, tenant_b, _ = await _register(client, "owner-b@example.com", "Empresa B")
    customer_a = await _create_customer(client, token_a, tenant_a)
    await _create_work_order(client, token_a, tenant_a, customer_a)

    summary_a = await client.get("/api/v1/dashboard/summary", headers=_headers(token_a, tenant_a))
    assert summary_a.status_code == 200, summary_a.text
    assert summary_a.json()["customers_total"] == 1

    summary_b = await client.get("/api/v1/dashboard/summary", headers=_headers(token_b, tenant_b))
    assert summary_b.status_code == 200, summary_b.text
    assert summary_b.json()["customers_total"] == 0


async def test_technician_cannot_access_dashboard(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    _owner_token, tenant_id, _ = await _register(client, "owner-a@example.com", "Empresa A")
    tech_token, _, tech_user_id = await _register(client, "tech@example.com", "Tech Co")
    await _add_technician(db_session, tenant_id, tech_user_id)

    response = await client.get(
        "/api/v1/dashboard/summary", headers=_headers(tech_token, tenant_id)
    )
    assert response.status_code == 403
