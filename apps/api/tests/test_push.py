from unittest.mock import patch
from uuid import UUID

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Membership

CUSTOMER = {
    "name": "Cliente Push",
    "phone": "+54 11 5555-3000",
    "email": "push@example.com",
}

_IMAGE_BYTES = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xff\xd9"


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


async def _add_technician(db_session: AsyncSession, tenant_id: str, user_id: str) -> None:
    from sqlalchemy import select

    result = await db_session.execute(
        select(Membership).where(
            Membership.tenant_id == UUID(tenant_id),
            Membership.user_id == UUID(user_id),
        )
    )
    membership = result.scalar_one_or_none()
    if membership is None:
        db_session.add(
            Membership(
                tenant_id=UUID(tenant_id),
                user_id=UUID(user_id),
                role="technician",
            )
        )
    else:
        membership.role = "technician"
    await db_session.commit()


async def _create_customer(client: AsyncClient, token: str, tenant_id: str) -> str:
    response = await client.post(
        "/api/v1/customers", json=CUSTOMER, headers=_headers(token, tenant_id)
    )
    assert response.status_code == 201, response.text
    return response.json()["id"]


async def test_register_device_token_and_delete(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    _owner_token, tenant_id, _ = await _register(client, "owner-push@example.com", "Empresa Push")
    tech_token, _, tech_user_id = await _register(client, "tech-push@example.com", "Tech Push")
    await _add_technician(db_session, tenant_id, tech_user_id)

    register = await client.post(
        "/api/v1/notifications/devices",
        json={"token": "ExponentPushToken[test123]", "platform": "android"},
        headers=_headers(tech_token, tenant_id),
    )
    assert register.status_code == 204, register.text

    delete = await client.delete(
        "/api/v1/notifications/devices/ExponentPushToken[test123]",
        headers=_headers(tech_token, tenant_id),
    )
    assert delete.status_code == 204, delete.text


async def test_push_sent_on_assignment(client: AsyncClient, db_session: AsyncSession) -> None:
    owner_token, tenant_id, _ = await _register(client, "owner-push2@example.com", "Empresa Push2")
    tech_token, _, tech_user_id = await _register(client, "tech-push2@example.com", "Tech Push2")
    await _add_technician(db_session, tenant_id, tech_user_id)

    await client.post(
        "/api/v1/notifications/devices",
        json={"token": "ExponentPushToken[assignment]", "platform": "android"},
        headers=_headers(tech_token, tenant_id),
    )

    customer_id = await _create_customer(client, owner_token, tenant_id)

    with patch("app.services.push_service.send_push_to_user") as mock_send:
        order = await client.post(
            "/api/v1/work-orders",
            json={
                "customer_id": customer_id,
                "title": "Orden con push",
                "assigned_user_id": tech_user_id,
            },
            headers=_headers(owner_token, tenant_id),
        )
        assert order.status_code == 201, order.text
        mock_send.assert_awaited_once()
        args = mock_send.call_args
        assert args.kwargs["user_id"] == UUID(tech_user_id)
        assert args.kwargs["title"] == "Nueva orden asignada"
