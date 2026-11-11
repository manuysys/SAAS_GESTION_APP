from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import create_access_token, hash_password
from app.models import Membership, User

CUSTOMER = {
    "name": "Carlos Gomez",
    "email": "carlos@example.com",
    "phone": "+54 11 5555-1001",
    "address": "Av. Siempre Viva 742",
    "city": "CABA",
    "province": "Buenos Aires",
    "postal_code": "1425",
}


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


async def _create_customer(client: AsyncClient, token: str, tenant_id: str) -> dict[str, object]:
    response = await client.post(
        "/api/v1/customers",
        json=CUSTOMER,
        headers=_headers(token, tenant_id),
    )
    assert response.status_code == 201, response.text
    return response.json()


async def test_create_portal_access_returns_url_once(
    client: AsyncClient,
) -> None:
    token, tenant_id = await _register(client, "owner-portal@example.com", "Empresa Portal")
    customer = await _create_customer(client, token, tenant_id)

    response = await client.post(
        f"/api/v1/customers/{customer['id']}/portal-access",
        json={"send_email": False},
        headers=_headers(token, tenant_id),
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["access_url"]
    assert "/portal/" in body["access_url"]
    assert "token=" in body["access_url"]
    assert body["email_status"] == "not_sent"


async def test_revoke_portal_access_invalidates_token(
    client: AsyncClient,
) -> None:
    token, tenant_id = await _register(client, "owner-revoke@example.com", "Empresa Revoke")
    customer = await _create_customer(client, token, tenant_id)

    created = await client.post(
        f"/api/v1/customers/{customer['id']}/portal-access",
        json={"send_email": False},
        headers=_headers(token, tenant_id),
    )
    assert created.status_code == 200
    access_url = created.json()["access_url"]
    raw_token = access_url.split("token=")[-1]

    tenant_slug = access_url.split("/portal/")[-1].split("?")[0]
    verify = await client.post(
        f"/api/v1/portal/{tenant_slug}/auth/verify",
        json={"token": raw_token},
    )
    assert verify.status_code == 200, verify.text

    revoked = await client.post(
        f"/api/v1/customers/{customer['id']}/portal-access/revoke",
        headers=_headers(token, tenant_id),
    )
    assert revoked.status_code == 204

    after_revoke = await client.post(
        f"/api/v1/portal/{tenant_slug}/auth/verify",
        json={"token": raw_token},
    )
    assert after_revoke.status_code == 401


async def test_revoke_invalidates_an_open_portal_session(
    client: AsyncClient,
) -> None:
    token, tenant_id = await _register(client, "owner-session@example.com", "Empresa Session")
    customer = await _create_customer(client, token, tenant_id)

    created = await client.post(
        f"/api/v1/customers/{customer['id']}/portal-access",
        json={"send_email": False},
        headers=_headers(token, tenant_id),
    )
    assert created.status_code == 200
    access_url = created.json()["access_url"]
    raw_token = access_url.split("token=")[-1]
    tenant_slug = access_url.split("/portal/")[-1].split("?")[0]

    verify = await client.post(
        f"/api/v1/portal/{tenant_slug}/auth/verify",
        json={"token": raw_token},
    )
    assert verify.status_code == 200, verify.text
    portal_headers = {"Authorization": f"Bearer {verify.json()['access_token']}"}

    before = await client.get(f"/api/v1/portal/{tenant_slug}/me", headers=portal_headers)
    assert before.status_code == 200

    revoked = await client.post(
        f"/api/v1/customers/{customer['id']}/portal-access/revoke",
        headers=_headers(token, tenant_id),
    )
    assert revoked.status_code == 204

    after = await client.get(f"/api/v1/portal/{tenant_slug}/me", headers=portal_headers)
    assert after.status_code == 401


async def test_portal_access_is_customer_scoped(
    client: AsyncClient,
) -> None:
    token_a, tenant_a = await _register(client, "owner-iso-a@example.com", "Empresa A")
    token_b, tenant_b = await _register(client, "owner-iso-b@example.com", "Empresa B")

    customer_a = await _create_customer(client, token_a, tenant_a)

    access_a = await client.post(
        f"/api/v1/customers/{customer_a['id']}/portal-access",
        json={"send_email": False},
        headers=_headers(token_a, tenant_a),
    )
    assert access_a.status_code == 200

    access_b = await client.post(
        f"/api/v1/customers/{customer_a['id']}/portal-access",
        json={"send_email": False},
        headers=_headers(token_b, tenant_b),
    )
    assert access_b.status_code == 404

    revoke_b = await client.post(
        f"/api/v1/customers/{customer_a['id']}/portal-access/revoke",
        headers=_headers(token_b, tenant_b),
    )
    assert revoke_b.status_code == 404


async def test_dev_token_not_returned_in_production(
    client: AsyncClient,
    monkeypatch,
) -> None:
    monkeypatch.setattr(settings, "app_env", "production")
    monkeypatch.setattr(settings, "portal_dev_mode", True)
    monkeypatch.setattr(settings, "portal_dev_tenant_slug", "servicios-demo")

    token, tenant_id = await _register(client, "owner-prod@example.com", "Servicios Demo")
    await _create_customer(client, token, tenant_id)

    request = await client.post(
        "/api/v1/portal/servicios-demo/auth/request",
        json={"email": CUSTOMER["email"]},
    )
    assert request.status_code == 200
    assert request.json().get("dev_token") is None


async def test_portal_access_requires_dispatcher_or_above(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    # Un viewer no puede crear acceso al portal.
    owner_token, tenant_id = await _register(client, "owner-viewer@example.com", "Empresa Viewer")
    customer = await _create_customer(client, owner_token, tenant_id)

    viewer_user = User(
        email="viewer-portal@example.com",
        password_hash=hash_password("super-secret-123"),
        full_name="Viewer",
    )
    db_session.add(viewer_user)
    await db_session.flush()
    db_session.add(Membership(tenant_id=tenant_id, user_id=viewer_user.id, role="viewer"))
    await db_session.commit()

    viewer_token, _ = create_access_token(str(viewer_user.id))

    attempt = await client.post(
        f"/api/v1/customers/{customer['id']}/portal-access",
        json={"send_email": False},
        headers=_headers(viewer_token, tenant_id),
    )
    assert attempt.status_code == 403
