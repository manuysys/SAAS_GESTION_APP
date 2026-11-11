from uuid import UUID

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Membership

CUSTOMER = {
    "name": "Cliente Presupuesto",
    "phone": "+54 11 5555-2000",
    "email": "presupuesto@example.com",
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


async def test_create_quote_calculates_totals_exactly(client: AsyncClient) -> None:
    token, tenant_id, _ = await _register(client, "quote-owner@example.com", "Empresa Quote")
    customer_id = await _create_customer(client, token, tenant_id)

    response = await client.post(
        "/api/v1/quotes",
        json={
            "customer_id": customer_id,
            "notes": "Prueba de cálculos",
            "items": [
                {
                    "description": "Servicio A",
                    "quantity": "2.000",
                    "unit_price": "100.00",
                    "discount_rate": "10.00",
                    "tax_rate": "21.00",
                    "sort_order": 0,
                },
                {
                    "description": "Servicio B",
                    "quantity": "1.000",
                    "unit_price": "50.00",
                    "discount_rate": "0.00",
                    "tax_rate": "21.00",
                    "sort_order": 1,
                },
            ],
        },
        headers=_headers(token, tenant_id),
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["status"] == "draft"
    assert body["number"].startswith("QT-")
    assert body["subtotal"] == "250.00"
    assert body["discount_total"] == "20.00"
    assert body["tax_total"] == "48.30"
    assert body["total"] == "278.30"
    assert len(body["items"]) == 2

    events = await client.get(
        f"/api/v1/quotes/{body['id']}/events", headers=_headers(token, tenant_id)
    )
    assert events.status_code == 200, events.text
    assert any(event["event_type"] == "created" for event in events.json())


async def test_send_public_get_approve_and_work_order_status(client: AsyncClient) -> None:
    token, tenant_id, _ = await _register(client, "quote-owner@example.com", "Empresa Quote")
    customer_id = await _create_customer(client, token, tenant_id)
    work_order_id = await _create_work_order(client, token, tenant_id, customer_id)

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
    assert send_response.json()["status"] == "sent"

    public_response = await client.get(f"/api/v1/public/quotes/{public_token}")
    assert public_response.status_code == 200, public_response.text
    public_body = public_response.json()
    assert public_body["tenant_name"] == "Empresa Quote"
    assert public_body["customer_name"] == CUSTOMER["name"]
    assert public_body["status"] == "sent"
    assert "id" not in public_body
    assert "customer_id" not in public_body

    approve_response = await client.post(f"/api/v1/public/quotes/{public_token}/approve", json={})
    assert approve_response.status_code == 200, approve_response.text
    assert approve_response.json()["status"] == "approved"

    quote = await client.get(f"/api/v1/quotes/{quote_id}", headers=_headers(token, tenant_id))
    assert quote.json()["status"] == "approved"

    order = await client.get(
        f"/api/v1/work-orders/{work_order_id}", headers=_headers(token, tenant_id)
    )
    assert order.json()["commercial_status"] == "approved"


async def test_invalid_transition_approve_draft_returns_409(client: AsyncClient) -> None:
    token, tenant_id, _ = await _register(client, "quote-owner@example.com", "Empresa Quote")
    customer_id = await _create_customer(client, token, tenant_id)

    create_response = await client.post(
        "/api/v1/quotes",
        json={
            "customer_id": customer_id,
            "items": [
                {
                    "description": "Servicio",
                    "quantity": "1.000",
                    "unit_price": "100.00",
                }
            ],
        },
        headers=_headers(token, tenant_id),
    )
    assert create_response.status_code == 201, create_response.text
    quote_id = create_response.json()["id"]

    approve_response = await client.post(
        f"/api/v1/quotes/{quote_id}/approve", headers=_headers(token, tenant_id)
    )
    assert approve_response.status_code == 409


async def test_quote_isolation_between_tenants(client: AsyncClient) -> None:
    token_a, tenant_a, _ = await _register(client, "owner-a@example.com", "Empresa A")
    token_b, tenant_b, _ = await _register(client, "owner-b@example.com", "Empresa B")
    customer_a = await _create_customer(client, token_a, tenant_a)

    create_response = await client.post(
        "/api/v1/quotes",
        json={
            "customer_id": customer_a,
            "items": [
                {
                    "description": "Servicio privado",
                    "quantity": "1.000",
                    "unit_price": "100.00",
                }
            ],
        },
        headers=_headers(token_a, tenant_a),
    )
    assert create_response.status_code == 201, create_response.text
    quote_id = create_response.json()["id"]

    read_by_b = await client.get(f"/api/v1/quotes/{quote_id}", headers=_headers(token_b, tenant_b))
    assert read_by_b.status_code == 404

    pdf_by_b = await client.get(
        f"/api/v1/quotes/{quote_id}/pdf", headers=_headers(token_b, tenant_b)
    )
    assert pdf_by_b.status_code == 404

    events_by_b = await client.get(
        f"/api/v1/quotes/{quote_id}/events", headers=_headers(token_b, tenant_b)
    )
    assert events_by_b.status_code == 404


async def test_quote_pdf_returns_pdf_content(client: AsyncClient) -> None:
    token, tenant_id, _ = await _register(client, "quote-owner@example.com", "Empresa Quote")
    customer_id = await _create_customer(client, token, tenant_id)

    create_response = await client.post(
        "/api/v1/quotes",
        json={
            "customer_id": customer_id,
            "items": [
                {
                    "description": "Servicio PDF",
                    "quantity": "1.000",
                    "unit_price": "100.00",
                }
            ],
        },
        headers=_headers(token, tenant_id),
    )
    assert create_response.status_code == 201, create_response.text
    quote_id = create_response.json()["id"]

    pdf_response = await client.get(
        f"/api/v1/quotes/{quote_id}/pdf", headers=_headers(token, tenant_id)
    )
    assert pdf_response.status_code == 200
    assert pdf_response.headers["content-type"] == "application/pdf"
    assert pdf_response.content.startswith(b"%PDF")


async def test_invalid_public_token_returns_404(client: AsyncClient) -> None:
    response = await client.get("/api/v1/public/quotes/token-invalido")
    assert response.status_code == 404


async def test_viewer_cannot_read_quotes(client: AsyncClient, db_session: AsyncSession) -> None:
    _, tenant_id, _ = await _register(client, "owner-a@example.com", "Empresa A")
    viewer_token, _, viewer_user_id = await _register(client, "viewer@example.com", "Viewer Co")
    db_session.add(
        Membership(
            tenant_id=UUID(tenant_id),
            user_id=UUID(viewer_user_id),
            role="viewer",
        )
    )
    await db_session.commit()

    response = await client.get("/api/v1/quotes", headers=_headers(viewer_token, tenant_id))
    assert response.status_code == 403


async def test_quote_cannot_link_order_from_other_customer(
    client: AsyncClient,
) -> None:
    token, tenant_id, _ = await _register(client, "owner-a@example.com", "Empresa A")
    customer_a = await _create_customer(client, token, tenant_id)
    customer_b = await _create_customer(client, token, tenant_id)
    order_b = await _create_work_order(client, token, tenant_id, customer_b)

    response = await client.post(
        "/api/v1/quotes",
        json={
            "customer_id": customer_a,
            "work_order_id": order_b,
            "items": [
                {
                    "description": "Servicio",
                    "quantity": "1.000",
                    "unit_price": "100.00",
                }
            ],
        },
        headers=_headers(token, tenant_id),
    )
    assert response.status_code == 400

    created = await client.post(
        "/api/v1/quotes",
        json={
            "customer_id": customer_a,
            "items": [
                {
                    "description": "Servicio",
                    "quantity": "1.000",
                    "unit_price": "100.00",
                }
            ],
        },
        headers=_headers(token, tenant_id),
    )
    assert created.status_code == 201, created.text
    quote_id = created.json()["id"]

    update = await client.patch(
        f"/api/v1/quotes/{quote_id}",
        json={"work_order_id": order_b},
        headers=_headers(token, tenant_id),
    )
    assert update.status_code == 400


async def test_expired_quote_cannot_be_approved(client: AsyncClient) -> None:
    token, tenant_id, _ = await _register(client, "owner-a@example.com", "Empresa A")
    customer_id = await _create_customer(client, token, tenant_id)

    created = await client.post(
        "/api/v1/quotes",
        json={
            "customer_id": customer_id,
            "valid_until": "2020-01-01",
            "items": [
                {
                    "description": "Servicio vencido",
                    "quantity": "1.000",
                    "unit_price": "100.00",
                }
            ],
        },
        headers=_headers(token, tenant_id),
    )
    assert created.status_code == 201, created.text
    quote_id = created.json()["id"]
    public_token = created.json()["public_token"]

    sent = await client.post(f"/api/v1/quotes/{quote_id}/send", headers=_headers(token, tenant_id))
    assert sent.status_code == 200, sent.text

    approve = await client.post(f"/api/v1/public/quotes/{public_token}/approve", json={})
    assert approve.status_code == 409

    quote = await client.get(f"/api/v1/quotes/{quote_id}", headers=_headers(token, tenant_id))
    assert quote.json()["status"] == "expired"


async def test_quote_update_rejects_empty_items(client: AsyncClient) -> None:
    token, tenant_id, _ = await _register(client, "owner-a@example.com", "Empresa A")
    customer_id = await _create_customer(client, token, tenant_id)

    created = await client.post(
        "/api/v1/quotes",
        json={
            "customer_id": customer_id,
            "items": [
                {
                    "description": "Servicio",
                    "quantity": "1.000",
                    "unit_price": "100.00",
                }
            ],
        },
        headers=_headers(token, tenant_id),
    )
    assert created.status_code == 201, created.text
    quote_id = created.json()["id"]

    update = await client.patch(
        f"/api/v1/quotes/{quote_id}",
        json={"items": []},
        headers=_headers(token, tenant_id),
    )
    assert update.status_code == 422


async def test_quote_amount_overflow_is_rejected(client: AsyncClient) -> None:
    token, tenant_id, _ = await _register(client, "owner-a@example.com", "Empresa A")
    customer_id = await _create_customer(client, token, tenant_id)

    response = await client.post(
        "/api/v1/quotes",
        json={
            "customer_id": customer_id,
            "items": [
                {
                    "description": "Desborde",
                    "quantity": "999999999.999",
                    "unit_price": "999999999999.99",
                }
            ],
        },
        headers=_headers(token, tenant_id),
    )
    assert response.status_code == 422


async def test_public_reject_does_not_regress_approved_order(
    client: AsyncClient,
) -> None:
    token, tenant_id, _ = await _register(client, "owner-a@example.com", "Empresa A")
    customer_id = await _create_customer(client, token, tenant_id)
    work_order_id = await _create_work_order(client, token, tenant_id, customer_id)

    def quote_payload() -> dict[str, object]:
        return {
            "customer_id": customer_id,
            "work_order_id": work_order_id,
            "items": [
                {
                    "description": "Servicio",
                    "quantity": "1.000",
                    "unit_price": "100.00",
                }
            ],
        }

    first = await client.post(
        "/api/v1/quotes", json=quote_payload(), headers=_headers(token, tenant_id)
    )
    assert first.status_code == 201, first.text
    first_id = first.json()["id"]
    first_token = first.json()["public_token"]
    await client.post(f"/api/v1/quotes/{first_id}/send", headers=_headers(token, tenant_id))
    await client.post(f"/api/v1/public/quotes/{first_token}/approve", json={})

    order = await client.get(
        f"/api/v1/work-orders/{work_order_id}", headers=_headers(token, tenant_id)
    )
    assert order.json()["commercial_status"] == "approved"

    second = await client.post(
        "/api/v1/quotes", json=quote_payload(), headers=_headers(token, tenant_id)
    )
    assert second.status_code == 201, second.text
    second_id = second.json()["id"]
    second_token = second.json()["public_token"]
    await client.post(f"/api/v1/quotes/{second_id}/send", headers=_headers(token, tenant_id))

    order_after_send = await client.get(
        f"/api/v1/work-orders/{work_order_id}", headers=_headers(token, tenant_id)
    )
    assert order_after_send.json()["commercial_status"] == "approved"

    reject = await client.post(f"/api/v1/public/quotes/{second_token}/reject", json={})
    assert reject.status_code == 200, reject.text
    assert reject.json()["status"] == "rejected"

    order_after_reject = await client.get(
        f"/api/v1/work-orders/{work_order_id}", headers=_headers(token, tenant_id)
    )
    assert order_after_reject.json()["commercial_status"] == "approved"


async def test_revoke_public_quote_link(client: AsyncClient) -> None:
    token, tenant_id, _ = await _register(client, "revoke-owner@example.com", "Empresa Revoke")
    customer_id = await _create_customer(client, token, tenant_id)
    work_order_id = await _create_work_order(client, token, tenant_id, customer_id)

    created = await client.post(
        "/api/v1/quotes",
        json={
            "customer_id": customer_id,
            "work_order_id": work_order_id,
            "items": [
                {
                    "description": "Servicio",
                    "quantity": "1",
                    "unit_price": "100.00",
                }
            ],
        },
        headers=_headers(token, tenant_id),
    )
    assert created.status_code == 201, created.text
    quote = created.json()
    public_token = quote["public_token"]

    sent = await client.post(
        f"/api/v1/quotes/{quote['id']}/send", headers=_headers(token, tenant_id)
    )
    assert sent.status_code == 200, sent.text

    public_get = await client.get(f"/api/v1/public/quotes/{public_token}")
    assert public_get.status_code == 200, public_get.text

    revoked = await client.post(
        f"/api/v1/quotes/{quote['id']}/revoke-public-link",
        headers=_headers(token, tenant_id),
    )
    assert revoked.status_code == 200, revoked.text
    assert revoked.json()["public_token_revoked_at"] is not None

    public_get_after = await client.get(f"/api/v1/public/quotes/{public_token}")
    assert public_get_after.status_code == 404

    approve_after = await client.post(f"/api/v1/public/quotes/{public_token}/approve", json={})
    assert approve_after.status_code == 404
