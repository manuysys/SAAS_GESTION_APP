from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_roles
from app.core.db import get_db
from app.models import Membership
from app.schemas.whatsapp import (
    WhatsAppConfigResponse,
    WhatsAppConfigUpdate,
    WhatsAppMessageListResponse,
    WhatsAppSendRequest,
    WhatsAppSendResponse,
)
from app.services import whatsapp_service

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])

ADMIN_ROLES = ("owner", "admin")
READ_ROLES = ("owner", "admin", "dispatcher", "technician", "viewer")


@router.get("/config", response_model=WhatsAppConfigResponse)
async def get_config(
    membership: Membership = Depends(require_roles(*READ_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> WhatsAppConfigResponse:
    return await whatsapp_service.get_config(db, tenant_id=membership.tenant_id)


@router.put("/config", response_model=WhatsAppConfigResponse)
async def update_config(
    payload: WhatsAppConfigUpdate,
    membership: Membership = Depends(require_roles(*ADMIN_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> WhatsAppConfigResponse:
    return await whatsapp_service.update_config(db, tenant_id=membership.tenant_id, payload=payload)


@router.get("/messages", response_model=WhatsAppMessageListResponse)
async def list_messages(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    membership: Membership = Depends(require_roles(*READ_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> WhatsAppMessageListResponse:
    return await whatsapp_service.list_messages(
        db, tenant_id=membership.tenant_id, limit=limit, offset=offset
    )


@router.post("/send", response_model=WhatsAppSendResponse, status_code=status.HTTP_201_CREATED)
async def send_message(
    payload: WhatsAppSendRequest,
    membership: Membership = Depends(require_roles(*ADMIN_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> WhatsAppSendResponse:
    return await whatsapp_service.send_text(db, tenant_id=membership.tenant_id, payload=payload)
