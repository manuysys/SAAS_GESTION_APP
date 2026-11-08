import io
from uuid import UUID

from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_roles
from app.core.db import get_db
from app.models import Membership
from app.schemas.common import MessageResponse
from app.schemas.technician_pwa import (
    AttachmentResponse,
    MaterialCreate,
    MaterialResponse,
    TechnicianNoteRequest,
    TechnicianTransitionRequest,
    TechnicianWorkOrderListResponse,
    TechnicianWorkOrderResponse,
)
from app.services import technician_pwa_service

router = APIRouter(prefix="/technician", tags=["technician"])
TECHNICIAN_ROLE = ("technician",)


@router.get("/work-orders", response_model=TechnicianWorkOrderListResponse)
async def list_technician_work_orders(
    operational_status: str | None = Query(default=None, alias="status"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    membership: Membership = Depends(require_roles(*TECHNICIAN_ROLE)),
    db: AsyncSession = Depends(get_db),
) -> TechnicianWorkOrderListResponse:
    items, total = await technician_pwa_service.list_technician_orders(
        db,
        membership=membership,
        operational_status=operational_status,
        limit=limit,
        offset=offset,
    )
    return TechnicianWorkOrderListResponse(
        items=items,
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/work-orders/{order_id}", response_model=TechnicianWorkOrderResponse)
async def get_technician_work_order(
    order_id: UUID,
    membership: Membership = Depends(require_roles(*TECHNICIAN_ROLE)),
    db: AsyncSession = Depends(get_db),
) -> TechnicianWorkOrderResponse:
    return await technician_pwa_service.get_technician_order(
        db,
        tenant_id=membership.tenant_id,
        order_id=order_id,
        technician_id=membership.user_id,
    )


@router.post("/work-orders/{order_id}/transition", response_model=TechnicianWorkOrderResponse)
async def transition_technician_work_order(
    order_id: UUID,
    payload: TechnicianTransitionRequest,
    membership: Membership = Depends(require_roles(*TECHNICIAN_ROLE)),
    db: AsyncSession = Depends(get_db),
) -> TechnicianWorkOrderResponse:
    return await technician_pwa_service.transition_technician_order(
        db,
        tenant_id=membership.tenant_id,
        order_id=order_id,
        payload=payload,
        technician_id=membership.user_id,
    )


@router.post("/work-orders/{order_id}/notes", response_model=MessageResponse)
async def add_technician_note(
    order_id: UUID,
    payload: TechnicianNoteRequest,
    membership: Membership = Depends(require_roles(*TECHNICIAN_ROLE)),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    await technician_pwa_service.add_technician_note(
        db,
        tenant_id=membership.tenant_id,
        order_id=order_id,
        notes=payload.notes,
        technician_id=membership.user_id,
    )
    return MessageResponse(message="Note added")


@router.get("/work-orders/{order_id}/materials", response_model=list[MaterialResponse])
async def list_technician_materials(
    order_id: UUID,
    membership: Membership = Depends(require_roles(*TECHNICIAN_ROLE)),
    db: AsyncSession = Depends(get_db),
) -> list[MaterialResponse]:
    return await technician_pwa_service.list_technician_materials(
        db,
        tenant_id=membership.tenant_id,
        order_id=order_id,
        technician_id=membership.user_id,
    )


@router.post(
    "/work-orders/{order_id}/materials",
    response_model=MaterialResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_technician_material(
    order_id: UUID,
    payload: MaterialCreate,
    membership: Membership = Depends(require_roles(*TECHNICIAN_ROLE)),
    db: AsyncSession = Depends(get_db),
) -> MaterialResponse:
    return await technician_pwa_service.create_technician_material(
        db,
        tenant_id=membership.tenant_id,
        order_id=order_id,
        payload=payload,
        technician_id=membership.user_id,
    )


@router.get("/work-orders/{order_id}/attachments", response_model=list[AttachmentResponse])
async def list_technician_attachments(
    order_id: UUID,
    membership: Membership = Depends(require_roles(*TECHNICIAN_ROLE)),
    db: AsyncSession = Depends(get_db),
) -> list[AttachmentResponse]:
    return await technician_pwa_service.list_technician_attachments(
        db,
        tenant_id=membership.tenant_id,
        order_id=order_id,
        technician_id=membership.user_id,
    )


@router.post(
    "/work-orders/{order_id}/attachments",
    response_model=AttachmentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_technician_attachment(
    order_id: UUID,
    file: UploadFile = File(...),
    membership: Membership = Depends(require_roles(*TECHNICIAN_ROLE)),
    db: AsyncSession = Depends(get_db),
) -> AttachmentResponse:
    return await technician_pwa_service.create_technician_attachment(
        db,
        tenant_id=membership.tenant_id,
        order_id=order_id,
        file=file,
        technician_id=membership.user_id,
    )


@router.get("/work-orders/{order_id}/attachments/{attachment_id}")
async def download_technician_attachment(
    order_id: UUID,
    attachment_id: UUID,
    membership: Membership = Depends(require_roles(*TECHNICIAN_ROLE)),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    attachment = await technician_pwa_service.get_technician_attachment(
        db,
        tenant_id=membership.tenant_id,
        order_id=order_id,
        attachment_id=attachment_id,
        technician_id=membership.user_id,
    )
    return StreamingResponse(
        io.BytesIO(attachment.data),
        media_type=attachment.mime_type,
        headers={"Content-Disposition": f'inline; filename="{attachment.filename}"'},
    )
