"""Servicio de email transaccional.

Soporta los proveedores ``console`` (desarrollo) y ``resend`` (producción).
Nunca se debe llamar directamente a Resend desde endpoints; todo pasa por acá.
"""

# ruff: noqa: E501

from __future__ import annotations

import hashlib
import secrets
from dataclasses import dataclass
from typing import Any, Literal
from uuid import UUID

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import get_logger
from app.repositories.email_deliveries import (
    create_delivery,
    get_delivery_by_idempotency_key,
    mark_delivery_failed,
    mark_delivery_sent,
)

logger = get_logger(__name__)


@dataclass(frozen=True)
class EmailResult:
    status: Literal["sent", "failed", "console", "not_sent"]
    provider_message_id: str | None = None
    error: str | None = None


def _brand_name() -> str:
    return "DOVEXO"


def _company_name() -> str:
    return "ARVOKTA"


def _build_idempotency_key(
    template: str,
    to_email: str,
    tenant_id: UUID | None,
    suffix: str | None = None,
) -> str:
    parts = [template, to_email.lower(), str(tenant_id) if tenant_id else "global"]
    if suffix:
        parts.append(suffix)
    raw = "|".join(parts)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _invitation_html(
    tenant_name: str,
    role_label: str,
    invitation_url: str,
    expires_hours: int,
    recipient_name: str | None = None,
) -> str:
    greeting = f"Hola, {recipient_name}" if recipient_name else "Hola"
    return f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Invitación a {_brand_name()}</title>
</head>
<body style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#f4f4f5; padding:24px;">
<div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:12px; padding:32px; box-shadow:0 4px 6px rgba(0,0,0,0.05);">
<h1 style="color:#111827; font-size:24px; margin-bottom:16px;">{greeting}</h1>
<p style="color:#374151; font-size:16px; line-height:1.6;">
{tenant_name} te invita a unirte a <strong>{_brand_name()}</strong> como <strong>{role_label}</strong>.
</p>
<p style="color:#374151; font-size:16px; line-height:1.6;">
Hacé clic en el botón para aceptar la invitación. El enlace vence en {expires_hours} horas.
</p>
<div style="margin:32px 0; text-align:center;">
<a href="{invitation_url}" style="background:#0F766E; color:#ffffff; text-decoration:none; padding:14px 28px; border-radius:8px; font-weight:600; display:inline-block;">Aceptar invitación</a>
</div>
<p style="color:#6B7280; font-size:14px; line-height:1.5;">
Si el botón no funciona, copiá y pegá este enlace en tu navegador:<br>
<a href="{invitation_url}" style="color:#0F766E;">{invitation_url}</a>
</p>
<p style="color:#9CA3AF; font-size:12px; margin-top:32px; border-top:1px solid #E5E7EB; padding-top:16px;">
{_company_name()} · {_brand_name()} · No respondas a este correo.
</p>
</div>
</body>
</html>"""


def _invitation_text(
    tenant_name: str,
    role_label: str,
    invitation_url: str,
    expires_hours: int,
    recipient_name: str | None = None,
) -> str:
    greeting = f"Hola, {recipient_name}" if recipient_name else "Hola"
    return f"""{greeting}

{tenant_name} te invita a unirte a {_brand_name()} como {role_label}.

Aceptá la invitación en: {invitation_url}

El enlace vence en {expires_hours} horas.

{_company_name()} · {_brand_name()} · No respondas a este correo."""


def _portal_access_html(
    tenant_name: str,
    access_url: str,
    expires_hours: int,
    customer_name: str,
) -> str:
    return f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Tu acceso a {_brand_name()}</title>
</head>
<body style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#f4f4f5; padding:24px;">
<div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:12px; padding:32px; box-shadow:0 4px 6px rgba(0,0,0,0.05);">
<h1 style="color:#111827; font-size:24px; margin-bottom:16px;">Hola, {customer_name}</h1>
<p style="color:#374151; font-size:16px; line-height:1.6;">
{tenant_name} te envió un acceso seguro para consultar tus solicitudes, órdenes, presupuestos y pagos en <strong>{_brand_name()}</strong>.
</p>
<div style="margin:32px 0; text-align:center;">
<a href="{access_url}" style="background:#0F766E; color:#ffffff; text-decoration:none; padding:14px 28px; border-radius:8px; font-weight:600; display:inline-block;">Ingresar al portal</a>
</div>
<p style="color:#6B7280; font-size:14px; line-height:1.5;">
El enlace es de uso personal y vence en {expires_hours} horas. No lo compartas.<br>
Si el botón no funciona, copiá y pegá este enlace:<br>
<a href="{access_url}" style="color:#0F766E;">{access_url}</a>
</p>
<p style="color:#9CA3AF; font-size:12px; margin-top:32px; border-top:1px solid #E5E7EB; padding-top:16px;">
{_company_name()} · {_brand_name()} · No respondas a este correo.
</p>
</div>
</body>
</html>"""


def _portal_access_text(
    tenant_name: str,
    access_url: str,
    expires_hours: int,
    customer_name: str,
) -> str:
    return f"""Hola, {customer_name}

{tenant_name} te envió un acceso seguro para consultar tus solicitudes, órdenes, presupuestos y pagos en {_brand_name()}.

Ingresá en: {access_url}

El enlace es de uso personal y vence en {expires_hours} horas. No lo compartas.

{_company_name()} · {_brand_name()} · No respondas a este correo."""


