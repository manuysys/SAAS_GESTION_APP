import hashlib
from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, hash_password
from app.models import Invitation, Membership, Plan, User


@pytest.fixture
async def plans_fixture(db_session: AsyncSession) -> list[Plan]:
    plans = [
        Plan(
            code="starter",
            name="Starter",
            price_ars=Decimal("10000.00"),
            billing_period="monthly",
            limits={"max_users": 2, "max_technicians": 1, "orders_per_month": 100},
            active=True,
        ),
    ]
    for plan in plans:
        db_session.add(plan)
    await db_session.commit()
    return plans


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


async def test_owner_can_invite_technician(
    client: AsyncClient,
    plans_fixture: list[Plan],
) -> None:
    token, tenant_id = await _register(client, "owner-invite@example.com", "Empresa Invite")

    response = await client.post(
        "/api/v1/team/invitations",
        json={"email": "tecnico@example.com", "role": "technician", "full_name": "Tecnico"},
        headers=_headers(token, tenant_id),
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["email"] == "tecnico@example.com"
    assert body["role"] == "technician"
    assert body["status"] == "pending"
    assert body["email_status"] == "console"
    assert "/invitations/" in body["invitation_url"]


async def test_team_list_includes_invitation(
    client: AsyncClient,
    plans_fixture: list[Plan],
) -> None:
    token, tenant_id = await _register(client, "owner-list@example.com", "Empresa List")

    await client.post(
        "/api/v1/team/invitations",
        json={"email": "tecnico@example.com", "role": "technician"},
        headers=_headers(token, tenant_id),
    )

    response = await client.get("/api/v1/team", headers=_headers(token, tenant_id))
    assert response.status_code == 200, response.text
    body = response.json()
    assert len(body["members"]) == 1
    assert len(body["invitations"]) == 1
    assert body["invitations"][0]["email"] == "tecnico@example.com"


async def test_technician_cannot_invite(
    client: AsyncClient,
    db_session: AsyncSession,
    plans_fixture: list[Plan],
) -> None:
    _owner_token, tenant_id = await _register(client, "owner-tech@example.com", "Empresa Tech")

    tech_user = User(
        email="tech-only@example.com",
        password_hash=hash_password("super-secret-123"),
        full_name="Tech Only",
    )
    db_session.add(tech_user)
    await db_session.flush()
    db_session.add(Membership(tenant_id=tenant_id, user_id=tech_user.id, role="technician"))
    await db_session.commit()

    tech_token, _ = create_access_token(str(tech_user.id))

    response = await client.post(
        "/api/v1/team/invitations",
        json={"email": "otro@example.com", "role": "viewer"},
        headers=_headers(tech_token, tenant_id),
    )
    assert response.status_code == 403, response.text


async def test_cannot_invite_owner(
    client: AsyncClient,
    plans_fixture: list[Plan],
) -> None:
    token, tenant_id = await _register(client, "owner-owner@example.com", "Empresa Owner")

    response = await client.post(
        "/api/v1/team/invitations",
        json={"email": "otro@example.com", "role": "owner"},
        headers=_headers(token, tenant_id),
    )
    assert response.status_code == 422


async def test_cannot_invite_existing_member(
    client: AsyncClient,
    db_session: AsyncSession,
    plans_fixture: list[Plan],
) -> None:
    token, tenant_id = await _register(client, "owner-existing@example.com", "Empresa Existing")

    existing = User(
        email="existente@example.com",
        password_hash=hash_password("super-secret-123"),
        full_name="Existente",
    )
    db_session.add(existing)
    await db_session.flush()
    db_session.add(Membership(tenant_id=tenant_id, user_id=existing.id, role="viewer"))
    await db_session.commit()

    response = await client.post(
        "/api/v1/team/invitations",
        json={"email": "existente@example.com", "role": "viewer"},
        headers=_headers(token, tenant_id),
    )
    assert response.status_code == 409


async def test_cannot_duplicate_pending_invitation(
    client: AsyncClient,
    plans_fixture: list[Plan],
) -> None:
    token, tenant_id = await _register(client, "owner-dup@example.com", "Empresa Dup")

    first = await client.post(
        "/api/v1/team/invitations",
        json={"email": "dup@example.com", "role": "viewer"},
        headers=_headers(token, tenant_id),
    )
    assert first.status_code == 201

    second = await client.post(
        "/api/v1/team/invitations",
        json={"email": "dup@example.com", "role": "viewer"},
        headers=_headers(token, tenant_id),
    )
    assert second.status_code == 409


async def test_resend_changes_token(
    client: AsyncClient,
    plans_fixture: list[Plan],
) -> None:
    token, tenant_id = await _register(client, "owner-resend@example.com", "Empresa Resend")

    created = await client.post(
        "/api/v1/team/invitations",
        json={"email": "resend@example.com", "role": "viewer"},
        headers=_headers(token, tenant_id),
    )
    assert created.status_code == 201
    invitation_id = created.json()["id"]
    first_url = created.json()["invitation_url"]

    resent = await client.post(
        f"/api/v1/team/invitations/{invitation_id}/resend",
        headers=_headers(token, tenant_id),
    )
    assert resent.status_code == 200, resent.text
    second_url = resent.json()["invitation_url"]
    assert second_url != first_url


async def test_revoke_prevents_accept(
    client: AsyncClient,
    plans_fixture: list[Plan],
) -> None:
    token, tenant_id = await _register(client, "owner-revoke@example.com", "Empresa Revoke")

    created = await client.post(
        "/api/v1/team/invitations",
        json={"email": "revoked@example.com", "role": "viewer"},
        headers=_headers(token, tenant_id),
    )
    assert created.status_code == 201
    invitation_id = created.json()["id"]
    raw_token = created.json()["invitation_url"].split("/")[-1]

    revoked = await client.delete(
        f"/api/v1/team/invitations/{invitation_id}",
        headers=_headers(token, tenant_id),
    )
    assert revoked.status_code == 204

    public = await client.get(f"/api/v1/public/invitations/{raw_token}")
    assert public.status_code == 200
    assert public.json()["status"] == "revoked"

    accept = await client.post(
        f"/api/v1/public/invitations/{raw_token}/accept",
        json={"full_name": "Revocado", "password": "super-secret-123"},
    )
    assert accept.status_code == 410


async def test_accept_invitation_creates_user_and_membership(
    client: AsyncClient,
    plans_fixture: list[Plan],
) -> None:
    token, tenant_id = await _register(client, "owner-accept@example.com", "Empresa Accept")

    created = await client.post(
        "/api/v1/team/invitations",
        json={"email": "nuevo@example.com", "role": "technician"},
        headers=_headers(token, tenant_id),
    )
    assert created.status_code == 201
    raw_token = created.json()["invitation_url"].split("/")[-1]

    public = await client.get(f"/api/v1/public/invitations/{raw_token}")
    assert public.status_code == 200
    assert public.json()["email_masked"].startswith("n")
    assert public.json()["status"] == "pending"

    accept = await client.post(
        f"/api/v1/public/invitations/{raw_token}/accept",
        json={"full_name": "Nuevo Tecnico", "password": "super-secret-123"},
    )
    assert accept.status_code == 200, accept.text
    body = accept.json()
    assert body["access_token"]
    assert body["refresh_token"]
    assert body["tenants"][0]["role"] == "technician"
    assert body["user"]["email"] == "nuevo@example.com"
    assert "refresh_token=" in accept.headers.get("set-cookie", "")

    second = await client.post(
        f"/api/v1/public/invitations/{raw_token}/accept",
        json={"full_name": "Nuevo Tecnico", "password": "super-secret-123"},
    )
    assert second.status_code == 409


async def test_accept_with_authenticated_matching_email(
    client: AsyncClient,
    db_session: AsyncSession,
    plans_fixture: list[Plan],
) -> None:
    owner_token, tenant_id = await _register(client, "owner-auth@example.com", "Empresa Auth")

    existing_user = User(
        email="existente-acepta@example.com",
        password_hash=hash_password("super-secret-123"),
        full_name="Existente Acepta",
    )
    db_session.add(existing_user)
    await db_session.commit()

    existing_token, _ = create_access_token(str(existing_user.id))

    created = await client.post(
        "/api/v1/team/invitations",
        json={"email": "existente-acepta@example.com", "role": "viewer"},
        headers=_headers(owner_token, tenant_id),
    )
    assert created.status_code == 201
    raw_token = created.json()["invitation_url"].split("/")[-1]

    accept = await client.post(
        f"/api/v1/public/invitations/{raw_token}/accept",
        json={},
        headers={"Authorization": f"Bearer {existing_token}"},
    )
    assert accept.status_code == 200, accept.text
    assert accept.json()["user"]["email"] == "existente-acepta@example.com"


async def test_accept_with_wrong_email_fails(
    client: AsyncClient,
    db_session: AsyncSession,
    plans_fixture: list[Plan],
) -> None:
    owner_token, tenant_id = await _register(client, "owner-wrong@example.com", "Empresa Wrong")

    other_user = User(
        email="otro-wrong@example.com",
        password_hash=hash_password("super-secret-123"),
        full_name="Otro",
    )
    db_session.add(other_user)
    await db_session.commit()

    other_token, _ = create_access_token(str(other_user.id))

    created = await client.post(
        "/api/v1/team/invitations",
        json={"email": "invitado-wrong@example.com", "role": "viewer"},
        headers=_headers(owner_token, tenant_id),
    )
    raw_token = created.json()["invitation_url"].split("/")[-1]

    accept = await client.post(
        f"/api/v1/public/invitations/{raw_token}/accept",
        json={},
        headers={"Authorization": f"Bearer {other_token}"},
    )
    assert accept.status_code == 403


async def test_expired_invitation_is_rejected(
    client: AsyncClient,
    db_session: AsyncSession,
    plans_fixture: list[Plan],
) -> None:
    owner_token, tenant_id = await _register(client, "owner-expired@example.com", "Empresa Expired")

    created = await client.post(
        "/api/v1/team/invitations",
        json={"email": "expired@example.com", "role": "viewer"},
        headers=_headers(owner_token, tenant_id),
    )
    raw_token = created.json()["invitation_url"].split("/")[-1]

    result = await db_session.execute(
        select(Invitation).where(
            Invitation.token_hash == hashlib.sha256(raw_token.encode()).hexdigest()
        )
    )
    invitation = result.scalar_one()
    invitation.expires_at = datetime.now(UTC) - timedelta(hours=1)
    await db_session.commit()

    public = await client.get(f"/api/v1/public/invitations/{raw_token}")
    assert public.json()["status"] == "expired"

    accept = await client.post(
        f"/api/v1/public/invitations/{raw_token}/accept",
        json={"full_name": "Expired", "password": "super-secret-123"},
    )
    assert accept.status_code == 410


async def test_user_limit_blocks_invitation(
    client: AsyncClient,
    plans_fixture: list[Plan],
) -> None:
    token, tenant_id = await _register(client, "owner-limit@example.com", "Empresa Limit")

    first = await client.post(
        "/api/v1/team/invitations",
        json={"email": "limit1@example.com", "role": "viewer"},
        headers=_headers(token, tenant_id),
    )
    assert first.status_code == 201

    # Con 1 owner activo + 1 invitación pendiente se alcanza max_users=2.
    second = await client.post(
        "/api/v1/team/invitations",
        json={"email": "limit2@example.com", "role": "viewer"},
        headers=_headers(token, tenant_id),
    )
    assert second.status_code == 403
    detail = second.json()["detail"]
    assert "2 usuarios" in detail


async def test_technician_limit_blocks_invitation(
    client: AsyncClient,
    db_session: AsyncSession,
    plans_fixture: list[Plan],
) -> None:
    starter = plans_fixture[0]
    starter.limits = {"max_users": 10, "max_technicians": 1, "orders_per_month": 100}
    await db_session.commit()

    token, tenant_id = await _register(client, "owner-tech-limit@example.com", "Empresa Tech Limit")

    first = await client.post(
        "/api/v1/team/invitations",
        json={"email": "tech-limit1@example.com", "role": "technician"},
        headers=_headers(token, tenant_id),
    )
    assert first.status_code == 201

    second = await client.post(
        "/api/v1/team/invitations",
        json={"email": "tech-limit2@example.com", "role": "technician"},
        headers=_headers(token, tenant_id),
    )
    assert second.status_code == 403
    detail = second.json()["detail"]
    assert "1 t" in detail and "cnicos" in detail


async def test_invitation_tenant_isolation(
    client: AsyncClient,
    plans_fixture: list[Plan],
) -> None:
    token_a, tenant_a = await _register(client, "owner-iso-a@example.com", "Empresa A")
    token_b, tenant_b = await _register(client, "owner-iso-b@example.com", "Empresa B")

    created = await client.post(
        "/api/v1/team/invitations",
        json={"email": "iso@example.com", "role": "viewer"},
        headers=_headers(token_a, tenant_a),
    )
    invitation_id = created.json()["id"]

    resend_b = await client.post(
        f"/api/v1/team/invitations/{invitation_id}/resend",
        headers=_headers(token_b, tenant_b),
    )
    assert resend_b.status_code == 404

    revoke_b = await client.delete(
        f"/api/v1/team/invitations/{invitation_id}",
        headers=_headers(token_b, tenant_b),
    )
    assert revoke_b.status_code == 404
