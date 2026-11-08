from httpx import AsyncClient

CUSTOMER_PAYLOAD = {
    "name": "Carlos Perez",
    "phone": "+54 11 5555-1234",
    "email": "carlos@example.com",
    "notes": "Cliente de prueba",
}


async def _register(
    client: AsyncClient,
    email: str,
    company: str,
) -> tuple[str, str]:
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


async def test_customer_crud(client: AsyncClient) -> None:
    token, tenant_id = await _register(client, "owner-a@example.com", "Empresa A")

    created = await client.post(
        "/api/v1/customers",
        json=CUSTOMER_PAYLOAD,
        headers=_headers(token, tenant_id),
    )
    assert created.status_code == 201, created.text
    customer = created.json()
    assert customer["name"] == CUSTOMER_PAYLOAD["name"]
    assert customer["tenant_id"] == tenant_id

    listed = await client.get("/api/v1/customers", headers=_headers(token, tenant_id))
    assert listed.status_code == 200, listed.text
    assert listed.json()["total"] == 1
    assert listed.json()["items"][0]["id"] == customer["id"]

    fetched = await client.get(
        f"/api/v1/customers/{customer['id']}",
        headers=_headers(token, tenant_id),
    )
    assert fetched.status_code == 200, fetched.text

    updated = await client.patch(
        f"/api/v1/customers/{customer['id']}",
        json={"name": "Carlos Actualizado"},
        headers=_headers(token, tenant_id),
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["name"] == "Carlos Actualizado"

    deleted = await client.delete(
        f"/api/v1/customers/{customer['id']}",
        headers=_headers(token, tenant_id),
    )
    assert deleted.status_code == 204, deleted.text

    gone = await client.get(
        f"/api/v1/customers/{customer['id']}",
        headers=_headers(token, tenant_id),
    )
    assert gone.status_code == 404


async def test_customer_isolation_between_tenants(client: AsyncClient) -> None:
    token_a, tenant_a = await _register(client, "owner-a@example.com", "Empresa A")
    token_b, tenant_b = await _register(client, "owner-b@example.com", "Empresa B")

    created = await client.post(
        "/api/v1/customers",
        json=CUSTOMER_PAYLOAD,
        headers=_headers(token_a, tenant_a),
    )
    assert created.status_code == 201, created.text
    customer_id = created.json()["id"]

    read_by_b = await client.get(
        f"/api/v1/customers/{customer_id}",
        headers=_headers(token_b, tenant_b),
    )
    assert read_by_b.status_code == 404

    update_by_b = await client.patch(
        f"/api/v1/customers/{customer_id}",
        json={"name": "Hackeado"},
        headers=_headers(token_b, tenant_b),
    )
    assert update_by_b.status_code == 404

    list_by_b = await client.get("/api/v1/customers", headers=_headers(token_b, tenant_b))
    assert list_by_b.status_code == 200
    assert list_by_b.json()["total"] == 0


async def test_unknown_tenant_header_is_rejected(client: AsyncClient) -> None:
    token, _ = await _register(client, "owner-a@example.com", "Empresa A")
    response = await client.get(
        "/api/v1/customers",
        headers={
            "Authorization": f"Bearer {token}",
            "X-Tenant-ID": "00000000-0000-0000-0000-000000000000",
        },
    )
    assert response.status_code == 404
