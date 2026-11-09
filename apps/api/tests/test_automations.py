from uuid import UUID

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Membership

CUSTOMER = {
    "name": "Cliente Automatización",
    "phone": "+54 11 5555-5000",
    "email": "auto@example.com",
}


def _headers(token: str, tenant_id: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}", "X-Tenant-ID": tenant_id}


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


async def _create_customer(client: AsyncClient, token: str, tenant_id: str) -> str:
    response = await client.post(
        "/api/v1/customers", json=CUSTOMER, headers=_headers(token, tenant_id)
    )
    assert response.status_code == 201, response.text
    return response.json()["id"]


async def _create_work_order(
    client: AsyncClient, token: str, tenant_id: str, customer_id: str, priority: str = "normal"
) -> str:
    response = await client.post(
        "/api/v1/work-orders",
        json={"customer_id": customer_id, "title": "Orden de prueba", "priority": priority},
        headers=_headers(token, tenant_id),
    )
    assert response.status_code == 201, response.text
    return response.json()["id"]


async def _create_rule(
    client: AsyncClient,
    token: str,
    tenant_id: str,
    event_type: str,
    action_type: str = "notify",
    conditions: dict[str, object] | None = None,
    action_config: dict[str, object] | None = None,
    active: bool = True,
) -> str:
    response = await client.post(
        "/api/v1/automations",
        json={
            "name": f"Regla {event_type}",
            "event_type": event_type,
            "action_type": action_type,
            "conditions": conditions,
            "action_config": action_config,
            "active": active,
        },
        headers=_headers(token, tenant_id),
    )
    assert response.status_code == 201, response.text
    return response.json()["id"]


async def _transition(
    client: AsyncClient, token: str, tenant_id: str, order_id: str, to_status: str
) -> None:
    response = await client.post(
        f"/api/v1/work-orders/{order_id}/transition",
        json={"to_status": to_status},
        headers=_headers(token, tenant_id),
    )
    assert response.status_code == 200, response.text


async def _add_technician(db_session: AsyncSession, tenant_id: str, user_id: str) -> None:
    db_session.add(
        Membership(
            tenant_id=UUID(tenant_id),
            user_id=UUID(user_id),
            role="technician",
        )
    )
    await db_session.commit()


async def test_work_order_transition_creates_notification_and_execution(
    client: AsyncClient,
) -> None:
    token, tenant_id, user_id = await _register(client, "owner-auto@example.com", "Empresa Auto")
    customer_id = await _create_customer(client, token, tenant_id)
    order_id = await _create_work_order(client, token, tenant_id, customer_id)
    await _create_rule(client, token, tenant_id, "work_order_status_changed")

    await _transition(client, token, tenant_id, order_id, "scheduled")

    notifications = await client.get("/api/v1/notifications", headers=_headers(token, tenant_id))
    assert notifications.status_code == 200, notifications.text
    body = notifications.json()
    assert body["total"] == 1
    assert body["unread"] == 1
    assert body["items"][0]["user_id"] == user_id

    executions = await client.get(
        "/api/v1/automations/executions", headers=_headers(token, tenant_id)
    )
    assert executions.status_code == 200, executions.text
    exec_body = executions.json()
    assert len(exec_body) == 1
    assert exec_body[0]["status"] == "success"
    assert exec_body[0]["event_type"] == "work_order_status_changed"


async def test_inactive_rule_does_not_run(client: AsyncClient) -> None:
    token, tenant_id, _ = await _register(client, "owner-inactive@example.com", "Empresa Inactiva")
    customer_id = await _create_customer(client, token, tenant_id)
    order_id = await _create_work_order(client, token, tenant_id, customer_id)
    await _create_rule(client, token, tenant_id, "work_order_status_changed", active=False)

    await _transition(client, token, tenant_id, order_id, "scheduled")

    notifications = await client.get("/api/v1/notifications", headers=_headers(token, tenant_id))
    assert notifications.json()["total"] == 0

    executions = await client.get(
        "/api/v1/automations/executions", headers=_headers(token, tenant_id)
    )
    assert executions.json() == []


async def test_automation_isolation_between_tenants(client: AsyncClient) -> None:
    token_a, tenant_a, _ = await _register(client, "owner-a-auto@example.com", "Empresa A")
    customer_a = await _create_customer(client, token_a, tenant_a)
    order_a = await _create_work_order(client, token_a, tenant_a, customer_a)
    await _create_rule(client, token_a, tenant_a, "work_order_status_changed")

    token_b, tenant_b, _ = await _register(client, "owner-b-auto@example.com", "Empresa B")
    customer_b = await _create_customer(client, token_b, tenant_b)
    await _create_work_order(client, token_b, tenant_b, customer_b)

    await _transition(client, token_a, tenant_a, order_a, "scheduled")

    notifications_a = await client.get("/api/v1/notifications", headers=_headers(token_a, tenant_a))
    assert notifications_a.json()["total"] == 1

    notifications_b = await client.get("/api/v1/notifications", headers=_headers(token_b, tenant_b))
    assert notifications_b.json()["total"] == 0

    executions_b = await client.get(
        "/api/v1/automations/executions", headers=_headers(token_b, tenant_b)
    )
    assert executions_b.json() == []


