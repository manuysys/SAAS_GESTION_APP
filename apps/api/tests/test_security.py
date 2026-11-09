from uuid import UUID

import pytest
from fastapi import FastAPI
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.rate_limit import reset_rate_limits
from app.models import AuditLog, AuthAttempt, RefreshToken
from app.services import security_service


async def test_security_headers_present(client: AsyncClient) -> None:
    response = await client.get("/api/v1/health/live")
    assert response.status_code == 200
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
    assert response.headers["referrer-policy"] == "strict-origin-when-cross-origin"
    assert "x-request-id" in response.headers


async def test_login_rate_limit_returns_429(client: AsyncClient, monkeypatch) -> None:
    monkeypatch.setattr("app.core.config.settings.rate_limit_enabled", True)
    monkeypatch.setattr("app.core.config.settings.rate_limit_auth_per_minute", 2)
    reset_rate_limits()

    payload = {"email": "nobody@example.com", "password": "wrong-password-123"}
    first = await client.post("/api/v1/auth/login", json=payload)
    second = await client.post("/api/v1/auth/login", json=payload)
    third = await client.post("/api/v1/auth/login", json=payload)

    assert first.status_code == 401
    assert second.status_code == 401
    assert third.status_code == 429
    assert third.headers["retry-after"].isdigit()

    reset_rate_limits()


async def test_rate_limit_disabled_by_default(client: AsyncClient) -> None:
    reset_rate_limits()
    payload = {"email": "nobody@example.com", "password": "wrong-password-123"}
    for _ in range(5):
        response = await client.post("/api/v1/auth/login", json=payload)
        assert response.status_code == 401


async def test_login_lockout_after_five_failures(
    client: AsyncClient, db_session: AsyncSession, monkeypatch
) -> None:
    monkeypatch.setattr("app.core.config.settings.lockout_max_attempts", 3)
    monkeypatch.setattr("app.core.config.settings.lockout_window_minutes", 15)

    payload = {"email": "lockout@example.com", "password": "wrong-password-123"}
    for _ in range(3):
        response = await client.post("/api/v1/auth/login", json=payload)
        assert response.status_code == 401

    locked = await client.post("/api/v1/auth/login", json=payload)
    assert locked.status_code == 429
    assert "demasiados intentos" in locked.json()["detail"].lower()

    attempts = await db_session.execute(
        select(func.count(AuthAttempt.id)).where(
            AuthAttempt.email_hash == security_service._hash("lockout@example.com")
        )
    )
    assert attempts.scalar_one() >= 3


async def test_refresh_token_reuse_revokes_family(
    client: AsyncClient, db_session: AsyncSession, register_payload: dict[str, str]
) -> None:
    reg = await client.post("/api/v1/auth/register", json=register_payload)
    assert reg.status_code == 201
    stale_token = reg.cookies.get("refresh_token")
    assert stale_token

    first_refresh = await client.post("/api/v1/auth/refresh")
    assert first_refresh.status_code == 200

    reuse = await client.post(
        "/api/v1/auth/refresh",
        headers={"Cookie": f"refresh_token={stale_token}"},
    )
    assert reuse.status_code == 401

    me = await client.get(
        "/api/v1/auth/me",
        headers={
            "Authorization": f"Bearer {reg.json()['access_token']}",
            "X-Tenant-ID": reg.json()["tenants"][0]["id"],
        },
    )
    assert me.status_code == 200
    user_id = me.json()["user"]["id"]

    active = await db_session.execute(
        select(func.count(RefreshToken.id)).where(
            RefreshToken.user_id == UUID(user_id),
            RefreshToken.revoked_at.is_(None),
        )
    )
    assert active.scalar_one() == 0


async def test_refresh_with_invalid_origin_is_forbidden(
    client: AsyncClient, register_payload: dict[str, str]
) -> None:
    reg = await client.post("/api/v1/auth/register", json=register_payload)
    assert reg.status_code == 201

    response = await client.post(
        "/api/v1/auth/refresh", headers={"Origin": "https://evil.example.com"}
    )
    assert response.status_code == 403


