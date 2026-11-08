from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.db import get_db
from app.models import User
from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    MeResponse,
    RegisterRequest,
    TenantResponse,
    TokenResponse,
    UserResponse,
)
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])

REFRESH_COOKIE = "refresh_token"
REFRESH_COOKIE_PATH = "/api/v1/auth"


def _set_refresh_cookie(response: Response, raw_token: str) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE,
        value=raw_token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        max_age=settings.jwt_refresh_ttl_days * 24 * 60 * 60,
        path=REFRESH_COOKIE_PATH,
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(key=REFRESH_COOKIE, path=REFRESH_COOKIE_PATH)


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(
    payload: RegisterRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> AuthResponse:
    _user, tenant, access_token, expires_in, refresh_token = await auth_service.register(
        db, payload
    )
    _set_refresh_cookie(response, refresh_token)
    return AuthResponse(
        access_token=access_token,
        expires_in=expires_in,
        tenants=[
            TenantResponse(
                id=tenant.id,
                name=tenant.name,
                slug=tenant.slug,
                role="owner",
            )
        ],
    )


@router.post("/login", response_model=AuthResponse)
async def login(
    payload: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> AuthResponse:
    user, access_token, expires_in, refresh_token = await auth_service.login(
        db, str(payload.email), payload.password
    )
    _, memberships = await auth_service.get_me(db, user)
    _set_refresh_cookie(response, refresh_token)
    return AuthResponse(
        access_token=access_token,
        expires_in=expires_in,
        tenants=[
            TenantResponse(
                id=membership.tenant.id,
                name=membership.tenant.name,
                slug=membership.tenant.slug,
                role=membership.role,
            )
            for membership in memberships
        ],
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    response: Response,
    refresh_token: str | None = Cookie(default=None, alias=REFRESH_COOKIE),
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing refresh token",
        )
    _, access_token, expires_in, new_refresh = await auth_service.rotate_refresh_token(
        db, refresh_token
    )
    _set_refresh_cookie(response, new_refresh)
    return TokenResponse(access_token=access_token, expires_in=expires_in)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    response: Response,
    refresh_token: str | None = Cookie(default=None, alias=REFRESH_COOKIE),
    db: AsyncSession = Depends(get_db),
) -> Response:
    if refresh_token:
        await auth_service.revoke_refresh_token(db, refresh_token)
    _clear_refresh_cookie(response)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.get("/me", response_model=MeResponse)
async def me(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MeResponse:
    _, memberships = await auth_service.get_me(db, user)
    return MeResponse(
        user=UserResponse.model_validate(user),
        tenants=[
            TenantResponse(
                id=membership.tenant.id,
                name=membership.tenant.name,
                slug=membership.tenant.slug,
                role=membership.role,
            )
            for membership in memberships
        ],
    )
