"""Middlewares de seguridad, rate limiting y trazabilidad."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from uuid import uuid4

from fastapi import HTTPException, Request, Response
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.db import SessionLocal
from app.core.logging import clear_request_id, get_logger, set_request_id
from app.services import security_service

logger = get_logger(__name__)

_AUTH_PATHS = frozenset(
    {
        "/api/v1/auth/login",
        "/api/v1/auth/register",
        "/api/v1/auth/refresh",
        "/api/v1/auth/mobile/login",
        "/api/v1/auth/mobile/refresh",
        "/api/v1/auth/mobile/logout",
    }
)
_PUBLIC_QUOTE_PREFIX = "/api/v1/public/quotes/"
_REQUEST_ID_HEADER = "X-Request-ID"


async def request_id_middleware(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    request_id = request.headers.get(_REQUEST_ID_HEADER) or str(uuid4())
    request.state.request_id = request_id
    set_request_id(request_id)
    try:
        response = await call_next(request)
        response.headers[_REQUEST_ID_HEADER] = request_id
        return response
    finally:
        clear_request_id()


async def security_headers_middleware(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
    if settings.cookie_secure:
        response.headers.setdefault(
            "Strict-Transport-Security", "max-age=31536000; includeSubDomains"
        )
    return response


async def rate_limit_middleware(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    path = request.url.path
    if request.method == "OPTIONS":
        return await call_next(request)

    limit: int | None = None
    scope: str | None = None
    if path in _AUTH_PATHS and request.method == "POST":
        scope = "auth"
        limit = settings.rate_limit_auth_per_minute
    elif path.startswith(_PUBLIC_QUOTE_PREFIX) and request.method == "GET":
        scope = "public-quote"
        limit = settings.rate_limit_public_per_minute

    if scope is not None and limit is not None:
        async with SessionLocal() as db:
            try:
                await security_service.check_rate_limit(
                    db,
                    request,
                    scope=scope,
                    limit=limit,
                )
            except HTTPException as exc:
                return JSONResponse(
                    status_code=exc.status_code,
                    content={"detail": exc.detail},
                    headers=exc.headers,
                )

    return await call_next(request)
