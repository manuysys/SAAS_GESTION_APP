from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_client_ip, get_current_user, validate_cookie_origin
from app.core.config import settings
from app.core.db import get_db
from app.models import User
from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    MeResponse,
    MobileAuthResponse,
    MobileLoginRequest,
    RefreshTokenRequest,
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
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> AuthResponse:
    _user, tenant, access_token, expires_in, refresh_token = await auth_service.register(
        db,
        payload,
        client_ip=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
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
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> AuthResponse:
    user, access_token, expires_in, refresh_token = await auth_service.login(
        db,
        str(payload.email),
        payload.password,
        client_ip=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
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
    request: Request,
    refresh_token: str | None = Cookie(default=None, alias=REFRESH_COOKIE),
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    validate_cookie_origin(request)
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing refresh token",
        )
    _, access_token, expires_in, new_refresh = await auth_service.rotate_refresh_token(
        db,
        refresh_token,
        client_ip=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    _set_refresh_cookie(response, new_refresh)
    return TokenResponse(access_token=access_token, expires_in=expires_in)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    response: Response,
    request: Request,
    refresh_token: str | None = Cookie(default=None, alias=REFRESH_COOKIE),
    db: AsyncSession = Depends(get_db),
) -> Response:
    validate_cookie_origin(request)
    if refresh_token:
        await auth_service.revoke_refresh_token(
            db,
            refresh_token,
            client_ip=get_client_ip(request),
            user_agent=request.headers.get("user-agent"),
        )
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


@router.post("/mobile/login", response_model=MobileAuthResponse)
async def mobile_login(
    payload: MobileLoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> MobileAuthResponse:
    user, access_token, expires_in, refresh_token = await auth_service.login(
        db,
        str(payload.email),
        payload.password,
        client_ip=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    _, memberships = await auth_service.get_me(db, user)
    return MobileAuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
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


@router.post("/mobile/refresh", response_model=MobileAuthResponse)
async def mobile_refresh(
    payload: RefreshTokenRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> MobileAuthResponse:
    user, access_token, expires_in, new_refresh = await auth_service.rotate_refresh_token(
        db,
        payload.refresh_token,
        client_ip=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    _, memberships = await auth_service.get_me(db, user)
    return MobileAuthResponse(
        access_token=access_token,
        refresh_token=new_refresh,
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


@router.post("/mobile/logout", status_code=status.HTTP_204_NO_CONTENT)
async def mobile_logout(
    payload: RefreshTokenRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> None:
    await auth_service.revoke_refresh_token(
        db,
        payload.refresh_token,
        client_ip=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
