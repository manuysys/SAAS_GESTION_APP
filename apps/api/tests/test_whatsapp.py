import hashlib
import hmac
import json
from collections.abc import AsyncGenerator

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.main import app
from app.models import WhatsAppConfig, WhatsAppMessage
from app.services import whatsapp_service


@pytest_asyncio.fixture
async def whatsapp_client(monkeypatch) -> AsyncGenerator[AsyncClient, None]:
    monkeypatch.setattr(settings, "whatsapp_encryption_key", "test-encryption-key-32-bytes-long")
    monkeypatch.setattr(settings, "whatsapp_verify_token", "webhook-verify-token")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


CONFIG_PAYLOAD = {
    "phone_number_id": "123456789012345",
    "business_account_id": "987654321098765",
    "access_token": "test-access-token",
    "verify_token": "webhook-verify-token",
    "app_secret": "test-app-secret",
    "active": True,
}


async def _register_owner(client: AsyncClient, email: str, company: str) -> tuple[str, str]:
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "super-secret-123",
            "full_name": "Owner",
            "company_name": company,
        },
    )
    assert response.status_code == 201, response.text
    body = response.json()
    return body["access_token"], body["tenants"][0]["id"]


def _headers(token: str, tenant_id: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}", "X-Tenant-ID": tenant_id}


def _inbound_payload(phone_number_id: str) -> dict[str, object]:
    return {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "BUSINESS_ID",
                "changes": [
                    {
                        "value": {
                            "messaging_product": "whatsapp",
                            "metadata": {
                                "display_phone_number": "15550001234",
                                "phone_number_id": phone_number_id,
                            },
                            "messages": [
                                {
                                    "from": "+5491112345678",
                                    "id": "wamid.inbound.1",
                                    "timestamp": "1234567890",
                                    "text": {"body": "Hola"},
                                    "type": "text",
                                }
                            ],
                        },
                        "field": "messages",
                    }
                ],
            }
        ],
    }


