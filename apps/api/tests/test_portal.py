from httpx import AsyncClient

from app.core.config import settings

CUSTOMER = {
    "name": "Carlos Gomez",
    "email": "carlos@example.com",
    "phone": "+54 11 5555-1001",
    "address": "Av. Siempre Viva 742",
    "city": "CABA",
    "province": "Buenos Aires",
    "postal_code": "1425",
}


async def _register_demo_tenant(client: AsyncClient) -> tuple[str, str]:
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "portal-owner@example.com",
            "password": "super-secret-123",
            "full_name": "Portal Owner",
            "company_name": "Servicios Demo",
        },
    )
    assert response.status_code == 201, response.text
    body = response.json()
    return body["access_token"], body["tenants"][0]["id"]


async def _create_demo_customer(
    client: AsyncClient, token: str, tenant_id: str
) -> dict[str, object]:
    response = await client.post(
        "/api/v1/customers",
        json=CUSTOMER,
        headers={"Authorization": f"Bearer {token}", "X-Tenant-ID": tenant_id},
    )
    assert response.status_code == 201, response.text
    return response.json()


async def test_get_public_portal(client: AsyncClient) -> None:
    token, tenant_id = await _register_demo_tenant(client)
    await _create_demo_customer(client, token, tenant_id)
    slug = "servicios-demo"

    response = await client.get(f"/api/v1/portal/{slug}")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["tenant"]["slug"] == slug
    assert body["portal"]["primary_color"] == "#0F766E"
    assert body["demo_available"] is False


async def test_portal_request_and_verify(client: AsyncClient, monkeypatch) -> None:
    monkeypatch.setattr(settings, "portal_dev_mode", True)
    monkeypatch.setattr(settings, "portal_dev_tenant_slug", "servicios-demo")

    token, tenant_id = await _register_demo_tenant(client)
    await _create_demo_customer(client, token, tenant_id)

    request = await client.post(
        "/api/v1/portal/servicios-demo/auth/request",
        json={"email": CUSTOMER["email"]},
    )
    assert request.status_code == 200, request.text
    dev_token = request.json().get("dev_token")
    assert dev_token

    verify = await client.post(
        "/api/v1/portal/servicios-demo/auth/verify",
        json={"token": dev_token},
    )
    assert verify.status_code == 200, verify.text
    body = verify.json()
    assert body["access_token"]
    assert body["customer"]["email"] == CUSTOMER["email"]
    assert body["tenant"]["slug"] == "servicios-demo"


async def test_portal_demo_login(client: AsyncClient, monkeypatch) -> None:
    monkeypatch.setattr(settings, "portal_dev_mode", True)
    monkeypatch.setattr(settings, "portal_dev_tenant_slug", "servicios-demo")

    token, tenant_id = await _register_demo_tenant(client)
    await _create_demo_customer(client, token, tenant_id)

    response = await client.post("/api/v1/portal/servicios-demo/auth/demo")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["access_token"]
    assert body["customer"]["email"] == CUSTOMER["email"]


async def test_portal_me_requires_matching_slug(client: AsyncClient, monkeypatch) -> None:
    monkeypatch.setattr(settings, "portal_dev_mode", True)
    monkeypatch.setattr(settings, "portal_dev_tenant_slug", "servicios-demo")

    token, tenant_id = await _register_demo_tenant(client)
    await _create_demo_customer(client, token, tenant_id)

    demo = await client.post("/api/v1/portal/servicios-demo/auth/demo")
    portal_token = demo.json()["access_token"]

    me = await client.get(
        "/api/v1/portal/servicios-demo/me",
        headers={"Authorization": f"Bearer {portal_token}"},
    )
    assert me.status_code == 200, me.text
    assert me.json()["email"] == CUSTOMER["email"]

    other = await client.get(
        "/api/v1/portal/otro/me",
        headers={"Authorization": f"Bearer {portal_token}"},
    )
    assert other.status_code == 403


async def test_portal_orders_and_quotes_are_customer_scoped(
    client: AsyncClient, monkeypatch
) -> None:
    monkeypatch.setattr(settings, "portal_dev_mode", True)
    monkeypatch.setattr(settings, "portal_dev_tenant_slug", "servicios-demo")

    token, tenant_id = await _register_demo_tenant(client)
    headers = {"Authorization": f"Bearer {token}", "X-Tenant-ID": tenant_id}
    carlos = await _create_demo_customer(client, token, tenant_id)

    maria_response = await client.post(
        "/api/v1/customers",
        json={"name": "Maria Lopez", "email": "maria@example.com"},
        headers=headers,
    )
    assert maria_response.status_code == 201, maria_response.text
    maria = maria_response.json()

    async def create_order(customer_id: str, title: str) -> dict[str, object]:
        response = await client.post(
            "/api/v1/work-orders",
            json={"customer_id": customer_id, "title": title, "priority": "normal"},
            headers=headers,
        )
        assert response.status_code == 201, response.text
        return response.json()

    async def create_sent_quote(customer_id: str, order_id: str) -> dict[str, object]:
        response = await client.post(
            "/api/v1/quotes",
            json={
                "customer_id": customer_id,
                "work_order_id": order_id,
                "valid_until": "2030-12-31",
                "items": [
                    {
                        "description": "Diagnóstico",
                        "quantity": "1",
                        "unit_price": "10000.00",
                        "discount_rate": "0",
                        "tax_rate": "21",
                    }
                ],
            },
            headers=headers,
        )
        assert response.status_code == 201, response.text
        quote = response.json()
        sent = await client.post(f"/api/v1/quotes/{quote['id']}/send", headers=headers)
        assert sent.status_code == 200, sent.text
        return sent.json()

    carlos_order = await create_order(str(carlos["id"]), "Aire acondicionado")
    carlos_quote = await create_sent_quote(str(carlos["id"]), str(carlos_order["id"]))
    maria_order = await create_order(str(maria["id"]), "Instalación eléctrica")
    await create_sent_quote(str(maria["id"]), str(maria_order["id"]))

    demo = await client.post("/api/v1/portal/servicios-demo/auth/demo")
    portal_headers = {"Authorization": f"Bearer {demo.json()['access_token']}"}

    orders = await client.get("/api/v1/portal/servicios-demo/orders", headers=portal_headers)
    assert orders.status_code == 200, orders.text
    assert [item["id"] for item in orders.json()] == [carlos_order["id"]]

    quotes = await client.get("/api/v1/portal/servicios-demo/quotes", headers=portal_headers)
    assert quotes.status_code == 200, quotes.text
    assert [item["id"] for item in quotes.json()] == [carlos_quote["id"]]

    other_order = await client.get(
        f"/api/v1/portal/servicios-demo/orders/{maria_order['id']}",
        headers=portal_headers,
    )
    assert other_order.status_code == 404

    approved = await client.post(
        f"/api/v1/portal/servicios-demo/quotes/{carlos_quote['id']}/approve",
        headers=portal_headers,
    )
    assert approved.status_code == 200, approved.text
    assert approved.json()["status"] == "approved"
