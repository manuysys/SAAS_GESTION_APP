from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import (
    bearer_scheme,
    get_client_ip,
    get_current_user,
)
from app.api.routes.auth import _set_refresh_cookie
from app.core.db import get_db
from app.models import User
from app.schemas.auth import MobileAuthResponse
from app.schemas.invitation import (
    InvitationAcceptRequest,
    PublicInvitationResponse,
)
from app.services import invitation_service, security_service

router = APIRouter(prefix="/public/invitations", tags=["public-invitations"])


@router.get("/{token}", response_model=PublicInvitationResponse)
async def get_public_invitation(
    token: str,
    db: AsyncSession = Depends(get_db),
) -> PublicInvitationResponse:
    tenant, invitation, status_value = await invitation_service.get_public_invitation(
        db, raw_token=token
    )
    return PublicInvitationResponse(
        tenant_name=tenant.name,
        email_masked=invitation_service._mask_email(invitation.email_normalized),
        role=invitation.role,
        expires_at=invitation.expires_at,
        status=status_value,
    )


@router.post("/{token}/accept", response_model=MobileAuthResponse)
async def accept_public_invitation(
    token: str,
    payload: InvitationAcceptRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> MobileAuthResponse:
    await security_service.check_rate_limit(
        db,
        request,
        scope="invitation-accept",
        limit=10,
    )

    credentials = await bearer_scheme(request)
    current_user: User | None = None
    if credentials is not None:
        current_user = await get_current_user(credentials, db)

    result = await invitation_service.accept_invitation(
        db,
        raw_token=token,
        full_name=payload.full_name,
        password=payload.password,
        current_user=current_user,
        client_ip=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    _set_refresh_cookie(response, result.refresh_token)
    return result
