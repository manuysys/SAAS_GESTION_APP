from unittest.mock import AsyncMock

import pytest
from httpx import Request as HttpxRequest
from httpx import Response as HttpxResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import EmailDelivery
from app.services.email_service import send_email


def _resend_response(
    status_code: int = 200, json: dict[str, object] | None = None
) -> HttpxResponse:
    request = HttpxRequest("POST", "https://api.resend.com/emails")
    return HttpxResponse(status_code=status_code, request=request, json=json)


async def test_console_provider_creates_sent_delivery(
    db_session: AsyncSession,
) -> None:
    result = await send_email(
        db_session,
        template="invitation",
        to_email="test@example.com",
        tenant_id=None,
        variables={
            "subject": "Invitación",
            "tenant_name": "Empresa",
            "role_label": "Técnico",
            "invitation_url": "https://example.com/invitations/abc",
            "expires_hours": 168,
        },
        idempotency_key="idem-1",
    )
    assert result.status == "console"

    rows = await db_session.execute(
        select(EmailDelivery).where(EmailDelivery.idempotency_key == "idem-1")
    )
    deliveries = list(rows.scalars().all())
    assert len(deliveries) == 1
    assert deliveries[0].status == "sent"
    assert deliveries[0].provider == "console"


async def test_idempotent_send_returns_existing_result(
    db_session: AsyncSession,
) -> None:
    result1 = await send_email(
        db_session,
        template="invitation",
        to_email="idem@example.com",
        tenant_id=None,
        variables={
            "subject": "Invitación",
            "tenant_name": "Empresa",
            "role_label": "Técnico",
            "invitation_url": "https://example.com/invitations/abc",
            "expires_hours": 168,
        },
        idempotency_key="idem-2",
    )
    assert result1.status == "console"

    result2 = await send_email(
        db_session,
        template="invitation",
        to_email="idem@example.com",
        tenant_id=None,
        variables={
            "subject": "Invitación",
            "tenant_name": "Empresa",
            "role_label": "Técnico",
            "invitation_url": "https://example.com/invitations/abc",
            "expires_hours": 168,
        },
        idempotency_key="idem-2",
    )
    assert result2.status == "sent"

    rows = await db_session.execute(
        select(EmailDelivery).where(EmailDelivery.idempotency_key == "idem-2")
    )
    assert len(list(rows.scalars().all())) == 1


async def _mock_httpx_client(
    monkeypatch: pytest.MonkeyPatch,
    response: HttpxResponse,
) -> AsyncMock:
    mock_client = AsyncMock()
    mock_client.__aenter__.return_value = mock_client
    mock_client.__aexit__.return_value = False
    mock_client.post.return_value = response
    monkeypatch.setattr("httpx.AsyncClient", lambda *args, **kwargs: mock_client)
    return mock_client


async def test_resend_provider_accepts_request_and_stores_id(
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr("app.services.email_service.settings.email_provider", "resend")
    monkeypatch.setattr("app.services.email_service.settings.resend_api_key", "re_123")

    mock_client = await _mock_httpx_client(
        monkeypatch,
        _resend_response(status_code=200, json={"id": "msg_123"}),
    )

    result = await send_email(
        db_session,
        template="portal_access",
        to_email="cliente@example.com",
        tenant_id=None,
        variables={
            "subject": "Acceso al portal",
            "tenant_name": "Empresa",
            "access_url": "https://example.com/portal/abc?token=xyz",
            "expires_hours": 24,
            "customer_name": "Carlos",
        },
        idempotency_key="resend-idem-1",
    )
    assert result.status == "sent"
    assert result.provider_message_id == "msg_123"

    mock_client.post.assert_called_once()
    call_kwargs = mock_client.post.call_args.kwargs
    assert call_kwargs["json"]["to"] == ["cliente@example.com"]
    assert "Idempotency-Key" in call_kwargs["headers"]


async def test_resend_failure_is_recorded_and_does_not_raise(
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr("app.services.email_service.settings.email_provider", "resend")
    monkeypatch.setattr("app.services.email_service.settings.resend_api_key", "re_123")

    await _mock_httpx_client(
        monkeypatch,
        _resend_response(status_code=422),
    )

    result = await send_email(
        db_session,
        template="portal_access",
        to_email="bad-email",
        tenant_id=None,
        variables={
            "subject": "Acceso al portal",
            "tenant_name": "Empresa",
            "access_url": "https://example.com/portal/abc?token=xyz",
            "expires_hours": 24,
            "customer_name": "Carlos",
        },
        idempotency_key="resend-fail-1",
    )
    assert result.status == "failed"
    assert result.error is not None
