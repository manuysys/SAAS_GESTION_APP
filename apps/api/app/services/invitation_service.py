"""Servicio de invitaciones de equipo.

Las invitaciones usan tokens aleatorios de alta entropía. Solo se almacena el
hash SHA-256; el token crudo se devuelve una sola vez al crear o reenviar.
"""

from __future__ import annotations

import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
    create_access_token,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    refresh_token_expiry,
)
from app.models import Invitation, Membership, RefreshToken, Tenant, User
from app.repositories.invitations import (
    accept_invitation as _mark_accepted,
)
from app.repositories.invitations import (
    create_invitation as _create_invitation_record,
)
from app.repositories.invitations import (
    get_invitation_by_hash,
    get_invitation_by_id,
    get_pending_invitation_by_email,
    list_tenant_invitations,
    list_tenant_members_with_users,
)
from app.repositories.invitations import (
    revoke_invitation as _revoke_invitation_record,
)
from app.repositories.tenants import create_membership
from app.repositories.users import create_user, get_user_by_email
from app.schemas.auth import MobileAuthResponse, TenantResponse, UserResponse
from app.schemas.invitation import TeamMemberResponse
from app.services import audit_service, email_service, plan_limits_service

INVITATION_TTL_DAYS = 7
_REFRESH_TOKEN_DAYS = settings.jwt_refresh_ttl_days


class InvitationError(HTTPException):
    pass


def _role_label(role: str) -> str:
    labels = {
        "owner": "Propietario",
        "admin": "Administrador",
        "dispatcher": "Dispatcher",
        "technician": "Técnico",
        "viewer": "Visualizador",
    }
    return labels.get(role, role.capitalize())


def _can_invite_role(actor_role: str, target_role: str) -> bool:
    if target_role == "owner":
        return False
    if actor_role == "owner":
        return target_role in {"admin", "dispatcher", "technician", "viewer"}
    if actor_role == "admin":
        return target_role in {"dispatcher", "technician", "viewer"}
    return False


def _generate_token() -> tuple[str, str]:
    raw = secrets.token_urlsafe(48)
    token_hash = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    return raw, token_hash


def _invitation_url(raw_token: str) -> str:
    base = settings.app_public_url.rstrip("/")
    return f"{base}/invitations/{raw_token}"


async def _issue_refresh_token(db: AsyncSession, user_id: UUID) -> str:
    raw = generate_refresh_token()
    token = RefreshToken(
        user_id=user_id,
        token_hash=hash_refresh_token(raw),
        expires_at=refresh_token_expiry(),
    )
    db.add(token)
    await db.flush()
    return raw


async def _membership_exists(db: AsyncSession, *, tenant_id: UUID, email: str) -> bool:
    result = await db.execute(
        select(Membership.id)
        .join(User, Membership.user_id == User.id)
        .where(
            Membership.tenant_id == tenant_id,
            Membership.status == "active",
            User.email == email.lower(),
        )
    )
    return result.scalar_one_or_none() is not None


async def create_invitation(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    invited_by_user_id: UUID,
    actor_role: str,
    email: str,
    role: str,
    full_name: str | None = None,
) -> tuple[Invitation, str, str]:
    if not _can_invite_role(actor_role, role):
        raise InvitationError(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tenés permiso para invitar ese rol",
        )

    if await _membership_exists(db, tenant_id=tenant_id, email=email):
        raise InvitationError(
            status_code=status.HTTP_409_CONFLICT,
            detail="El usuario ya es miembro de la empresa",
        )

    existing_pending = await get_pending_invitation_by_email(db, tenant_id=tenant_id, email=email)
    if existing_pending is not None:
        raise InvitationError(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe una invitación pendiente para ese email",
        )

    await plan_limits_service.assert_can_invite_user(db, tenant_id=tenant_id)
    if role == "technician":
        await plan_limits_service.assert_can_invite_technician(db, tenant_id=tenant_id)

    raw, token_hash = _generate_token()
    expires_at = datetime.now(UTC) + timedelta(days=INVITATION_TTL_DAYS)
    invitation = await _create_invitation_record(
        db,
        tenant_id=tenant_id,
        email=email,
        role=role,
        invited_by=invited_by_user_id,
        token_hash=token_hash,
        expires_at=expires_at,
    )

    tenant = await db.get(Tenant, tenant_id)
    tenant_name = tenant.name if tenant is not None else "Tu empresa"
    email_result = await email_service.send_email(
        db,
        template="invitation",
        to_email=email,
        tenant_id=tenant_id,
        variables={
            "subject": f"Invitación a {tenant_name} en DOVEXO",
            "tenant_name": tenant_name,
            "role_label": _role_label(role),
            "invitation_url": _invitation_url(raw),
            "expires_hours": INVITATION_TTL_DAYS * 24,
            "recipient_name": full_name,
        },
        idempotency_key=hashlib.sha256(
            f"invitation:{tenant_id}:{email.lower()}:{invitation.id}".encode()
        ).hexdigest(),
    )

    await audit_service.record(
        db,
        action="invitation_created",
        entity_type="invitation",
        entity_id=str(invitation.id),
        tenant_id=tenant_id,
        actor_user_id=invited_by_user_id,
        metadata={
            "email_domain": email.split("@")[-1],
            "role": role,
            "email_status": email_result.status,
        },
    )
    await db.commit()
    await db.refresh(invitation)
    return invitation, raw, email_result.status


