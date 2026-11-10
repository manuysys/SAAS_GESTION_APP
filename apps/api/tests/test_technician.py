from uuid import UUID

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Membership

CUSTOMER = {
    "name": "Cliente Técnico",
    "phone": "+54 11 5555-2000",
    "email": "tecnico@example.com",
    "address": "Av. Siempre Viva 742",
    "city": "CABA",
    "province": "Buenos Aires",
    "postal_code": "1425",
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


async def _create_customer(client: AsyncClient, token: str, tenant_id: str) -> str:
    response = await client.post(
        "/api/v1/customers", json=CUSTOMER, headers=_headers(token, tenant_id)
    )
    assert response.status_code == 201, response.text
    return response.json()["id"]


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


async def test_technician_only_sees_assigned_orders(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    owner_token, tenant_id, _ = await _register(client, "owner-tech@example.com", "Empresa T")
    tech_token, _, tech_user_id = await _register(client, "tech-only@example.com", "Tech Only")
    await _add_technician(db_session, tenant_id, tech_user_id)
    customer_id = await _create_customer(client, owner_token, tenant_id)

    assigned = await client.post(
        "/api/v1/work-orders",
        json={
            "customer_id": customer_id,
            "title": "Visita asignada",
            "assigned_user_id": tech_user_id,
        },
        headers=_headers(owner_token, tenant_id),
    )
    assert assigned.status_code == 201, assigned.text
    assigned_id = assigned.json()["id"]

    unassigned = await client.post(
        "/api/v1/work-orders",
        json={"customer_id": customer_id, "title": "Visita sin asignar"},
        headers=_headers(owner_token, tenant_id),
    )
    assert unassigned.status_code == 201, unassigned.text
    unassigned_id = unassigned.json()["id"]

    tech_list = await client.get(
        "/api/v1/technician/work-orders", headers=_headers(tech_token, tenant_id)
    )
    assert tech_list.status_code == 200, tech_list.text
    body = tech_list.json()
    assert body["total"] == 1
    assert body["items"][0]["id"] == assigned_id
    assert body["items"][0]["customer_name"] == CUSTOMER["name"]
    assert body["items"][0]["customer_phone"] == CUSTOMER["phone"]
    assert body["items"][0]["customer_address"] == CUSTOMER["address"]
    assert body["items"][0]["customer_city"] == CUSTOMER["city"]

    read_assigned = await client.get(
        f"/api/v1/technician/work-orders/{assigned_id}",
        headers=_headers(tech_token, tenant_id),
    )
    assert read_assigned.status_code == 200, read_assigned.text
    assert read_assigned.json()["customer_name"] == CUSTOMER["name"]

    read_other = await client.get(
        f"/api/v1/technician/work-orders/{unassigned_id}",
        headers=_headers(tech_token, tenant_id),
    )
    assert read_other.status_code == 404


async def test_technician_transitions(client: AsyncClient, db_session: AsyncSession) -> None:
    owner_token, tenant_id, _ = await _register(client, "owner-trans@example.com", "Empresa T2")
    tech_token, _, tech_user_id = await _register(client, "tech-trans@example.com", "Tech T2")
    await _add_technician(db_session, tenant_id, tech_user_id)
    customer_id = await _create_customer(client, owner_token, tenant_id)

    order = await client.post(
        "/api/v1/work-orders",
        json={
            "customer_id": customer_id,
            "title": "Orden de transición",
            "assigned_user_id": tech_user_id,
        },
        headers=_headers(owner_token, tenant_id),
    )
    assert order.status_code == 201, order.text
    order_id = order.json()["id"]

    # El técnico no puede mover de new a scheduled.
    forbidden = await client.post(
        f"/api/v1/technician/work-orders/{order_id}/transition",
        json={"to_status": "scheduled"},
        headers=_headers(tech_token, tenant_id),
    )
    assert forbidden.status_code == 403, forbidden.text

    # El owner programa la orden.
    schedule = await client.post(
        f"/api/v1/work-orders/{order_id}/transition",
        json={"to_status": "scheduled"},
        headers=_headers(owner_token, tenant_id),
    )
    assert schedule.status_code == 200, schedule.text

    # El técnico puede iniciarla.
    start = await client.post(
        f"/api/v1/technician/work-orders/{order_id}/transition",
        json={"to_status": "in_progress"},
        headers=_headers(tech_token, tenant_id),
    )
    assert start.status_code == 200, start.text
    assert start.json()["operational_status"] == "in_progress"

    # El técnico no puede regresar a scheduled.
    invalid = await client.post(
        f"/api/v1/technician/work-orders/{order_id}/transition",
        json={"to_status": "scheduled"},
        headers=_headers(tech_token, tenant_id),
    )
    assert invalid.status_code in (403, 409), invalid.text


async def test_technician_note_material_and_attachment(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    owner_token, tenant_id, _ = await _register(client, "owner-note@example.com", "Empresa N")
    tech_token, _, tech_user_id = await _register(client, "tech-note@example.com", "Tech N")
    await _add_technician(db_session, tenant_id, tech_user_id)
    customer_id = await _create_customer(client, owner_token, tenant_id)

    order = await client.post(
        "/api/v1/work-orders",
        json={
            "customer_id": customer_id,
            "title": "Orden con notas",
            "assigned_user_id": tech_user_id,
        },
        headers=_headers(owner_token, tenant_id),
    )
    assert order.status_code == 201, order.text
    order_id = order.json()["id"]

    note = await client.post(
        f"/api/v1/technician/work-orders/{order_id}/notes",
        json={"notes": "Llegué al domicilio y no había nadie"},
        headers=_headers(tech_token, tenant_id),
    )
    assert note.status_code == 200, note.text

    events = await client.get(
        f"/api/v1/work-orders/{order_id}/events", headers=_headers(owner_token, tenant_id)
    )
    assert events.status_code == 200, events.text
    note_events = [e for e in events.json() if e["event_type"] == "note"]
    assert len(note_events) == 1
    assert note_events[0]["payload"]["notes"] == "Llegué al domicilio y no había nadie"

    material = await client.post(
        f"/api/v1/technician/work-orders/{order_id}/materials",
        json={"description": "Cable UTP", "quantity": "2.500", "unit": "metros"},
        headers=_headers(tech_token, tenant_id),
    )
    assert material.status_code == 201, material.text
    assert material.json()["description"] == "Cable UTP"

    materials = await client.get(
        f"/api/v1/technician/work-orders/{order_id}/materials",
        headers=_headers(tech_token, tenant_id),
    )
    assert materials.status_code == 200, materials.text
    assert len(materials.json()) == 1

    upload = await client.post(
        f"/api/v1/technician/work-orders/{order_id}/attachments",
        files={"file": ("photo.jpg", _IMAGE_BYTES, "image/jpeg")},
        headers=_headers(tech_token, tenant_id),
    )
    assert upload.status_code == 201, upload.text
    attachment_id = upload.json()["id"]
    assert upload.json()["size_bytes"] == len(_IMAGE_BYTES)

    attachments = await client.get(
        f"/api/v1/technician/work-orders/{order_id}/attachments",
        headers=_headers(tech_token, tenant_id),
    )
    assert attachments.status_code == 200, attachments.text
    assert len(attachments.json()) == 1

    download = await client.get(
        f"/api/v1/technician/work-orders/{order_id}/attachments/{attachment_id}",
        headers=_headers(tech_token, tenant_id),
    )
    assert download.status_code == 200, download.text
    assert download.content == _IMAGE_BYTES
    assert download.headers["content-type"] == "image/jpeg"


async def test_technician_isolation_from_other_technician_and_tenant(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    owner_token, tenant_id, _ = await _register(client, "owner-iso@example.com", "Empresa I")
    _tech1_token, _, tech1_id = await _register(client, "tech1-iso@example.com", "Tech1 I")
    tech2_token, _, tech2_id = await _register(client, "tech2-iso@example.com", "Tech2 I")
    other_tech_token, other_tenant, other_tech_id = await _register(
        client, "tech-otro@example.com", "Otra Empresa"
    )
    await _add_technician(db_session, tenant_id, tech1_id)
    await _add_technician(db_session, tenant_id, tech2_id)
    await _add_technician(db_session, other_tenant, other_tech_id)
    customer_id = await _create_customer(client, owner_token, tenant_id)

    order = await client.post(
        "/api/v1/work-orders",
        json={
            "customer_id": customer_id,
            "title": "Orden aislada",
            "assigned_user_id": tech1_id,
        },
        headers=_headers(owner_token, tenant_id),
    )
    assert order.status_code == 201, order.text
    order_id = order.json()["id"]

    other_tech_read = await client.get(
        f"/api/v1/technician/work-orders/{order_id}",
        headers=_headers(tech2_token, tenant_id),
    )
    assert other_tech_read.status_code == 404

    other_tech_transition = await client.post(
        f"/api/v1/technician/work-orders/{order_id}/transition",
        json={"to_status": "in_progress"},
        headers=_headers(tech2_token, tenant_id),
    )
    assert other_tech_transition.status_code == 404

    other_tenant_read = await client.get(
        f"/api/v1/technician/work-orders/{order_id}",
        headers=_headers(other_tech_token, other_tenant),
    )
    assert other_tenant_read.status_code == 404


async def test_attachment_validation(client: AsyncClient, db_session: AsyncSession) -> None:
    owner_token, tenant_id, _ = await _register(client, "owner-attach@example.com", "Empresa A2")
    tech_token, _, tech_user_id = await _register(client, "tech-attach@example.com", "Tech A2")
    await _add_technician(db_session, tenant_id, tech_user_id)
    customer_id = await _create_customer(client, owner_token, tenant_id)

    order = await client.post(
        "/api/v1/work-orders",
        json={
            "customer_id": customer_id,
            "title": "Orden adjuntos",
            "assigned_user_id": tech_user_id,
        },
        headers=_headers(owner_token, tenant_id),
    )
    assert order.status_code == 201, order.text
    order_id = order.json()["id"]

    invalid_mime = await client.post(
        f"/api/v1/technician/work-orders/{order_id}/attachments",
        files={"file": ("doc.txt", b"contenido", "text/plain")},
        headers=_headers(tech_token, tenant_id),
    )
    assert invalid_mime.status_code == 422, invalid_mime.text

    large_bytes = b"x" * (5 * 1024 * 1024 + 1)
    too_large = await client.post(
        f"/api/v1/technician/work-orders/{order_id}/attachments",
        files={"file": ("big.jpg", large_bytes, "image/jpeg")},
        headers=_headers(tech_token, tenant_id),
    )
    assert too_large.status_code == 422, too_large.text


async def test_technician_idempotency(client: AsyncClient, db_session: AsyncSession) -> None:
    owner_token, tenant_id, _ = await _register(client, "owner-idem@example.com", "Empresa I")
    tech_token, _, tech_user_id = await _register(client, "tech-idem@example.com", "Tech I")
    await _add_technician(db_session, tenant_id, tech_user_id)
    customer_id = await _create_customer(client, owner_token, tenant_id)

    order = await client.post(
        "/api/v1/work-orders",
        json={
            "customer_id": customer_id,
            "title": "Orden idempotente",
            "assigned_user_id": tech_user_id,
        },
        headers=_headers(owner_token, tenant_id),
    )
    assert order.status_code == 201, order.text
    order_id = order.json()["id"]

    client_request_id = "idem-note-001"
    first = await client.post(
        f"/api/v1/technician/work-orders/{order_id}/notes",
        json={"notes": "Nota idempotente", "client_request_id": client_request_id},
        headers=_headers(tech_token, tenant_id),
    )
    assert first.status_code == 200, first.text

    second = await client.post(
        f"/api/v1/technician/work-orders/{order_id}/notes",
        json={"notes": "Nota idempotente", "client_request_id": client_request_id},
        headers=_headers(tech_token, tenant_id),
    )
    assert second.status_code == 200, second.text

    events = await client.get(
        f"/api/v1/work-orders/{order_id}/events", headers=_headers(owner_token, tenant_id)
    )
    note_events = [e for e in events.json() if e["event_type"] == "note"]
    assert len(note_events) == 1

    material_first = await client.post(
        f"/api/v1/technician/work-orders/{order_id}/materials",
        json={
            "description": "Cable",
            "quantity": "1.000",
            "unit": "m",
            "client_request_id": "idem-material-001",
        },
        headers=_headers(tech_token, tenant_id),
    )
    assert material_first.status_code == 201, material_first.text
    material_id = material_first.json()["id"]

    material_second = await client.post(
        f"/api/v1/technician/work-orders/{order_id}/materials",
        json={
            "description": "Cable",
            "quantity": "1.000",
            "unit": "m",
            "client_request_id": "idem-material-001",
        },
        headers=_headers(tech_token, tenant_id),
    )
    assert material_second.status_code == 201, material_second.text
    assert material_second.json()["id"] == material_id

    attachment_first = await client.post(
        f"/api/v1/technician/work-orders/{order_id}/attachments",
        files={"file": ("photo.jpg", _IMAGE_BYTES, "image/jpeg")},
        data={"client_request_id": "idem-attach-001"},
        headers=_headers(tech_token, tenant_id),
    )
    assert attachment_first.status_code == 201, attachment_first.text
    attachment_id = attachment_first.json()["id"]

    attachment_second = await client.post(
        f"/api/v1/technician/work-orders/{order_id}/attachments",
        files={"file": ("photo.jpg", _IMAGE_BYTES, "image/jpeg")},
        data={"client_request_id": "idem-attach-001"},
        headers=_headers(tech_token, tenant_id),
    )
    assert attachment_second.status_code == 201, attachment_second.text
    assert attachment_second.json()["id"] == attachment_id