def _render(template: str, variables: dict[str, Any]) -> tuple[str, str]:
    if template == "invitation":
        recipient_name: str | None = None
        if "recipient_name" in variables and variables["recipient_name"] is not None:
            recipient_name = str(variables["recipient_name"])
        html = _invitation_html(
            tenant_name=str(variables.get("tenant_name", "")),
            role_label=str(variables.get("role_label", "")),
            invitation_url=str(variables.get("invitation_url", "")),
            expires_hours=int(variables.get("expires_hours", 168)),
            recipient_name=recipient_name,
        )
        text = _invitation_text(
            tenant_name=str(variables.get("tenant_name", "")),
            role_label=str(variables.get("role_label", "")),
            invitation_url=str(variables.get("invitation_url", "")),
            expires_hours=int(variables.get("expires_hours", 168)),
            recipient_name=recipient_name,
        )
        return html, text

    if template == "portal_access":
        html = _portal_access_html(
            tenant_name=str(variables.get("tenant_name", "")),
            access_url=str(variables.get("access_url", "")),
            expires_hours=int(variables.get("expires_hours", 24)),
            customer_name=str(variables.get("customer_name", "")),
        )
        text = _portal_access_text(
            tenant_name=str(variables.get("tenant_name", "")),
            access_url=str(variables.get("access_url", "")),
            expires_hours=int(variables.get("expires_hours", 24)),
            customer_name=str(variables.get("customer_name", "")),
        )
        return html, text

    raise ValueError(f"Unknown email template: {template}")


async def send_email(
    db: AsyncSession,
    *,
    template: str,
    to_email: str,
    variables: dict[str, Any],
    tenant_id: UUID | None = None,
    idempotency_key: str | None = None,
) -> EmailResult:
    """Envía un email transaccional y registra el intento.

    Si ``idempotency_key`` no se provee, se genera una clave estable a partir del
    template, destinatario y tenant. Un envío exitoso previento con la misma
    clave devuelve el resultado almacenado sin volver a llamar al proveedor.
    """
    key = idempotency_key or _build_idempotency_key(
        template=template,
        to_email=to_email,
        tenant_id=tenant_id,
        suffix=secrets.token_hex(4),
    )

    existing = await get_delivery_by_idempotency_key(db, idempotency_key=key)
    if existing is not None and existing.status == "sent":
        return EmailResult(
            status="sent",  # type: ignore[arg-type]
            provider_message_id=existing.provider_message_id,
        )

    html, text = _render(template, variables)
    subject = str(variables.get("subject", f"{_brand_name()} - Notificación"))

    if settings.email_provider == "resend" and settings.resend_api_key:
        return await _send_via_resend(
            db,
            template=template,
            to_email=to_email,
            subject=subject,
            html=html,
            text=text,
            tenant_id=tenant_id,
            idempotency_key=key,
        )

    return await _send_via_console(
        db,
        template=template,
        to_email=to_email,
        subject=subject,
        html=html,
        text=text,
        tenant_id=tenant_id,
        idempotency_key=key,
    )


async def _send_via_console(
    db: AsyncSession,
    *,
    template: str,
    to_email: str,
    subject: str,
    html: str,
    text: str,
    tenant_id: UUID | None,
    idempotency_key: str,
) -> EmailResult:
    logger.info(
        "email_console",
        template=template,
        to_email_hash=hashlib.sha256(to_email.lower().encode()).hexdigest()[:16],
        tenant_id=str(tenant_id) if tenant_id else None,
        subject=subject,
    )
    await create_delivery(
        db,
        tenant_id=tenant_id,
        to_email=to_email,
        template=template,
        subject=subject,
        status="sent",
        provider="console",
        idempotency_key=idempotency_key,
    )
    return EmailResult(status="console")  # type: ignore[arg-type]


async def _send_via_resend(
    db: AsyncSession,
    *,
    template: str,
    to_email: str,
    subject: str,
    html: str,
    text: str,
    tenant_id: UUID | None,
    idempotency_key: str,
) -> EmailResult:
    delivery = await create_delivery(
        db,
        tenant_id=tenant_id,
        to_email=to_email,
        template=template,
        subject=subject,
        status="queued",
        provider="resend",
        idempotency_key=idempotency_key,
    )

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {settings.resend_api_key}",
                    "Content-Type": "application/json",
                    "Idempotency-Key": idempotency_key,
                },
                json={
                    "from": settings.email_from,
                    "to": [to_email.lower()],
                    "subject": subject,
                    "html": html,
                    "text": text,
                },
            )
            response.raise_for_status()
            payload = response.json()
            message_id = payload.get("id")
            await mark_delivery_sent(db, delivery_id=delivery.id, provider_message_id=message_id)
            return EmailResult(status="sent", provider_message_id=message_id)
    except Exception as exc:
        error_message = f"{type(exc).__name__}: {exc}"
        logger.warning(
            "email_resend_failed",
            template=template,
            to_email_hash=hashlib.sha256(to_email.lower().encode()).hexdigest()[:16],
            error=error_message,
        )
        await mark_delivery_failed(db, delivery_id=delivery.id, error=error_message)
        return EmailResult(status="failed", error=error_message)
