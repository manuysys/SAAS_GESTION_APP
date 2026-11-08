from datetime import UTC, datetime, timedelta
from uuid import UUID

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Membership

CUSTOMER = {
    "name": "Cliente Ordenes",
    "phone": "+54 11 5555-1000",
    "email": "ordenes@example.com",
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


async def test_request_conversion_and_transitions(client: AsyncClient) -> None:
    token, tenant_id, _ = await _register(client, "owner-a@example.com", "Empresa A")
    customer_id = await _create_customer(client, token, tenant_id)

    request_response = await client.post(
        "/api/v1/service-requests",
        json={
            "customer_id": customer_id,
            "title": "Equipo no enciende",
            "description": "Consulta recibida por WhatsApp",
            "priority": "high",
            "source": "whatsapp",
        },
        headers=_headers(token, tenant_id),
    )
    assert request_response.status_code == 201, request_response.text
    request_id = request_response.json()["id"]

    convert = await client.post(
        f"/api/v1/service-requests/{request_id}/convert",
        json={},
        headers=_headers(token, tenant_id),
    )
    assert convert.status_code == 201, convert.text
    order = convert.json()
    assert order["code"].startswith("WO-")
    assert order["service_request_id"] == request_id
    assert order["operational_status"] == "new"

    updated_request = await client.get(
        f"/api/v1/service-requests/{request_id}", headers=_headers(token, tenant_id)
    )
    assert updated_request.json()["status"] == "converted"

    listed = await client.get("/api/v1/work-orders", headers=_headers(token, tenant_id))
    assert listed.status_code == 200, listed.text
    assert listed.json()["total"] == 1

    order_id = order["id"]
    for target in ("scheduled", "in_progress", "finished"):
        transition = await client.post(
            f"/api/v1/work-orders/{order_id}/transition",
            json={"to_status": target},
            headers=_headers(token, tenant_id),
        )
        assert transition.status_code == 200, transition.text

    final = await client.get(f"/api/v1/work-orders/{order_id}", headers=_headers(token, tenant_id))
    assert final.json()["operational_status"] == "finished"
    assert final.json()["started_at"] is not None
    assert final.json()["finished_at"] is not None

    events = await client.get(
        f"/api/v1/work-orders/{order_id}/events", headers=_headers(token, tenant_id)
    )
    assert events.status_code == 200, events.text
    event_types = [event["event_type"] for event in events.json()]
    assert "created_from_request" in event_types
    assert event_types.count("status_changed") == 3

    invalid = await client.post(
        f"/api/v1/work-orders/{order_id}/transition",
        json={"to_status": "in_progress"},
        headers=_headers(token, tenant_id),
    )
    assert invalid.status_code == 409


async def test_work_order_isolation_between_tenants(client: AsyncClient) -> None:
    token_a, tenant_a, _ = await _register(client, "owner-a@example.com", "Empresa A")
    token_b, tenant_b, _ = await _register(client, "owner-b@example.com", "Empresa B")
    customer_a = await _create_customer(client, token_a, tenant_a)

    created = await client.post(
        "/api/v1/work-orders",
        json={"customer_id": customer_a, "title": "Orden privada"},
        headers=_headers(token_a, tenant_a),
    )
    assert created.status_code == 201, created.text
    order_id = created.json()["id"]

    read_by_b = await client.get(
        f"/api/v1/work-orders/{order_id}", headers=_headers(token_b, tenant_b)
    )
    assert read_by_b.status_code == 404

    transition_by_b = await client.post(
        f"/api/v1/work-orders/{order_id}/transition",
        json={"to_status": "scheduled"},
        headers=_headers(token_b, tenant_b),
    )
    assert transition_by_b.status_code == 404


async def test_technician_only_sees_and_moves_assigned_orders(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    owner_token, tenant_id, _ = await _register(client, "owner-a@example.com", "Empresa A")
    tech_token, _, tech_user_id = await _register(client, "tech@example.com", "Tech Co")
    customer_id = await _create_customer(client, owner_token, tenant_id)

    db_session.add(
        Membership(
            tenant_id=UUID(tenant_id),
            user_id=UUID(tech_user_id),
            role="technician",
        )
    )
    await db_session.commit()

    scheduled_at = datetime.now(UTC) + timedelta(days=1)
    assigned = await client.post(
        "/api/v1/work-orders",
        json={
            "customer_id": customer_id,
            "title": "Visita asignada",
            "assigned_user_id": tech_user_id,
            "scheduled_at": scheduled_at.isoformat(),
        },
        headers=_headers(owner_token, tenant_id),
    )
    assert assigned.status_code == 201, assigned.text
    assigned_order = assigned.json()
    assert assigned_order["operational_status"] == "scheduled"

    unassigned = await client.post(
        "/api/v1/work-orders",
        json={"customer_id": customer_id, "title": "Visita de otro tecnico"},
        headers=_headers(owner_token, tenant_id),
    )
    assert unassigned.status_code == 201, unassigned.text
    unassigned_id = unassigned.json()["id"]

    tech_list = await client.get("/api/v1/work-orders", headers=_headers(tech_token, tenant_id))
    assert tech_list.status_code == 200, tech_list.text
    assert tech_list.json()["total"] == 1
    assert tech_list.json()["items"][0]["id"] == assigned_order["id"]

    read_other = await client.get(
        f"/api/v1/work-orders/{unassigned_id}", headers=_headers(tech_token, tenant_id)
    )
    assert read_other.status_code == 404

    move = await client.post(
        f"/api/v1/work-orders/{assigned_order['id']}/transition",
        json={"to_status": "in_progress"},
        headers=_headers(tech_token, tenant_id),
    )
    assert move.status_code == 200, move.text

    move_other = await client.post(
        f"/api/v1/work-orders/{unassigned_id}/transition",
        json={"to_status": "scheduled"},
        headers=_headers(tech_token, tenant_id),
    )
    assert move_other.status_code == 404

    # El técnico no puede crear órdenes.
    forbidden_create = await client.post(
        "/api/v1/work-orders",
        json={"customer_id": customer_id, "title": "No permitida"},
        headers=_headers(tech_token, tenant_id),
    )
    assert forbidden_create.status_code == 403
