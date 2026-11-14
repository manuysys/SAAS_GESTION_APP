from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

import app.core.logging
from app.api.routes import (
    admin,
    ai,
    appointments,
    auth,
    automations,
    billing,
    customers,
    dashboard,
    demo,
    health,
    imports,
    notifications,
    onboarding,
    payments,
    portal,
    public_invitations,
    public_quotes,
    quotes,
    service_requests,
    team,
    technician,
    technicians,
    tenants,
    whatsapp,
    whatsapp_webhook,
    work_orders,
)
from app.core.config import settings
from app.core.middleware import (
    rate_limit_middleware,
    request_id_middleware,
    security_headers_middleware,
)

_production_docs_hidden = settings.app_env.lower() == "production"

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    debug=settings.app_debug,
    docs_url=None if _production_docs_hidden else "/docs",
    redoc_url=None if _production_docs_hidden else "/redoc",
    openapi_url=None if _production_docs_hidden else "/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.api_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=settings.allowed_hosts,
)
app.middleware("http")(request_id_middleware)
app.middleware("http")(rate_limit_middleware)
app.middleware("http")(security_headers_middleware)

app.include_router(health.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(tenants.router, prefix="/api/v1")
app.include_router(customers.router, prefix="/api/v1")
app.include_router(imports.router, prefix="/api/v1")
app.include_router(service_requests.router, prefix="/api/v1")
app.include_router(work_orders.router, prefix="/api/v1")
app.include_router(quotes.router, prefix="/api/v1")
app.include_router(public_quotes.router, prefix="/api/v1")
app.include_router(public_invitations.router, prefix="/api/v1")
app.include_router(team.router, prefix="/api/v1")
app.include_router(appointments.router, prefix="/api/v1")
app.include_router(payments.router, prefix="/api/v1")
app.include_router(technicians.router, prefix="/api/v1")
app.include_router(technician.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(billing.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
app.include_router(demo.router, prefix="/api/v1")
app.include_router(automations.router, prefix="/api/v1")
app.include_router(notifications.router, prefix="/api/v1")
app.include_router(onboarding.router, prefix="/api/v1")
app.include_router(ai.router, prefix="/api/v1")
app.include_router(whatsapp.router, prefix="/api/v1")
app.include_router(whatsapp_webhook.router, prefix="/api/v1")
app.include_router(portal.router, prefix="/api/v1")


@app.get("/")
async def root() -> dict[str, str]:
    return {"name": settings.app_name, "health": "/api/v1/health/live"}