async def resend_invitation(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    invitation_id: UUID,
    actor_role: str,
    invited_by_user_id: UUID,
) -> tuple[Invitation, str, str]:
    invitation = await get_invitation_by_id(db, invitation_id=invitation_id)
    if invitation is None or invitation.tenant_id != tenant_id:
        raise InvitationError(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitación no encontrada",
        )

    if not _can_invite_role(actor_role, invitation.role):
        raise InvitationError(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tenés permiso para reenviar esa invitación",
        )

    if invitation.accepted_at is not None:
        raise InvitationError(
            status_code=status.HTTP_409_CONFLICT,
            detail="La invitación ya fue aceptada",
        )
    if invitation.revoked_at is not None:
        raise InvitationError(
            status_code=status.HTTP_409_CONFLICT,
            detail="La invitación fue revocada",
        )

    raw, token_hash = _generate_token()
    invitation.token_hash = token_hash
    invitation.expires_at = datetime.now(UTC) + timedelta(days=INVITATION_TTL_DAYS)
    await db.flush()

    tenant = await db.get(Tenant, tenant_id)
    tenant_name = tenant.name if tenant is not None else "Tu empresa"
    email_result = await email_service.send_email(
        db,
        template="invitation",
        to_email=invitation.email_normalized,
        tenant_id=tenant_id,
        variables={
            "subject": f"Invitación a {tenant_name} en DOVEXO",
            "tenant_name": tenant_name,
            "role_label": _role_label(invitation.role),
            "invitation_url": _invitation_url(raw),
            "expires_hours": INVITATION_TTL_DAYS * 24,
        },
        idempotency_key=hashlib.sha256(
            f"invitation_resend:{tenant_id}:{invitation.email_normalized}:{invitation.id}".encode()
        ).hexdigest(),
    )

    await audit_service.record(
        db,
        action="invitation_resent",
        entity_type="invitation",
        entity_id=str(invitation.id),
        tenant_id=tenant_id,
        actor_user_id=invited_by_user_id,
        metadata={
            "email_domain": invitation.email_normalized.split("@")[-1],
            "role": invitation.role,
            "email_status": email_result.status,
        },
    )
    await db.commit()
    await db.refresh(invitation)
    return invitation, raw, email_result.status


async def revoke_invitation(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    invitation_id: UUID,
    actor_role: str,
    invited_by_user_id: UUID,
) -> None:
    invitation = await get_invitation_by_id(db, invitation_id=invitation_id)
    if invitation is None or invitation.tenant_id != tenant_id:
        raise InvitationError(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitación no encontrada",
        )

    if not _can_invite_role(actor_role, invitation.role):
        raise InvitationError(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tenés permiso para revocar esa invitación",
        )

    if invitation.accepted_at is not None:
        raise InvitationError(
            status_code=status.HTTP_409_CONFLICT,
            detail="La invitación ya fue aceptada",
        )
    if invitation.revoked_at is not None:
        raise InvitationError(
            status_code=status.HTTP_409_CONFLICT,
            detail="La invitación ya está revocada",
        )

    await _revoke_invitation_record(db, invitation_id=invitation.id)
    await audit_service.record(
        db,
        action="invitation_revoked",
        entity_type="invitation",
        entity_id=str(invitation.id),
        tenant_id=tenant_id,
        actor_user_id=invited_by_user_id,
        metadata={"email_domain": invitation.email_normalized.split("@")[-1]},
    )
    await db.commit()


def _mask_email(email: str) -> str:
    local, _, domain = email.partition("@")
    if len(local) <= 2:
        return f"{local[0]}***@{domain}"
    return f"{local[0]}***{local[-1]}@{domain}"


