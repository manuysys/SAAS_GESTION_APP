from datetime import datetime
from decimal import Decimal
from uuid import UUID
from zoneinfo import ZoneInfo

import httpx
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models import AIUsageLog

CUSTOMER = {
    "name": "Cliente IA",
    "phone": "+54 11 5555-3000",
    "email": "ia@example.com",
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


async def _create_quote(
    client: AsyncClient, token: str, tenant_id: str, customer_id: str
) -> tuple[str, str, str]:
    response = await client.post(
        "/api/v1/quotes",
        json={
            "customer_id": customer_id,
            "items": [
                {
                    "description": "Servicio IA",
                    "quantity": "1.000",
                    "unit_price": "1000.00",
                }
            ],
        },
        headers=_headers(token, tenant_id),
    )
    assert response.status_code == 201, response.text
    body = response.json()
    return body["id"], body["public_token"], body["number"]


async def _send_quote(client: AsyncClient, token: str, tenant_id: str, quote_id: str) -> None:
    response = await client.post(
        f"/api/v1/quotes/{quote_id}/send", headers=_headers(token, tenant_id)
    )
    assert response.status_code == 200, response.text


async def test_status_deterministic_provider(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "ai_provider", "deterministic")
    token, tenant_id, _ = await _register(client, "ai-status@example.com", "AI Status")

    response = await client.get("/api/v1/ai/status", headers=_headers(token, tenant_id))
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["provider"] == "deterministic"
    assert body["model"] == "deterministic"
    assert body["configured"] is True
    assert body["available"] is True
    assert body["deterministic_available"] is True
    assert body["monthly_token_limit"] == settings.ai_monthly_token_limit


async def test_chat_pending_quotes_returns_real_quote_number(client: AsyncClient) -> None:
    token, tenant_id, _ = await _register(client, "ai-quotes@example.com", "AI Quotes")
    customer_id = await _create_customer(client, token, tenant_id)
    quote_id, _, number = await _create_quote(client, token, tenant_id, customer_id)
    await _send_quote(client, token, tenant_id, quote_id)

    response = await client.post(
        "/api/v1/ai/chat",
        json={"message": "presupuestos pendientes"},
        headers=_headers(token, tenant_id),
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert number in body["reply"]
    assert CUSTOMER["name"] in body["reply"]
    assert body["provider"] == "deterministic"
    assert body["used_tokens"] == body["input_tokens"] + body["output_tokens"]


async def test_chat_isolation_between_tenants(client: AsyncClient) -> None:
    token_a, tenant_a, _ = await _register(client, "owner-a@example.com", "Empresa A")
    token_b, tenant_b, _ = await _register(client, "owner-b@example.com", "Empresa B")
    customer_a = await _create_customer(client, token_a, tenant_a)
    quote_id, _, number_a = await _create_quote(client, token_a, tenant_a, customer_a)
    await _send_quote(client, token_a, tenant_a, quote_id)

    response = await client.post(
        "/api/v1/ai/chat",
        json={"message": "presupuestos pendientes"},
        headers=_headers(token_b, tenant_b),
    )
    assert response.status_code == 200, response.text
    assert number_a not in response.json()["reply"]


async def test_chat_quota_exhausted_returns_429(
    client: AsyncClient, db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "ai_monthly_token_limit", 10)
    token, tenant_id, user_id = await _register(client, "ai-quota@example.com", "AI Quota")
    db_session.add(
        AIUsageLog(
            tenant_id=UUID(tenant_id),
            user_id=UUID(user_id),
            provider="deterministic",
            model="deterministic",
            feature="chat",
            input_tokens=6,
            output_tokens=5,
            estimated_cost=Decimal("0"),
            created_at=datetime.now(ZoneInfo("America/Argentina/Buenos_Aires")),
        )
    )
    await db_session.commit()

    response = await client.post(
        "/api/v1/ai/chat",
        json={"message": "hola"},
        headers=_headers(token, tenant_id),
    )
    assert response.status_code == 429
    assert "limit" in response.json()["detail"].lower()


async def test_chat_external_not_configured_returns_503(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "ai_provider", "openai_compatible")
    monkeypatch.setattr(settings, "ai_base_url", "")
    monkeypatch.setattr(settings, "ai_api_key", "")
    monkeypatch.setattr(settings, "ai_model", "")
    token, tenant_id, _ = await _register(client, "ai-503@example.com", "AI 503")

    response = await client.post(
        "/api/v1/ai/chat",
        json={"message": "hola"},
        headers=_headers(token, tenant_id),
    )
    assert response.status_code == 503
    assert "IA externa no configurada" in response.json()["detail"]


async def test_chat_external_failure_returns_502(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "ai_provider", "openai_compatible")
    monkeypatch.setattr(settings, "ai_base_url", "http://localhost:9999")
    monkeypatch.setattr(settings, "ai_api_key", "test-key")
    monkeypatch.setattr(settings, "ai_model", "test-model")

    class FailingClient:
        def __init__(self, *args: object, **kwargs: object) -> None:
            pass

        async def __aenter__(self) -> "FailingClient":
            return self

        async def __aexit__(self, *args: object) -> bool:
            return False

        async def post(self, *args: object, **kwargs: object) -> None:
            raise httpx.RequestError("Connection refused")

    monkeypatch.setattr(httpx, "AsyncClient", FailingClient)
    token, tenant_id, _ = await _register(client, "ai-502@example.com", "AI 502")

    response = await client.post(
        "/api/v1/ai/chat",
        json={"message": "hola"},
        headers=_headers(token, tenant_id),
    )
    assert response.status_code == 502
    assert "proveedor" in response.json()["detail"].lower()


async def test_chat_fallback_is_honest(client: AsyncClient) -> None:
    token, tenant_id, _ = await _register(client, "ai-fallback@example.com", "AI Fallback")

    response = await client.post(
        "/api/v1/ai/chat",
        json={"message": "xyzabc123 no es una consulta válida"},
        headers=_headers(token, tenant_id),
    )
    assert response.status_code == 200, response.text
    reply = response.json()["reply"]
    assert "No pude interpretar la consulta" in reply
    assert "presupuestos pendientes" in reply
