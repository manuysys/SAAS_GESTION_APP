"""Rate limiting en memoria para endpoints sensibles.

Es una primera barrera para desarrollo y despliegues de una sola instancia.
En producción con varias instancias hace falta un backend compartido
(por ejemplo Redis/Upstash) o el rate limiting del proveedor.
"""

from __future__ import annotations

import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request, status

from app.core.config import settings

_WINDOW_SECONDS = 60
_buckets: dict[str, deque[float]] = defaultdict(deque)


def reset_rate_limits() -> None:
    """Limpia el estado. Se usa en pruebas."""
    _buckets.clear()


def _client_key(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client is not None:
        return request.client.host
    return "unknown"


def check_rate_limit(request: Request, *, scope: str, limit: int) -> None:
    if not settings.rate_limit_enabled:
        return

    key = f"{scope}:{_client_key(request)}"
    now = time.monotonic()
    bucket = _buckets[key]
    while bucket and now - bucket[0] > _WINDOW_SECONDS:
        bucket.popleft()

    if len(bucket) >= limit:
        retry_after = max(1, int(_WINDOW_SECONDS - (now - bucket[0])))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demasiados intentos. Esperá un momento y volvé a probar.",
            headers={"Retry-After": str(retry_after)},
        )

    bucket.append(now)

    # Evita crecimiento indefinido si se atacan muchos orígenes distintos.
    if len(_buckets) > 10_000:
        for stale_key in [k for k, b in _buckets.items() if not b]:
            del _buckets[stale_key]
