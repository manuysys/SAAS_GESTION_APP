from __future__ import annotations

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models import Membership, Tenant, User


async def _register(
    client: AsyncClient, email: str, company: str, role: str = "owner"
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


async def _login(client: AsyncClient, email: str) -> tuple[str, str]:
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "super-secret-123"},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    return body["access_token"], body["tenants"][0]["id"]


def _headers(token: str, tenant_id: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}", "X-Tenant-ID": tenant_id}


@pytest.fixture
async def owner(client: AsyncClient) -> tuple[str, str]:
    return await _register(client, "owner-onboarding@example.com", "Onboarding Test")


@pytest.fixture
async def technician(
    client: AsyncClient,
    db_session: AsyncSession,
    owner: tuple[str, str],
) -> tuple[str, str]:
    _token, tenant_id = owner
    user = User(
        email="tech-onboarding@example.com",
        password_hash=hash_password("super-secret-123"),
        full_name="Tech User",
    )
    db_session.add(user)
    await db_session.flush()
    membership = Membership(
        tenant_id=tenant_id,
        user_id=user.id,
        role="technician",
        status="active",
    )
    db_session.add(membership)
    await db_session.commit()
    token, _ = await _login(client, "tech-onboarding@example.com")
    return token, tenant_id


async def test_get_onboarding_returns_default_state(
    client: AsyncClient, owner: tuple[str, str]
) -> None:
    token, tenant_id = owner
    response = await client.get("/api/v1/onboarding", headers=_headers(token, tenant_id))
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["completed"] is False
    assert body["state"]["step"] == 1
    assert body["state"]["company"]["name"] == "Mi Empresa"
    assert body["state"]["team_invited"] is False
    assert body["state"]["first_customer"] is False


