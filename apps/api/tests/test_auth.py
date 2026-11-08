from httpx import AsyncClient


async def test_register_login_me_and_refresh(
    client: AsyncClient, register_payload: dict[str, str]
) -> None:
    response = await client.post("/api/v1/auth/register", json=register_payload)
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["access_token"]
    assert body["tenants"][0]["role"] == "owner"
    tenant_id = body["tenants"][0]["id"]
    token = body["access_token"]

    me = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}", "X-Tenant-ID": tenant_id},
    )
    assert me.status_code == 200, me.text
    assert me.json()["user"]["email"] == register_payload["email"]
    assert len(me.json()["tenants"]) == 1

    login = await client.post(
        "/api/v1/auth/login",
        json={"email": register_payload["email"], "password": register_payload["password"]},
    )
    assert login.status_code == 200, login.text
    assert login.json()["access_token"]

    refresh = await client.post("/api/v1/auth/refresh")
    assert refresh.status_code == 200, refresh.text
    assert refresh.json()["access_token"]

    logout = await client.post("/api/v1/auth/logout")
    assert logout.status_code == 204


async def test_duplicate_email_is_rejected(
    client: AsyncClient, register_payload: dict[str, str]
) -> None:
    first = await client.post("/api/v1/auth/register", json=register_payload)
    assert first.status_code == 201, first.text

    second = await client.post("/api/v1/auth/register", json=register_payload)
    assert second.status_code == 409


async def test_invalid_login_is_rejected(
    client: AsyncClient, register_payload: dict[str, str]
) -> None:
    await client.post("/api/v1/auth/register", json=register_payload)
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": register_payload["email"], "password": "wrong-password"},
    )
    assert response.status_code == 401
