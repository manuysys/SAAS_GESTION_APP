"""Middlewares de seguridad y rate limiting."""

from __future__ import annotations

from collections.abc import Awaitable, Callable

from fastapi import HTTPException, Request, Response
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.rate_limit import check_rate_limit

_AUTH_PATHS = frozenset(
    {
        "/api/v1/auth/login",
        "/api/v1/auth/register",
        "/api/v1/auth/refresh",
    }
)
_PUBLIC_PREFIX = "/api/v1/public/quotes/"


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

    try:
        if path in _AUTH_PATHS and request.method == "POST":
            check_rate_limit(
                request,
                scope="auth",
                limit=settings.rate_limit_auth_per_minute,
            )
        elif path.startswith(_PUBLIC_PREFIX) and request.method == "GET":
            check_rate_limit(
                request,
                scope="public-quote",
                limit=settings.rate_limit_public_per_minute,
            )
    except HTTPException as exc:
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
            headers=exc.headers,
        )

    return await call_next(request)
