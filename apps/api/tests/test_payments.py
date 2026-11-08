from uuid import UUID

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Membership

CUSTOMER = {
    "name": "Cliente Pagos",
    "phone": "+54 11 5555-4000",
    "email": "pagos@example.com",
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


async def _create_and_approve_quote(
    client: AsyncClient, token: str, tenant_id: str, customer_id: str, work_order_id: str
) -> str:
    create_response = await client.post(
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
        headers=_headers(token, tenant_id),
    )
    assert create_response.status_code == 201, create_response.text
    quote_id = create_response.json()["id"]
    public_token = create_response.json()["public_token"]

    send_response = await client.post(
        f"/api/v1/quotes/{quote_id}/send", headers=_headers(token, tenant_id)
    )
    assert send_response.status_code == 200, send_response.text

    approve_response = await client.post(f"/api/v1/public/quotes/{public_token}/approve", json={})
    assert approve_response.status_code == 200, approve_response.text
    return quote_id


async def test_create_payment_recalculates_partial_status(client: AsyncClient) -> None:
    token, tenant_id, _ = await _register(client, "owner-pay@example.com", "Empresa Pago")
    customer_id = await _create_customer(client, token, tenant_id)
    work_order_id = await _create_work_order(client, token, tenant_id, customer_id)
    await _create_and_approve_quote(client, token, tenant_id, customer_id, work_order_id)

    response = await client.post(
        "/api/v1/payments",
        json={
            "work_order_id": work_order_id,
            "amount": "500.00",
            "method": "cash",
        },
        headers=_headers(token, tenant_id),
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["amount"] == "500.00"
    assert body["status"] == "registered"

    order = await client.get(
        f"/api/v1/work-orders/{work_order_id}", headers=_headers(token, tenant_id)
    )
    assert order.status_code == 200, order.text
    assert order.json()["payment_status"] == "partial"


async def test_payment_paid_status(client: AsyncClient) -> None:
    token, tenant_id, _ = await _register(client, "owner-pay@example.com", "Empresa Pago")
    customer_id = await _create_customer(client, token, tenant_id)
    work_order_id = await _create_work_order(client, token, tenant_id, customer_id)
    await _create_and_approve_quote(client, token, tenant_id, customer_id, work_order_id)

    response = await client.post(
        "/api/v1/payments",
        json={
            "work_order_id": work_order_id,
            "amount": "1000.00",
            "method": "transfer",
        },
        headers=_headers(token, tenant_id),
    )
    assert response.status_code == 201, response.text

    order = await client.get(
        f"/api/v1/work-orders/{work_order_id}", headers=_headers(token, tenant_id)
    )
    assert order.status_code == 200, order.text
    assert order.json()["payment_status"] == "paid"


async def test_void_payment_recalculates_status(client: AsyncClient) -> None:
    token, tenant_id, _ = await _register(client, "owner-pay@example.com", "Empresa Pago")
    customer_id = await _create_customer(client, token, tenant_id)
    work_order_id = await _create_work_order(client, token, tenant_id, customer_id)
    await _create_and_approve_quote(client, token, tenant_id, customer_id, work_order_id)

    payment = await client.post(
        "/api/v1/payments",
        json={
            "work_order_id": work_order_id,
            "amount": "1000.00",
            "method": "cash",
        },
        headers=_headers(token, tenant_id),
    )
    assert payment.status_code == 201, payment.text
    payment_id = payment.json()["id"]

    void = await client.post(
        f"/api/v1/payments/{payment_id}/void",
        headers=_headers(token, tenant_id),
    )
    assert void.status_code == 200, void.text
    assert void.json()["status"] == "voided"

    order = await client.get(
        f"/api/v1/work-orders/{work_order_id}", headers=_headers(token, tenant_id)
    )
    assert order.status_code == 200, order.text
    assert order.json()["payment_status"] == "pending"


async def test_payment_isolation_between_tenants(client: AsyncClient) -> None:
    token_a, tenant_a, _ = await _register(client, "owner-a@example.com", "Empresa A")
    token_b, tenant_b, _ = await _register(client, "owner-b@example.com", "Empresa B")
    customer_a = await _create_customer(client, token_a, tenant_a)
    work_order_a = await _create_work_order(client, token_a, tenant_a, customer_a)

    payment = await client.post(
        "/api/v1/payments",
        json={
            "work_order_id": work_order_a,
            "amount": "100.00",
            "method": "cash",
        },
        headers=_headers(token_a, tenant_a),
    )
    assert payment.status_code == 201, payment.text
    payment_id = payment.json()["id"]

    read_by_b = await client.get(
        f"/api/v1/payments/{payment_id}", headers=_headers(token_b, tenant_b)
    )
    assert read_by_b.status_code == 404


async def test_technician_cannot_access_payments(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    owner_token, tenant_id, _ = await _register(client, "owner-a@example.com", "Empresa A")
    tech_token, _, tech_user_id = await _register(client, "tech@example.com", "Tech Co")
    await _add_technician(db_session, tenant_id, tech_user_id)
    customer_id = await _create_customer(client, owner_token, tenant_id)
    work_order_id = await _create_work_order(client, owner_token, tenant_id, customer_id)

    list_payments = await client.get("/api/v1/payments", headers=_headers(tech_token, tenant_id))
    assert list_payments.status_code == 403

    create_payment = await client.post(
        "/api/v1/payments",
        json={
            "work_order_id": work_order_id,
            "amount": "100.00",
            "method": "cash",
        },
        headers=_headers(tech_token, tenant_id),
    )
    assert create_payment.status_code == 403
