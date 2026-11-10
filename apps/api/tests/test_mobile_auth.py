from httpx import AsyncClient


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


async def test_mobile_login_returns_tokens_without_cookies(
    client: AsyncClient, register_payload: dict[str, str]
) -> None:
    await client.post("/api/v1/auth/register", json=register_payload)

    response = await client.post(
        "/api/v1/auth/mobile/login",
        json={
            "email": register_payload["email"],
            "password": register_payload["password"],
        },
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["access_token"]
    assert body["refresh_token"]
    assert body["token_type"] == "bearer"  # noqa: S105
    assert body["expires_in"] == 900
    assert body["tenants"][0]["role"] == "owner"
    assert "set-cookie" not in {k.lower() for k in response.headers}


async def test_mobile_refresh_rotates_token(
    client: AsyncClient, register_payload: dict[str, str]
) -> None:
    register = await client.post("/api/v1/auth/register", json=register_payload)
    assert register.status_code == 201, register.text

    login = await client.post(
        "/api/v1/auth/mobile/login",
        json={
            "email": register_payload["email"],
            "password": register_payload["password"],
        },
    )
    assert login.status_code == 200, login.text
    refresh_token = login.json()["refresh_token"]

    response = await client.post(
        "/api/v1/auth/mobile/refresh",
        json={"refresh_token": refresh_token},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["access_token"]
    assert body["refresh_token"] != refresh_token


async def test_mobile_refresh_with_revoked_token_fails(
    client: AsyncClient, register_payload: dict[str, str]
) -> None:
    register = await client.post("/api/v1/auth/register", json=register_payload)
    assert register.status_code == 201, register.text

    login = await client.post(
        "/api/v1/auth/mobile/login",
        json={
            "email": register_payload["email"],
            "password": register_payload["password"],
        },
    )
    assert login.status_code == 200, login.text
    refresh_token = login.json()["refresh_token"]

    await client.post(
        "/api/v1/auth/mobile/refresh",
        json={"refresh_token": refresh_token},
    )

    response = await client.post(
        "/api/v1/auth/mobile/refresh",
        json={"refresh_token": refresh_token},
    )
    assert response.status_code == 401


async def test_mobile_logout_revokes_token(
    client: AsyncClient, register_payload: dict[str, str]
) -> None:
    register = await client.post("/api/v1/auth/register", json=register_payload)
    assert register.status_code == 201, register.text

    login = await client.post(
        "/api/v1/auth/mobile/login",
        json={
            "email": register_payload["email"],
            "password": register_payload["password"],
        },
    )
    assert login.status_code == 200, login.text
    refresh_token = login.json()["refresh_token"]

    logout = await client.post(
        "/api/v1/auth/mobile/logout",
        json={"refresh_token": refresh_token},
    )
    assert logout.status_code == 204

    response = await client.post(
        "/api/v1/auth/mobile/refresh",
        json={"refresh_token": refresh_token},
    )
    assert response.status_code == 401
