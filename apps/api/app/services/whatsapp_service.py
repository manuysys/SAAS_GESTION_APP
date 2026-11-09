from __future__ import annotations

import hmac
from uuid import UUID

import httpx
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.crypto import decrypt_secret, encrypt_secret
from app.models import WhatsAppConfig
from app.repositories import whatsapp as repo
from app.schemas.whatsapp import (
    WhatsAppConfigResponse,
    WhatsAppConfigUpdate,
    WhatsAppMessageListResponse,
    WhatsAppMessageResponse,
    WhatsAppSendRequest,
    WhatsAppSendResponse,
)


class _ProviderError(Exception):
    pass


async def get_config(
    db: AsyncSession,
    *,
    tenant_id: UUID,
) -> WhatsAppConfigResponse:
    config = await repo.get_config_by_tenant(db, tenant_id)
    if config is None:
        return WhatsAppConfigResponse(
            configured=False,
            active=False,
            phone_number_id=None,
            business_account_id=None,
            has_access_token=False,
            has_verify_token=False,
            has_app_secret=False,
        )
    return _config_to_response(config)


async def update_config(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    payload: WhatsAppConfigUpdate,
) -> WhatsAppConfigResponse:
    _require_encryption_key()

    data = payload.model_dump(exclude_unset=True)

    existing = await repo.get_config_by_tenant(db, tenant_id)
    access_token_encrypted = (
        encrypt_secret(data["access_token"])
        if "access_token" in data and data["access_token"] is not None
        else None
    )
    verify_token_encrypted = (
        encrypt_secret(data["verify_token"])
        if "verify_token" in data and data["verify_token"] is not None
        else None
    )
    app_secret_encrypted = (
        encrypt_secret(data["app_secret"])
        if "app_secret" in data and data["app_secret"] is not None
        else None
    )

    # Preserve existing encrypted secrets when the request omits them.
    if access_token_encrypted is None and existing is not None:
        access_token_encrypted = existing.access_token_encrypted
    if verify_token_encrypted is None and existing is not None:
        verify_token_encrypted = existing.verify_token_encrypted
    if app_secret_encrypted is None and existing is not None:
        app_secret_encrypted = existing.app_secret_encrypted

    config = await repo.upsert_config(
        db,
        tenant_id=tenant_id,
        phone_number_id=payload.phone_number_id,
        business_account_id=payload.business_account_id,
        access_token_encrypted=access_token_encrypted,
        verify_token_encrypted=verify_token_encrypted,
        app_secret_encrypted=app_secret_encrypted,
        active=payload.active,
    )
    await db.commit()
    await db.refresh(config)
    return _config_to_response(config)


async def list_messages(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    limit: int,
    offset: int,
) -> WhatsAppMessageListResponse:
    items, total = await repo.list_messages(db, tenant_id=tenant_id, limit=limit, offset=offset)
    return WhatsAppMessageListResponse(
        items=[WhatsAppMessageResponse.model_validate(item) for item in items],
        total=total,
        limit=limit,
        offset=offset,
    )


async def send_text(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    payload: WhatsAppSendRequest,
) -> WhatsAppSendResponse:
    _require_encryption_key()

    config = await repo.get_config_by_tenant(db, tenant_id)
    if config is None or not config.active or not config.access_token_encrypted:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="WhatsApp no configurado",
        )

    access_token = decrypt_secret(config.access_token_encrypted)
    url = (
        f"https://graph.facebook.com/{settings.whatsapp_api_version}"
        f"/{config.phone_number_id}/messages"
    )
    graph_payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": payload.to_phone,
        "type": "text",
        "text": {"body": payload.body},
    }

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                url, headers={"Authorization": f"Bearer {access_token}"}, json=graph_payload
            )
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPError as exc:
        message = await repo.create_message(
            db,
            tenant_id=tenant_id,
            direction="outbound",
            wa_message_id=None,
            from_phone=config.phone_number_id,
            to_phone=payload.to_phone,
            message_type="text",
            body=payload.body,
            status="failed",
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"WhatsApp provider error: {exc}",
        ) from exc

    wa_message_id = _extract_wa_message_id(data)
    message = await repo.create_message(
        db,
        tenant_id=tenant_id,
        direction="outbound",
        wa_message_id=wa_message_id,
        from_phone=config.phone_number_id,
        to_phone=payload.to_phone,
        message_type="text",
        body=payload.body,
        status="sent",
    )
    await db.commit()
    await db.refresh(message)
    return WhatsAppSendResponse(id=message.id, status=message.status, wa_message_id=wa_message_id)


