from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_membership, require_roles
from app.core.db import get_db
from app.models import Membership
from app.schemas.automation import (
    NotificationListResponse,
    NotificationResponse,
)
from app.schemas.common import MessageResponse
from app.services import automation_service, push_service

router = APIRouter(prefix="/notifications", tags=["notifications"])

TECHNICIAN_ROLES = ("technician", "owner", "admin", "dispatcher")


class DeviceTokenCreate(BaseModel):
    token: str = Field(min_length=10, max_length=255)
    platform: str = Field(default="android", max_length=20)


@router.get("", response_model=NotificationListResponse)
async def list_notifications(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    membership: Membership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
) -> NotificationListResponse:
    items, total, unread = await automation_service.list_tenant_notifications(
        db,
        tenant_id=membership.tenant_id,
        user_id=membership.user_id,
        role=membership.role,
        limit=limit,
        offset=offset,
    )
    return NotificationListResponse(
        items=[NotificationResponse.model_validate(item) for item in items],
        total=total,
        unread=unread,
    )


@router.post("/{notification_id}/read", response_model=NotificationResponse)
async def mark_read(
    notification_id: UUID,
    membership: Membership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
) -> NotificationResponse:
    notification = await automation_service.mark_notification_read(
        db,
        tenant_id=membership.tenant_id,
        notification_id=notification_id,
        user_id=membership.user_id,
        role=membership.role,
    )
    return NotificationResponse.model_validate(notification)


@router.post("/read-all", response_model=MessageResponse)
async def mark_all_read(
    membership: Membership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    count = await automation_service.mark_all_notifications_read(
        db,
        tenant_id=membership.tenant_id,
        user_id=membership.user_id,
        role=membership.role,
    )
    return MessageResponse(message=f"{count} notifications marked as read")


@router.post("/devices", status_code=status.HTTP_204_NO_CONTENT)
async def register_device(
    payload: DeviceTokenCreate,
    membership: Membership = Depends(require_roles(*TECHNICIAN_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> None:
    await push_service.register_device_token(
        db,
        tenant_id=membership.tenant_id,
        user_id=membership.user_id,
        token=payload.token,
        platform=payload.platform,
    )


@router.delete("/devices/{token}", status_code=status.HTTP_204_NO_CONTENT)
async def unregister_device(
    token: str,
    membership: Membership = Depends(require_roles(*TECHNICIAN_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> None:
    await push_service.unregister_device_token(
        db,
        tenant_id=membership.tenant_id,
        user_id=membership.user_id,
        token=token,
    )