async def test_patch_onboarding_merges_partial_state(
    client: AsyncClient, owner: tuple[str, str]
) -> None:
    token, tenant_id = owner

    patch = {
        "step": 2,
        "company": {"name": "Servicios Demo", "timezone": "America/Argentina/Buenos_Aires"},
        "services": [{"name": "Instalación", "duration_minutes": 60, "price": "15000.00"}],
        "schedule": {
            "monday": {"start": "08:00", "end": "17:00"},
            "saturday": {"start": "09:00", "end": "13:00"},
        },
        "team_invited": True,
    }
    response = await client.patch(
        "/api/v1/onboarding", json=patch, headers=_headers(token, tenant_id)
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["state"]["step"] == 2
    assert body["state"]["company"]["name"] == "Servicios Demo"
    assert body["state"]["company"]["currency"] == "ARS"
    assert body["state"]["team_invited"] is True
    assert body["state"]["first_customer"] is False
    # Schedule se reemplaza completo: solo los dias enviados permanecen.
    assert body["state"]["schedule"]["monday"]["start"] == "08:00"
    assert "tuesday" not in body["state"]["schedule"]
    assert body["state"]["schedule"]["saturday"]["end"] == "13:00"


async def test_patch_schedule_replaces_complete_schedule(
    client: AsyncClient, owner: tuple[str, str]
) -> None:
    token, tenant_id = owner

    # Establecer un horario inicial con lunes y sabado.
    await client.patch(
        "/api/v1/onboarding",
        json={
            "schedule": {
                "monday": {"start": "08:00", "end": "17:00"},
                "saturday": {"start": "09:00", "end": "13:00"},
            }
        },
        headers=_headers(token, tenant_id),
    )

    # Reemplazar por un horario mas reducido: solo martes y miercoles.
    response = await client.patch(
        "/api/v1/onboarding",
        json={
            "schedule": {
                "tuesday": {"start": "09:00", "end": "18:00"},
                "wednesday": {"start": "09:00", "end": "18:00"},
            }
        },
        headers=_headers(token, tenant_id),
    )
    assert response.status_code == 200, response.text
    state = response.json()["state"]
    assert set(state["schedule"].keys()) == {"tuesday", "wednesday"}
    assert "saturday" not in state["schedule"]
    assert "monday" not in state["schedule"]

    # Eliminar un dia enviando null.
    remove_response = await client.patch(
        "/api/v1/onboarding",
        json={"schedule": {"wednesday": None}},
        headers=_headers(token, tenant_id),
    )
    assert remove_response.status_code == 200, remove_response.text
    assert "wednesday" not in remove_response.json()["state"]["schedule"]


async def test_complete_onboarding_sets_completed(
    client: AsyncClient,
    db_session: AsyncSession,
    owner: tuple[str, str],
) -> None:
    token, tenant_id = owner

    response = await client.post("/api/v1/onboarding/complete", headers=_headers(token, tenant_id))
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["completed"] is True
    assert body["state"]["step"] == 4

    # Persistencia verificada directamente en el modelo.
    tenant = await db_session.scalar(select(Tenant).where(Tenant.id == tenant_id))
    assert tenant is not None
    assert tenant.onboarding_state is not None
    assert tenant.onboarding_state["completed"] is True


async def test_technician_cannot_patch_or_complete(
    client: AsyncClient, technician: tuple[str, str]
) -> None:
    token, tenant_id = technician

    patch = {"step": 2}
    patch_response = await client.patch(
        "/api/v1/onboarding", json=patch, headers=_headers(token, tenant_id)
    )
    assert patch_response.status_code == 403, patch_response.text

    complete_response = await client.post(
        "/api/v1/onboarding/complete", headers=_headers(token, tenant_id)
    )
    assert complete_response.status_code == 403, complete_response.text


async def test_onboarding_is_isolated_by_tenant(
    client: AsyncClient,
    db_session: AsyncSession,
    owner: tuple[str, str],
) -> None:
    owner_token, owner_tenant = owner

    # Crear un segundo tenant con su propio owner.
    other = await _register(client, "owner-other@example.com", "Other Tenant")
    other_token, other_tenant = other

    await client.patch(
        "/api/v1/onboarding",
        json={"company": {"name": "Empresa A"}},
        headers=_headers(owner_token, owner_tenant),
    )

    response = await client.get("/api/v1/onboarding", headers=_headers(other_token, other_tenant))
    assert response.status_code == 200, response.text
    assert response.json()["state"]["company"]["name"] == "Mi Empresa"

    owner_response = await client.get(
        "/api/v1/onboarding", headers=_headers(owner_token, owner_tenant)
    )
    assert owner_response.json()["state"]["company"]["name"] == "Empresa A"


async def _invite_and_login(
    client: AsyncClient,
    owner_token: str,
    tenant_id: str,
    email: str,
    role: str,
) -> str:
    from urllib.parse import urlparse

    invite_response = await client.post(
        "/api/v1/team/invitations",
        json={"email": email, "role": role, "full_name": "Invited User"},
        headers=_headers(owner_token, tenant_id),
    )
    assert invite_response.status_code == 201, invite_response.text
    invitation_url = invite_response.json()["invitation_url"]
    token = urlparse(invitation_url).path.split("/")[-1]

    accept_response = await client.post(
        f"/api/v1/public/invitations/{token}/accept",
        json={"full_name": "Invited User", "password": "super-secret-123"},
    )
    assert accept_response.status_code == 200, accept_response.text
    return accept_response.json()["access_token"]


@pytest.fixture
async def dispatcher(
    client: AsyncClient,
    owner: tuple[str, str],
) -> tuple[str, str]:
    token, tenant_id = owner
    dispatcher_token = await _invite_and_login(
        client, token, tenant_id, "dispatcher-onboarding@example.com", "dispatcher"
    )
    return dispatcher_token, tenant_id


async def test_technician_cannot_get_onboarding(
    client: AsyncClient, technician: tuple[str, str]
) -> None:
    token, tenant_id = technician
    response = await client.get("/api/v1/onboarding", headers=_headers(token, tenant_id))
    assert response.status_code == 403, response.text


async def test_dispatcher_cannot_access_onboarding(
    client: AsyncClient, dispatcher: tuple[str, str]
) -> None:
    token, tenant_id = dispatcher

    get_response = await client.get("/api/v1/onboarding", headers=_headers(token, tenant_id))
    assert get_response.status_code == 403, get_response.text

    patch_response = await client.patch(
        "/api/v1/onboarding", json={"step": 2}, headers=_headers(token, tenant_id)
    )
    assert patch_response.status_code == 403, patch_response.text

    complete_response = await client.post(
        "/api/v1/onboarding/complete", headers=_headers(token, tenant_id)
    )
    assert complete_response.status_code == 403, complete_response.text


async def test_onboarding_accepts_argentine_timezones(
    client: AsyncClient, owner: tuple[str, str]
) -> None:
    token, tenant_id = owner
    for tz in ("America/Argentina/Cordoba", "America/Argentina/Mendoza"):
        response = await client.patch(
            "/api/v1/onboarding",
            json={"company": {"timezone": tz}},
            headers=_headers(token, tenant_id),
        )
        assert response.status_code == 200, response.text
        assert response.json()["state"]["company"]["timezone"] == tz


async def test_onboarding_rejects_invalid_timezone(
    client: AsyncClient, owner: tuple[str, str]
) -> None:
    token, tenant_id = owner
    response = await client.patch(
        "/api/v1/onboarding",
        json={"company": {"timezone": "Mars/Phobos"}},
        headers=_headers(token, tenant_id),
    )
    assert response.status_code == 422, response.text


async def test_onboarding_rejects_invalid_currency(
    client: AsyncClient, owner: tuple[str, str]
) -> None:
    token, tenant_id = owner
    response = await client.patch(
        "/api/v1/onboarding",
        json={"company": {"currency": "USD"}},
        headers=_headers(token, tenant_id),
    )
    assert response.status_code == 422, response.text


async def test_onboarding_rejects_too_many_services(
    client: AsyncClient, owner: tuple[str, str]
) -> None:
    token, tenant_id = owner
    services = [{"name": f"Servicio {i}"} for i in range(21)]
    response = await client.patch(
        "/api/v1/onboarding",
        json={"services": services},
        headers=_headers(token, tenant_id),
    )
    assert response.status_code == 422, response.text


async def test_onboarding_rejects_invalid_schedule_day(
    client: AsyncClient, owner: tuple[str, str]
) -> None:
    token, tenant_id = owner
    response = await client.patch(
        "/api/v1/onboarding",
        json={"schedule": {"holiday": {"start": "09:00", "end": "18:00"}}},
        headers=_headers(token, tenant_id),
    )
    assert response.status_code == 422, response.text


async def test_onboarding_rejects_invalid_time_format(
    client: AsyncClient, owner: tuple[str, str]
) -> None:
    token, tenant_id = owner
    response = await client.patch(
        "/api/v1/onboarding",
        json={"schedule": {"monday": {"start": "9:00", "end": "18:00"}}},
        headers=_headers(token, tenant_id),
    )
    assert response.status_code == 422, response.text


async def test_onboarding_rejects_end_before_start(
    client: AsyncClient, owner: tuple[str, str]
) -> None:
    token, tenant_id = owner
    response = await client.patch(
        "/api/v1/onboarding",
        json={"schedule": {"monday": {"start": "18:00", "end": "09:00"}}},
        headers=_headers(token, tenant_id),
    )
    assert response.status_code == 422, response.text


async def test_onboarding_accepts_large_price(client: AsyncClient, owner: tuple[str, str]) -> None:
    token, tenant_id = owner
    response = await client.patch(
        "/api/v1/onboarding",
        json={"services": [{"name": "Premium", "price": "999999999999.99"}]},
        headers=_headers(token, tenant_id),
    )
    assert response.status_code == 200, response.text
    assert response.json()["state"]["services"][0]["price"] == "999999999999.99"


async def test_patch_after_complete_keeps_completed_true(
    client: AsyncClient, owner: tuple[str, str]
) -> None:
    token, tenant_id = owner

    complete_response = await client.post(
        "/api/v1/onboarding/complete", headers=_headers(token, tenant_id)
    )
    assert complete_response.status_code == 200, complete_response.text
    assert complete_response.json()["completed"] is True

    patch_response = await client.patch(
        "/api/v1/onboarding",
        json={"company": {"name": "Nombre Actualizado"}},
        headers=_headers(token, tenant_id),
    )
    assert patch_response.status_code == 200, patch_response.text
    assert patch_response.json()["completed"] is True
    assert patch_response.json()["state"]["company"]["name"] == "Nombre Actualizado"
