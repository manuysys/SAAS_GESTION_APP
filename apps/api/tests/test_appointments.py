from datetime import UTC, datetime, timedelta
from uuid import UUID

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Membership

CUSTOMER = {
    "name": "Cliente Turnos",
    "phone": "+54 11 5555-3000",
    "email": "turnos@example.com",
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


def _appointment_payload(work_order_id: str, technician_id: str, start: datetime) -> dict:
    return {
        "work_order_id": work_order_id,
        "technician_id": technician_id,
        "starts_at": start.isoformat(),
        "ends_at": (start + timedelta(hours=1)).isoformat(),
    }


async def test_create_appointment_assigns_work_order(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    owner_token, tenant_id, _ = await _register(client, "owner-a@example.com", "Empresa A")
    _, _, tech_user_id = await _register(client, "tech@example.com", "Tech Co")
    await _add_technician(db_session, tenant_id, tech_user_id)
    customer_id = await _create_customer(client, owner_token, tenant_id)
    work_order_id = await _create_work_order(client, owner_token, tenant_id, customer_id)

    start = datetime.now(UTC) + timedelta(days=1)
    response = await client.post(
        "/api/v1/appointments",
        json=_appointment_payload(work_order_id, tech_user_id, start),
        headers=_headers(owner_token, tenant_id),
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["work_order_id"] == work_order_id
    assert body["technician_id"] == tech_user_id
    assert body["status"] == "scheduled"

    order = await client.get(
        f"/api/v1/work-orders/{work_order_id}", headers=_headers(owner_token, tenant_id)
    )
    assert order.status_code == 200, order.text
    order_body = order.json()
    assert order_body["operational_status"] == "scheduled"
    assert order_body["assigned_user_id"] == tech_user_id
    assert order_body["scheduled_at"] is not None


async def test_create_appointment_conflict_returns_409(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    owner_token, tenant_id, _ = await _register(client, "owner-a@example.com", "Empresa A")
    _tech_token, _, tech_user_id = await _register(client, "tech@example.com", "Tech Co")
    await _add_technician(db_session, tenant_id, tech_user_id)
    customer_id = await _create_customer(client, owner_token, tenant_id)
    work_order_id = await _create_work_order(client, owner_token, tenant_id, customer_id)

    start = datetime.now(UTC) + timedelta(days=1)
    first = await client.post(
        "/api/v1/appointments",
        json=_appointment_payload(work_order_id, tech_user_id, start),
        headers=_headers(owner_token, tenant_id),
    )
    assert first.status_code == 201, first.text

    second = await client.post(
        "/api/v1/appointments",
        json=_appointment_payload(work_order_id, tech_user_id, start + timedelta(minutes=30)),
        headers=_headers(owner_token, tenant_id),
    )
    assert second.status_code == 409


async def test_cancel_appointment(client: AsyncClient, db_session: AsyncSession) -> None:
    owner_token, tenant_id, _ = await _register(client, "owner-a@example.com", "Empresa A")
    _tech_token, _, tech_user_id = await _register(client, "tech@example.com", "Tech Co")
    await _add_technician(db_session, tenant_id, tech_user_id)
    customer_id = await _create_customer(client, owner_token, tenant_id)
    work_order_id = await _create_work_order(client, owner_token, tenant_id, customer_id)

    start = datetime.now(UTC) + timedelta(days=1)
    created = await client.post(
        "/api/v1/appointments",
        json=_appointment_payload(work_order_id, tech_user_id, start),
        headers=_headers(owner_token, tenant_id),
    )
    assert created.status_code == 201, created.text
    appointment_id = created.json()["id"]

    cancelled = await client.post(
        f"/api/v1/appointments/{appointment_id}/cancel",
        headers=_headers(owner_token, tenant_id),
    )
    assert cancelled.status_code == 200, cancelled.text
    assert cancelled.json()["status"] == "cancelled"

    double_cancel = await client.post(
        f"/api/v1/appointments/{appointment_id}/cancel",
        headers=_headers(owner_token, tenant_id),
    )
    assert double_cancel.status_code == 409


async def test_technician_sees_only_own_appointments(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    owner_token, tenant_id, _ = await _register(client, "owner-a@example.com", "Empresa A")
    tech_a_token, _, tech_a_id = await _register(client, "tech-a@example.com", "Tech A")
    _tech_b_token, _, tech_b_id = await _register(client, "tech-b@example.com", "Tech B")
    await _add_technician(db_session, tenant_id, tech_a_id)
    await _add_technician(db_session, tenant_id, tech_b_id)
    customer_id = await _create_customer(client, owner_token, tenant_id)
    work_order_id = await _create_work_order(client, owner_token, tenant_id, customer_id)

    start = datetime.now(UTC) + timedelta(days=1)
    own = await client.post(
        "/api/v1/appointments",
        json=_appointment_payload(work_order_id, tech_a_id, start),
        headers=_headers(owner_token, tenant_id),
    )
    assert own.status_code == 201, own.text
    own_id = own.json()["id"]

    other = await client.post(
        "/api/v1/appointments",
        json=_appointment_payload(work_order_id, tech_b_id, start + timedelta(hours=2)),
        headers=_headers(owner_token, tenant_id),
    )
    assert other.status_code == 201, other.text

    tech_list = await client.get("/api/v1/appointments", headers=_headers(tech_a_token, tenant_id))
    assert tech_list.status_code == 200, tech_list.text
    assert tech_list.json()["total"] == 1
    assert tech_list.json()["items"][0]["id"] == own_id

    tech_create = await client.post(
        "/api/v1/appointments",
        json=_appointment_payload(work_order_id, tech_a_id, start + timedelta(hours=4)),
        headers=_headers(tech_a_token, tenant_id),
    )
    assert tech_create.status_code == 403


async def test_appointment_isolation_between_tenants(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    token_a, tenant_a, _ = await _register(client, "owner-a@example.com", "Empresa A")
    token_b, tenant_b, _ = await _register(client, "owner-b@example.com", "Empresa B")
    _tech_token, _, tech_user_id = await _register(client, "tech@example.com", "Tech Co")
    await _add_technician(db_session, tenant_a, tech_user_id)
    customer_a = await _create_customer(client, token_a, tenant_a)
    work_order_id = await _create_work_order(client, token_a, tenant_a, customer_a)

    start = datetime.now(UTC) + timedelta(days=1)
    created = await client.post(
        "/api/v1/appointments",
        json=_appointment_payload(work_order_id, tech_user_id, start),
        headers=_headers(token_a, tenant_a),
    )
    assert created.status_code == 201, created.text
    appointment_id = created.json()["id"]

    read_by_b = await client.get(
        f"/api/v1/appointments/{appointment_id}", headers=_headers(token_b, tenant_b)
    )
    assert read_by_b.status_code == 404


async def test_create_appointment_rejects_finished_work_order(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    owner_token, tenant_id, _ = await _register(client, "owner-a@example.com", "Empresa A")
    _tech_token, _, tech_user_id = await _register(client, "tech@example.com", "Tech Co")
    await _add_technician(db_session, tenant_id, tech_user_id)
    customer_id = await _create_customer(client, owner_token, tenant_id)
    work_order_id = await _create_work_order(client, owner_token, tenant_id, customer_id)

    for target in ("scheduled", "in_progress", "finished"):
        transition = await client.post(
            f"/api/v1/work-orders/{work_order_id}/transition",
            json={"to_status": target},
            headers=_headers(owner_token, tenant_id),
        )
        assert transition.status_code == 200, transition.text

    start = datetime.now(UTC) + timedelta(days=1)
    response = await client.post(
        "/api/v1/appointments",
        json=_appointment_payload(work_order_id, tech_user_id, start),
        headers=_headers(owner_token, tenant_id),
    )
    assert response.status_code == 409