async def test_logout_with_invalid_origin_is_forbidden(
    client: AsyncClient, register_payload: dict[str, str]
) -> None:
    reg = await client.post("/api/v1/auth/register", json=register_payload)
    assert reg.status_code == 201

    response = await client.post(
        "/api/v1/auth/logout", headers={"Origin": "https://evil.example.com"}
    )
    assert response.status_code == 403


def test_production_settings_hide_docs_and_validate_config() -> None:
    with pytest.raises(ValueError):
        Settings(
            app_env="production",
            jwt_secret="short",  # noqa: S106
            app_debug=True,
            cookie_secure=False,
            api_cors_origins=["http://localhost:3000"],
        )

    settings = Settings(
        app_env="production",
        jwt_secret="a" * 64,
        app_debug=False,
        cookie_secure=True,
        cookie_samesite="none",
        api_cors_origins=["https://app.example.com"],
        api_url="https://api.example.com",
    )
    app = FastAPI(
        docs_url=None if settings.app_env == "production" else "/docs",
        redoc_url=None if settings.app_env == "production" else "/redoc",
        openapi_url=None if settings.app_env == "production" else "/openapi.json",
    )
    assert app.docs_url is None
    assert app.redoc_url is None
    assert app.openapi_url is None


async def test_audit_log_created_on_register_and_login(
    client: AsyncClient,
    db_session: AsyncSession,
    register_payload: dict[str, str],
) -> None:
    reg = await client.post("/api/v1/auth/register", json=register_payload)
    assert reg.status_code == 201

    register_audit = await db_session.execute(
        select(func.count(AuditLog.id)).where(AuditLog.action == "user_registered")
    )
    assert register_audit.scalar_one() == 1

    login = await client.post(
        "/api/v1/auth/login",
        json={
            "email": register_payload["email"],
            "password": register_payload["password"],
        },
    )
    assert login.status_code == 200

    login_audit = await db_session.execute(
        select(func.count(AuditLog.id)).where(AuditLog.action == "user_login")
    )
    assert login_audit.scalar_one() == 1


async def test_audit_log_tenant_isolation(client: AsyncClient, db_session: AsyncSession) -> None:
    reg_a = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "owner-a@example.com",
            "password": "super-secret-123",
            "full_name": "Owner A",
            "company_name": "Empresa A",
        },
    )
    assert reg_a.status_code == 201
    tenant_a = reg_a.json()["tenants"][0]["id"]

    reg_b = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "owner-b@example.com",
            "password": "super-secret-123",
            "full_name": "Owner B",
            "company_name": "Empresa B",
        },
    )
    assert reg_b.status_code == 201
    tenant_b = reg_b.json()["tenants"][0]["id"]

    logs_a = await db_session.execute(
        select(func.count(AuditLog.id)).where(AuditLog.tenant_id == UUID(tenant_a))
    )
    logs_b = await db_session.execute(
        select(func.count(AuditLog.id)).where(AuditLog.tenant_id == UUID(tenant_b))
    )
    assert logs_a.scalar_one() == 1
    assert logs_b.scalar_one() == 1


async def test_access_token_works_for_authenticated_endpoints(
    client: AsyncClient, register_payload: dict[str, str]
) -> None:
    reg = await client.post("/api/v1/auth/register", json=register_payload)
    assert reg.status_code == 201
    token = reg.json()["access_token"]
    tenant_id = reg.json()["tenants"][0]["id"]

    me = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}", "X-Tenant-ID": tenant_id},
    )
    assert me.status_code == 200


async def test_production_validator_rejects_localhost_cors() -> None:
    with pytest.raises(ValueError):
        Settings(
            app_env="production",
            jwt_secret="a" * 64,
            app_debug=False,
            cookie_secure=True,
            api_cors_origins=["http://localhost:3000"],
        )
