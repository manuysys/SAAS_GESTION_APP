from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_roles
from app.core.db import get_db
from app.models import Membership
from app.schemas.invitation import (
    InvitationCreateRequest,
    InvitationCreateResponse,
    TeamInvitationResponse,
    TeamListResponse,
)
from app.services import invitation_service

router = APIRouter(prefix="/team", tags=["team"])
ADMIN_INVITE_ROLES = ("owner", "admin")


@router.get("", response_model=TeamListResponse)
async def list_team(
    membership: Membership = Depends(require_roles(*ADMIN_INVITE_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> TeamListResponse:
    member_rows, invitations = await invitation_service.get_team_list(
        db, tenant_id=membership.tenant_id
    )
    return TeamListResponse(
        members=member_rows,
        invitations=[
            TeamInvitationResponse(
                id=inv.id,
                email=inv.email_normalized,
                role=inv.role,
                status=invitation_service._invitation_status(inv),
                expires_at=inv.expires_at,
                created_at=inv.created_at,
            )
            for inv in invitations
        ],
    )


@router.post(
    "/invitations", response_model=InvitationCreateResponse, status_code=status.HTTP_201_CREATED
)
async def create_invitation(
    payload: InvitationCreateRequest,
    membership: Membership = Depends(require_roles(*ADMIN_INVITE_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> InvitationCreateResponse:
    invitation, raw_token, email_status = await invitation_service.create_invitation(
        db,
        tenant_id=membership.tenant_id,
        invited_by_user_id=membership.user_id,
        actor_role=membership.role,
        email=str(payload.email),
        role=payload.role,
        full_name=payload.full_name,
    )
    return InvitationCreateResponse(
        id=invitation.id,
        email=invitation.email_normalized,
        role=invitation.role,
        status=invitation_service._invitation_status(invitation),
        expires_at=invitation.expires_at,
        created_at=invitation.created_at,
        invitation_url=invitation_service._invitation_url(raw_token),
        email_status=email_status,
    )


@router.post("/invitations/{invitation_id}/resend", response_model=InvitationCreateResponse)
async def resend_invitation(
    invitation_id: UUID,
    membership: Membership = Depends(require_roles(*ADMIN_INVITE_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> InvitationCreateResponse:
    invitation, raw_token, email_status = await invitation_service.resend_invitation(
        db,
        tenant_id=membership.tenant_id,
        invitation_id=invitation_id,
        actor_role=membership.role,
        invited_by_user_id=membership.user_id,
    )
    return InvitationCreateResponse(
        id=invitation.id,
        email=invitation.email_normalized,
        role=invitation.role,
        status=invitation_service._invitation_status(invitation),
        expires_at=invitation.expires_at,
        created_at=invitation.created_at,
        invitation_url=invitation_service._invitation_url(raw_token),
        email_status=email_status,
    )


@router.delete("/invitations/{invitation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_invitation(
    invitation_id: UUID,
    membership: Membership = Depends(require_roles(*ADMIN_INVITE_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> None:
    await invitation_service.revoke_invitation(
        db,
        tenant_id=membership.tenant_id,
        invitation_id=invitation_id,
        actor_role=membership.role,
        invited_by_user_id=membership.user_id,
    )
