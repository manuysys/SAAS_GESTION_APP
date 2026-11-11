from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Invitation, Membership, Tenant, User


async def get_invitation_by_id(db: AsyncSession, *, invitation_id: UUID) -> Invitation | None:
    result = await db.execute(select(Invitation).where(Invitation.id == invitation_id))
    return result.scalar_one_or_none()


async def get_invitation_by_hash(db: AsyncSession, *, token_hash: str) -> Invitation | None:
    result = await db.execute(select(Invitation).where(Invitation.token_hash == token_hash))
    return result.scalar_one_or_none()


async def get_pending_invitation_by_email(
    db: AsyncSession, *, tenant_id: UUID, email: str
) -> Invitation | None:
    result = await db.execute(
        select(Invitation).where(
            Invitation.tenant_id == tenant_id,
            Invitation.email_normalized == email.lower(),
            Invitation.accepted_at.is_(None),
            Invitation.revoked_at.is_(None),
        )
    )
    return result.scalar_one_or_none()


async def create_invitation(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    email: str,
    role: str,
    invited_by: UUID,
    token_hash: str,
    expires_at: datetime,
) -> Invitation:
    invitation = Invitation(
        tenant_id=tenant_id,
        email_normalized=email.lower(),
        role=role,
        invited_by=invited_by,
        token_hash=token_hash,
        expires_at=expires_at,
    )
    db.add(invitation)
    await db.flush()
    return invitation


async def revoke_invitation(db: AsyncSession, *, invitation_id: UUID) -> Invitation | None:
    invitation = await get_invitation_by_id(db, invitation_id=invitation_id)
    if invitation is None:
        return None
    invitation.revoked_at = datetime.now(UTC)
    return invitation


async def accept_invitation(db: AsyncSession, *, invitation: Invitation) -> None:
    invitation.accepted_at = datetime.now(UTC)


async def list_tenant_invitations(db: AsyncSession, *, tenant_id: UUID) -> list[Invitation]:
    result = await db.execute(
        select(Invitation)
        .where(Invitation.tenant_id == tenant_id)
        .order_by(Invitation.created_at.desc())
    )
    return list(result.scalars().all())


async def list_tenant_members_with_users(
    db: AsyncSession, *, tenant_id: UUID
) -> list[tuple[Membership, User]]:
    result = await db.execute(
        select(Membership, User)
        .join(User, Membership.user_id == User.id)
        .where(
            Membership.tenant_id == tenant_id,
            Membership.status == "active",
        )
        .order_by(User.full_name.asc())
    )
    return list(result.all())


async def get_tenant_by_id(db: AsyncSession, *, tenant_id: UUID) -> Tenant | None:
    return await db.get(Tenant, tenant_id)