async def test_put_config_encrypts_and_get_hides_secrets(
    whatsapp_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    token, tenant_id = await _register_owner(whatsapp_client, "owner-wa@example.com", "WA Co")

    put = await whatsapp_client.put(
        "/api/v1/whatsapp/config",
        json=CONFIG_PAYLOAD,
        headers=_headers(token, tenant_id),
    )
    assert put.status_code == 200, put.text
    body = put.json()
    assert body["configured"] is True
    assert body["active"] is True
    assert body["phone_number_id"] == CONFIG_PAYLOAD["phone_number_id"]
    assert body["has_access_token"] is True
    assert body["has_verify_token"] is True
    assert body["has_app_secret"] is True
    assert "access_token" not in body
    assert "verify_token" not in body
    assert "app_secret" not in body

    get = await whatsapp_client.get("/api/v1/whatsapp/config", headers=_headers(token, tenant_id))
    assert get.status_code == 200, get.text
    get_body = get.json()
    assert get_body["has_access_token"] is True
    assert "access_token" not in get_body

    result = await db_session.execute(
        select(WhatsAppConfig).where(WhatsAppConfig.tenant_id == tenant_id)
    )
    config = result.scalar_one()
    assert config.access_token_encrypted != CONFIG_PAYLOAD["access_token"]
    assert CONFIG_PAYLOAD["access_token"] not in (config.access_token_encrypted or "")


async def test_get_webhook_challenge_ok_and_forbidden(
    whatsapp_client: AsyncClient,
) -> None:
    ok = await whatsapp_client.get(
        "/api/v1/webhooks/whatsapp?hub.mode=subscribe"
        "&hub.verify_token=webhook-verify-token&hub.challenge=12345"
    )
    assert ok.status_code == 200
    assert ok.text == "12345"

    forbidden = await whatsapp_client.get(
        "/api/v1/webhooks/whatsapp?hub.mode=subscribe"
        "&hub.verify_token=wrong-token&hub.challenge=12345"
    )
    assert forbidden.status_code == 403


async def test_post_webhook_invalid_signature_returns_403(
    whatsapp_client: AsyncClient,
) -> None:
    token, tenant_id = await _register_owner(whatsapp_client, "owner-wa2@example.com", "WA2")
    await whatsapp_client.put(
        "/api/v1/whatsapp/config",
        json=CONFIG_PAYLOAD,
        headers=_headers(token, tenant_id),
    )

    payload = _inbound_payload(CONFIG_PAYLOAD["phone_number_id"])
    raw_body = json.dumps(payload).encode("utf-8")
    resp = await whatsapp_client.post(
        "/api/v1/webhooks/whatsapp",
        content=raw_body,
        headers={
            "X-Hub-Signature-256": "sha256=invalid",
            "Content-Type": "application/json",
        },
    )
    assert resp.status_code == 403


async def test_post_webhook_valid_signature_saves_and_dedup(
    whatsapp_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    token, tenant_id = await _register_owner(whatsapp_client, "owner-wa3@example.com", "WA3")
    await whatsapp_client.put(
        "/api/v1/whatsapp/config",
        json=CONFIG_PAYLOAD,
        headers=_headers(token, tenant_id),
    )

    payload = _inbound_payload(CONFIG_PAYLOAD["phone_number_id"])
    raw_body = json.dumps(payload).encode("utf-8")
    signature = (
        "sha256="
        + hmac.new(
            CONFIG_PAYLOAD["app_secret"].encode("utf-8"),
            raw_body,
            hashlib.sha256,
        ).hexdigest()
    )

    resp = await whatsapp_client.post(
        "/api/v1/webhooks/whatsapp",
        content=raw_body,
        headers={
            "X-Hub-Signature-256": signature,
            "Content-Type": "application/json",
        },
    )
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}

    result = await db_session.execute(
        select(WhatsAppMessage).where(WhatsAppMessage.tenant_id == tenant_id)
    )
    messages = list(result.scalars().all())
    assert len(messages) == 1
    assert messages[0].wa_message_id == "wamid.inbound.1"
    assert messages[0].body == "Hola"
    assert messages[0].direction == "inbound"

    resp2 = await whatsapp_client.post(
        "/api/v1/webhooks/whatsapp",
        content=raw_body,
        headers={
            "X-Hub-Signature-256": signature,
            "Content-Type": "application/json",
        },
    )
    assert resp2.status_code == 200
    result2 = await db_session.execute(
        select(WhatsAppMessage).where(WhatsAppMessage.tenant_id == tenant_id)
    )
    messages2 = list(result2.scalars().all())
    assert len(messages2) == 1


async def test_send_without_config_returns_503(whatsapp_client: AsyncClient) -> None:
    token, tenant_id = await _register_owner(whatsapp_client, "owner-wa4@example.com", "WA4")
    resp = await whatsapp_client.post(
        "/api/v1/whatsapp/send",
        json={"to_phone": "+5491112345678", "body": "Hola"},
        headers=_headers(token, tenant_id),
    )
    assert resp.status_code == 503


class _FakeResponse:
    status_code = 200

    def json(self) -> dict[str, object]:
        return {"messages": [{"id": "wamid.out.1"}]}

    def raise_for_status(self) -> None:
        pass


class _FakeClient:
    def __init__(self, *args: object, **kwargs: object) -> None:
        pass

    async def __aenter__(self) -> "_FakeClient":
        return self

    async def __aexit__(self, *args: object) -> None:
        pass

    async def post(self, *args: object, **kwargs: object) -> _FakeResponse:
        return _FakeResponse()


async def test_send_with_mocked_provider_saves_outbound_sent(
    whatsapp_client: AsyncClient,
    db_session: AsyncSession,
    monkeypatch,
) -> None:
    monkeypatch.setattr(whatsapp_service.httpx, "AsyncClient", _FakeClient)
    token, tenant_id = await _register_owner(whatsapp_client, "owner-wa5@example.com", "WA5")
    await whatsapp_client.put(
        "/api/v1/whatsapp/config",
        json=CONFIG_PAYLOAD,
        headers=_headers(token, tenant_id),
    )

    resp = await whatsapp_client.post(
        "/api/v1/whatsapp/send",
        json={"to_phone": "+5491112345678", "body": "Hola"},
        headers=_headers(token, tenant_id),
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["status"] == "sent"
    assert body["wa_message_id"] == "wamid.out.1"

    result = await db_session.execute(
        select(WhatsAppMessage).where(WhatsAppMessage.tenant_id == tenant_id)
    )
    messages = list(result.scalars().all())
    assert len(messages) == 1
    assert messages[0].direction == "outbound"
    assert messages[0].status == "sent"