async def test_condition_priority_gte(client: AsyncClient) -> None:
    token, tenant_id, _ = await _register(client, "owner-priority@example.com", "Empresa Prioridad")
    customer_id = await _create_customer(client, token, tenant_id)
    await _create_rule(
        client,
        token,
        tenant_id,
        "work_order_status_changed",
        conditions={"priority__gte": "high"},
    )

    order_normal = await _create_work_order(
        client, token, tenant_id, customer_id, priority="normal"
    )
    order_high = await _create_work_order(client, token, tenant_id, customer_id, priority="high")

    await _transition(client, token, tenant_id, order_normal, "scheduled")
    await _transition(client, token, tenant_id, order_high, "scheduled")

    executions = await client.get(
        "/api/v1/automations/executions", headers=_headers(token, tenant_id)
    )
    exec_body = executions.json()
    assert len(exec_body) == 1
    assert exec_body[0]["status"] == "success"

    notifications = await client.get("/api/v1/notifications", headers=_headers(token, tenant_id))
    assert notifications.json()["total"] == 1


async def test_read_and_read_all_notifications(client: AsyncClient) -> None:
    token, tenant_id, _ = await _register(client, "owner-read@example.com", "Empresa Read")
    customer_id = await _create_customer(client, token, tenant_id)
    order_id = await _create_work_order(client, token, tenant_id, customer_id)
    await _create_rule(client, token, tenant_id, "work_order_status_changed")

    await _transition(client, token, tenant_id, order_id, "scheduled")
    await _transition(client, token, tenant_id, order_id, "in_progress")

    notifications = await client.get("/api/v1/notifications", headers=_headers(token, tenant_id))
    items = notifications.json()["items"]
    assert len(items) == 2

    first_id = items[1]["id"]
    read = await client.post(
        f"/api/v1/notifications/{first_id}/read", headers=_headers(token, tenant_id)
    )
    assert read.status_code == 200, read.text
    assert read.json()["read_at"] is not None

    unread_before = await client.get("/api/v1/notifications", headers=_headers(token, tenant_id))
    assert unread_before.json()["unread"] == 1

    read_all = await client.post(
        "/api/v1/notifications/read-all", headers=_headers(token, tenant_id)
    )
    assert read_all.status_code == 200, read_all.text
    assert read_all.json()["message"] == "1 notifications marked as read"

    unread_after = await client.get("/api/v1/notifications", headers=_headers(token, tenant_id))
    assert unread_after.json()["unread"] == 0


async def test_technician_only_sees_own_notifications(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    owner_token, tenant_id, owner_id = await _register(
        client, "owner-tech@example.com", "Empresa Tech"
    )
    tech_token, _, tech_user_id = await _register(client, "tech-auto@example.com", "Tech Co")
    await _add_technician(db_session, tenant_id, tech_user_id)
    customer_id = await _create_customer(client, owner_token, tenant_id)
    order_id = await _create_work_order(client, owner_token, tenant_id, customer_id)
    rule_id = await _create_rule(
        client,
        owner_token,
        tenant_id,
        "work_order_status_changed",
        action_config={"user_ids": [owner_id]},
    )

    await _transition(client, owner_token, tenant_id, order_id, "scheduled")

    owner_notifications = await client.get(
        "/api/v1/notifications", headers=_headers(owner_token, tenant_id)
    )
    assert owner_notifications.json()["total"] == 1

    tech_notifications = await client.get(
        "/api/v1/notifications", headers=_headers(tech_token, tenant_id)
    )
    assert tech_notifications.json()["total"] == 0

    await client.patch(
        f"/api/v1/automations/{rule_id}",
        json={"action_config": {"user_ids": [owner_id, tech_user_id]}},
        headers=_headers(owner_token, tenant_id),
    )

    await _transition(client, owner_token, tenant_id, order_id, "in_progress")

    tech_notifications_2 = await client.get(
        "/api/v1/notifications", headers=_headers(tech_token, tenant_id)
    )
    assert tech_notifications_2.json()["total"] == 1


async def test_send_whatsapp_action_is_skipped(client: AsyncClient) -> None:
    token, tenant_id, _ = await _register(client, "owner-wa@example.com", "Empresa WA")
    customer_id = await _create_customer(client, token, tenant_id)
    order_id = await _create_work_order(client, token, tenant_id, customer_id)
    await _create_rule(
        client, token, tenant_id, "work_order_status_changed", action_type="send_whatsapp"
    )

    await _transition(client, token, tenant_id, order_id, "scheduled")

    executions = await client.get(
        "/api/v1/automations/executions", headers=_headers(token, tenant_id)
    )
    exec_body = executions.json()
    assert len(exec_body) == 1
    assert exec_body[0]["status"] == "skipped"
    assert "WhatsApp no configurado" in exec_body[0]["error"]

    notifications = await client.get("/api/v1/notifications", headers=_headers(token, tenant_id))
    assert notifications.json()["total"] == 0
