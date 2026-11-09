from uuid import UUID

from fastapi import Depends, Header, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.db import get_db
from app.core.security import decode_access_token
from app.models import Membership, User

bearer_scheme = HTTPBearer(auto_error=False)


def validate_cookie_origin(request: Request) -> None:
    """Valida Origin/Referer para endpoints que usan cookies.

    Si no hay header Origin (clientes API no-browser), permite la request.
    Si el origen no pertenece a API_CORS_ORIGINS, rechaza con 403.
    """
    origin = request.headers.get("origin") or request.headers.get("referer")
    if not origin:
        return

    allowed = settings.api_cors_origins
    for allowed_origin in allowed:
        if origin.startswith(allowed_origin):
            return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Invalid origin",
    )


def get_client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip() or None
    if request.client is not None:
        return request.client.host
    return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_access_token(credentials.credentials)
        user_id = UUID(str(payload["sub"]))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    user = await db.get(User, user_id)
    if user is None or user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
    return user


async def get_current_membership(
    x_tenant_id: UUID = Header(..., alias="X-Tenant-ID"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Membership:
    result = await db.execute(
        select(Membership)
        .where(
            Membership.tenant_id == x_tenant_id,
            Membership.user_id == user.id,
            Membership.status == "active",
        )
        .options(selectinload(Membership.user))
    )
    membership = result.scalar_one_or_none()
    if membership is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found",
        )
    return membership


def require_roles(*roles: str):
    async def dependency(membership: Membership = Depends(get_current_membership)) -> Membership:
        if membership.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return membership

    return dependency


def _is_platform_admin(user: User) -> bool:
    if user.is_platform_admin:
        return True
    if user.email:
        admin_emails = {email.lower().strip() for email in settings.platform_admin_emails}
        return user.email.lower() in admin_emails
    return False


def require_platform_admin(
    membership: Membership = Depends(get_current_membership),
) -> Membership:
    if not _is_platform_admin(membership.user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Platform admin access required",
        )
    return membership