async def verify_webhook(
    mode: str,
    token: str,
    challenge: str,
) -> int:
    if mode != "subscribe" or token != settings.whatsapp_verify_token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid verification token",
        )
    try:
        return int(challenge)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid challenge",
        ) from exc


async def handle_webhook(
    db: AsyncSession,
    payload: dict[str, object],
    raw_body: bytes,
    signature: str | None,
) -> dict[str, str]:
    phone_number_id = _extract_phone_number_id(payload)
    if phone_number_id is None:
        return {"status": "ok"}

    config = await repo.get_config_by_phone_number_id(db, phone_number_id)
    if config is None:
        return {"status": "ok"}

    if not config.app_secret_encrypted:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid signature",
        )

    app_secret = decrypt_secret(config.app_secret_encrypted)
    if not _verify_signature(raw_body, signature, app_secret):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid signature",
        )

    to_phone = _extract_to_phone(payload)
    for message in _iter_messages(payload):
        wa_message_id = str(message.get("id", "")) or None
        if wa_message_id is None:
            continue
        existing = await repo.get_message_by_wa_message_id(
            db, tenant_id=config.tenant_id, wa_message_id=wa_message_id
        )
        if existing is not None:
            continue

        body = _extract_message_body(message)
        await repo.create_message(
            db,
            tenant_id=config.tenant_id,
            direction="inbound",
            wa_message_id=wa_message_id,
            from_phone=str(message.get("from", "")),
            to_phone=to_phone,
            message_type=str(message.get("type", "unknown")),
            body=body,
            status="received",
            payload=message,
        )

    await db.commit()
    return {"status": "ok"}


def _config_to_response(config: WhatsAppConfig) -> WhatsAppConfigResponse:
    return WhatsAppConfigResponse(
        configured=True,
        active=config.active,
        phone_number_id=config.phone_number_id,
        business_account_id=config.business_account_id,
        has_access_token=bool(config.access_token_encrypted),
        has_verify_token=bool(config.verify_token_encrypted),
        has_app_secret=bool(config.app_secret_encrypted),
    )


def _require_encryption_key() -> None:
    if not settings.whatsapp_encryption_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="WhatsApp encryption key not configured",
        )


def _extract_wa_message_id(data: dict[str, object]) -> str | None:
    messages = data.get("messages")
    if not isinstance(messages, list) or not messages:
        return None
    first = messages[0]
    if not isinstance(first, dict):
        return None
    return str(first.get("id")) if first.get("id") is not None else None


def _extract_phone_number_id(payload: dict[str, object]) -> str | None:
    entry = _first(payload.get("entry"))
    if not isinstance(entry, dict):
        return None
    changes = _first(entry.get("changes"))
    if not isinstance(changes, dict):
        return None
    value = changes.get("value")
    if not isinstance(value, dict):
        return None
    metadata = value.get("metadata")
    if not isinstance(metadata, dict):
        return None
    phone_number_id = metadata.get("phone_number_id")
    return str(phone_number_id) if phone_number_id is not None else None


def _extract_to_phone(payload: dict[str, object]) -> str:
    entry = _first(payload.get("entry"))
    if not isinstance(entry, dict):
        return ""
    changes = _first(entry.get("changes"))
    if not isinstance(changes, dict):
        return ""
    value = changes.get("value")
    if not isinstance(value, dict):
        return ""
    metadata = value.get("metadata")
    if not isinstance(metadata, dict):
        return ""
    display_phone_number = metadata.get("display_phone_number")
    return str(display_phone_number) if display_phone_number is not None else ""


def _iter_messages(payload: dict[str, object]) -> list[dict[str, object]]:
    entry = _first(payload.get("entry"))
    if not isinstance(entry, dict):
        return []
    changes = _first(entry.get("changes"))
    if not isinstance(changes, dict):
        return []
    value = changes.get("value")
    if not isinstance(value, dict):
        return []
    messages = value.get("messages")
    if not isinstance(messages, list):
        return []
    return [msg for msg in messages if isinstance(msg, dict)]


def _extract_message_body(message: dict[str, object]) -> str | None:
    text = message.get("text")
    if not isinstance(text, dict):
        return None
    body = text.get("body")
    return str(body) if body is not None else None


def _first(value: object) -> object:
    if isinstance(value, list) and value:
        return value[0]
    return value


def _verify_signature(raw_body: bytes, signature: str | None, secret: str) -> bool:
    if signature is None or not signature.startswith("sha256="):
        return False
    expected = hmac.new(secret.encode("utf-8"), raw_body, "sha256").hexdigest()
    return hmac.compare_digest(signature[7:], expected)
