from httpx import AsyncClient

from app.core.config import settings
from app.core.rate_limit import reset_rate_limits


async def test_security_headers_present(client: AsyncClient) -> None:
    response = await client.get("/api/v1/health/live")
    assert response.status_code == 200
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
    assert response.headers["referrer-policy"] == "strict-origin-when-cross-origin"


async def test_login_rate_limit_returns_429(client: AsyncClient, monkeypatch) -> None:
    monkeypatch.setattr(settings, "rate_limit_enabled", True)
    monkeypatch.setattr(settings, "rate_limit_auth_per_minute", 2)
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