def _invitation_status(invitation: Invitation) -> str:
    now = datetime.now(UTC)
    if invitation.accepted_at is not None:
        return "accepted"
    if invitation.revoked_at is not None:
        return "revoked"
    if invitation.expires_at <= now:
        return "expired"
    return "pending"


async def get_public_invitation(
    db: AsyncSession, *, raw_token: str
) -> tuple[Tenant, Invitation, str]:
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    invitation = await get_invitation_by_hash(db, token_hash=token_hash)
    if invitation is None:
        raise InvitationError(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitación no encontrada",
        )

    tenant = await db.get(Tenant, invitation.tenant_id)
    if tenant is None:
        raise InvitationError(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empresa no encontrada",
        )

    status_value = _invitation_status(invitation)
    return tenant, invitation, status_value


async def accept_invitation(
    db: AsyncSession,
    *,
    raw_token: str,
    full_name: str | None = None,
    password: str | None = None,
    current_user: User | None = None,
    client_ip: str | None = None,
    user_agent: str | None = None,
) -> MobileAuthResponse:
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    invitation = await get_invitation_by_hash(db, token_hash=token_hash)
    if invitation is None:
        raise InvitationError(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitación no encontrada",
        )

    if invitation.revoked_at is not None:
        raise InvitationError(
            status_code=status.HTTP_410_GONE,
            detail="La invitación fue revocada",
        )
    if invitation.accepted_at is not None:
        raise InvitationError(
            status_code=status.HTTP_409_CONFLICT,
            detail="La invitación ya fue aceptada",
        )
    if invitation.expires_at <= datetime.now(UTC):
        raise InvitationError(
            status_code=status.HTTP_410_GONE,
            detail="La invitación venció",
        )

    target_email = invitation.email_normalized

    if current_user is not None:
        if current_user.email.lower() != target_email:
            raise InvitationError(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="El email de la sesión no coincide con la invitación",
            )
        user = current_user
    else:
        if not full_name or not password:
            raise InvitationError(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Se requieren nombre y contraseña para crear la cuenta",
            )
        existing = await get_user_by_email(db, target_email)
        if existing is not None:
            raise InvitationError(
                status_code=status.HTTP_409_CONFLICT,
                detail="El email ya tiene una cuenta. Iniciá sesión para aceptar.",
            )
        user = await create_user(
            db,
            email=target_email,
            password_hash=hash_password(password),
            full_name=full_name.strip(),
        )

    existing_membership = await db.execute(
        select(Membership).where(
            Membership.tenant_id == invitation.tenant_id,
            Membership.user_id == user.id,
            Membership.status == "active",
        )
    )
    if existing_membership.scalar_one_or_none() is not None:
        raise InvitationError(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya sos miembro de esta empresa",
        )

    await create_membership(
        db,
        tenant_id=invitation.tenant_id,
        user_id=user.id,
        role=invitation.role,
    )
    await _mark_accepted(db, invitation=invitation)

    refresh_raw = await _issue_refresh_token(db, user.id)
    access_token, expires_in = create_access_token(str(user.id))

    tenant = await db.get(Tenant, invitation.tenant_id)
    assert tenant is not None

    await audit_service.record(
        db,
        action="invitation_accepted",
        entity_type="invitation",
        entity_id=str(invitation.id),
        tenant_id=tenant.id,
        actor_user_id=user.id,
        metadata={"email_domain": target_email.split("@")[-1]},
        ip=client_ip,
        user_agent=user_agent,
    )
    await db.commit()
    await db.refresh(user)
    await db.refresh(tenant)

    return MobileAuthResponse(
        access_token=access_token,
        refresh_token=refresh_raw,
        token_type="bearer",  # noqa: S106
        expires_in=expires_in,
        tenants=[
            TenantResponse(
                id=tenant.id,
                name=tenant.name,
                slug=tenant.slug,
                role=invitation.role,
            )
        ],
        user=UserResponse.model_validate(user),
    )


async def get_team_list(
    db: AsyncSession, *, tenant_id: UUID
) -> tuple[list[TeamMemberResponse], list[Invitation]]:
    members = await list_tenant_members_with_users(db, tenant_id=tenant_id)
    invitations = await list_tenant_invitations(db, tenant_id=tenant_id)
    member_rows = [
        TeamMemberResponse(
            id=membership.id,
            user_id=user.id,
            full_name=user.full_name,
            email=user.email,
            role=membership.role,
            status=membership.status,
            last_login_at=None,
        )
        for membership, user in members
    ]
    return member_rows, invitations


__all__ = [
    "_invitation_status",
    "accept_invitation",
    "create_invitation",
    "get_public_invitation",
    "get_team_list",
    "resend_invitation",
    "revoke_invitation",
]
