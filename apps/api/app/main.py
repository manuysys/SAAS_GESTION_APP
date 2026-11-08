from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import (
    appointments,
    auth,
    customers,
    dashboard,
    health,
    payments,
    public_quotes,
    quotes,
    service_requests,
    technician,
    technicians,
    tenants,
    work_orders,
)
from app.core.config import settings

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    debug=settings.app_debug,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.api_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(tenants.router, prefix="/api/v1")
app.include_router(customers.router, prefix="/api/v1")
app.include_router(service_requests.router, prefix="/api/v1")
app.include_router(work_orders.router, prefix="/api/v1")
app.include_router(quotes.router, prefix="/api/v1")
app.include_router(public_quotes.router, prefix="/api/v1")
app.include_router(appointments.router, prefix="/api/v1")
app.include_router(payments.router, prefix="/api/v1")
app.include_router(technicians.router, prefix="/api/v1")
app.include_router(technician.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")


@app.get("/")
async def root() -> dict[str, str]:
    return {"name": settings.app_name, "docs": "/docs", "health": "/api/v1/health/live"}
