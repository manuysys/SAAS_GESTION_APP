from uuid import UUID

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Customer, Membership, WorkOrder, WorkOrderAttachment
from app.repositories.technician_pwa import (
    create_work_order_attachment,
    create_work_order_material,
    get_technician_work_order,
    get_work_order_attachment,
    get_work_order_attachment_by_client_request_id,
    get_work_order_material_by_client_request_id,
    list_technician_work_orders,
    list_work_order_attachments,
    list_work_order_materials,
)
from app.repositories.work_orders import (
    create_work_order_event,
    get_work_order_event_by_client_request_id,
)
from app.schemas.technician_pwa import (
    AttachmentResponse,
    MaterialCreate,
    MaterialResponse,
    TechnicianTransitionRequest,
    TechnicianWorkOrderResponse,
)
from app.schemas.work_order import WorkOrderResponse, WorkOrderTransition
from app.services import work_order_service

_ALLOWED_MIME_TYPES = frozenset({"image/jpeg", "image/png", "image/webp"})
_MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024


def _to_technician_response(order: WorkOrder, customer: Customer) -> TechnicianWorkOrderResponse:
    base = WorkOrderResponse.model_validate(order).model_dump()
    return TechnicianWorkOrderResponse(
        **base,
        customer_name=customer.name,
        customer_phone=customer.phone,
        customer_address=customer.address,
        customer_city=customer.city,
        customer_province=customer.province,
        customer_postal_code=customer.postal_code,
    )


async def _get_assigned_order(
    db: AsyncSession, *, tenant_id: UUID, order_id: UUID, technician_id: UUID
) -> tuple[WorkOrder, Customer]:
    row = await get_technician_work_order(
        db, tenant_id=tenant_id, order_id=order_id, technician_id=technician_id
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work order not found")
    return row


async def list_technician_orders(
    db: AsyncSession,
    *,
    membership: Membership,
    operational_status: str | None = None,
    limit: int,
    offset: int,
) -> tuple[list[TechnicianWorkOrderResponse], int]:
    rows, total = await list_technician_work_orders(
        db,
        tenant_id=membership.tenant_id,
        technician_id=membership.user_id,
        operational_status=operational_status,
        limit=limit,
        offset=offset,
    )
    items = [_to_technician_response(order, customer) for order, customer in rows]
    return items, total


async def get_technician_order(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    order_id: UUID,
    technician_id: UUID,
) -> TechnicianWorkOrderResponse:
    order, customer = await _get_assigned_order(
        db, tenant_id=tenant_id, order_id=order_id, technician_id=technician_id
    )
    return _to_technician_response(order, customer)


async def transition_technician_order(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    order_id: UUID,
    payload: TechnicianTransitionRequest,
    technician_id: UUID,
) -> TechnicianWorkOrderResponse:
    await _get_assigned_order(
        db, tenant_id=tenant_id, order_id=order_id, technician_id=technician_id
    )
    transition_payload = WorkOrderTransition(to_status=payload.to_status, notes=payload.notes)
    await work_order_service.transition_tenant_work_order(
        db,
        tenant_id=tenant_id,
        order_id=order_id,
        payload=transition_payload,
        actor_user_id=technician_id,
        actor_role="technician",
    )
    # Re-fetch customer after transition commits/expires objects.
    row = await get_technician_work_order(
        db, tenant_id=tenant_id, order_id=order_id, technician_id=technician_id
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work order not found")
    return _to_technician_response(*row)


async def add_technician_note(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    order_id: UUID,
    notes: str,
    technician_id: UUID,
    client_request_id: str | None = None,
) -> None:
    order, _ = await _get_assigned_order(
        db, tenant_id=tenant_id, order_id=order_id, technician_id=technician_id
    )
    if client_request_id:
        existing = await get_work_order_event_by_client_request_id(
            db,
            tenant_id=tenant_id,
            work_order_id=order.id,
            client_request_id=client_request_id,
        )
        if existing is not None:
            return
    await create_work_order_event(
        db,
        tenant_id=tenant_id,
        work_order_id=order.id,
        event_type="note",
        from_status=None,
        to_status=None,
        actor_user_id=technician_id,
        payload={"notes": notes},
        client_request_id=client_request_id,
    )
    await db.commit()


async def list_technician_materials(
    db: AsyncSession, *, tenant_id: UUID, order_id: UUID, technician_id: UUID
) -> list[MaterialResponse]:
    await _get_assigned_order(
        db, tenant_id=tenant_id, order_id=order_id, technician_id=technician_id
    )
    materials = await list_work_order_materials(db, tenant_id=tenant_id, work_order_id=order_id)
    return [MaterialResponse.model_validate(m) for m in materials]


async def create_technician_material(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    order_id: UUID,
    payload: MaterialCreate,
    technician_id: UUID,
) -> MaterialResponse:
    await _get_assigned_order(
        db, tenant_id=tenant_id, order_id=order_id, technician_id=technician_id
    )
    if payload.client_request_id:
        existing = await get_work_order_material_by_client_request_id(
            db,
            tenant_id=tenant_id,
            work_order_id=order_id,
            client_request_id=payload.client_request_id,
        )
        if existing is not None:
            return MaterialResponse.model_validate(existing)

    material = await create_work_order_material(
        db,
        tenant_id=tenant_id,
        work_order_id=order_id,
        description=payload.description.strip(),
        quantity=payload.quantity,
        unit=payload.unit.strip(),
        created_by_user_id=technician_id,
        client_request_id=payload.client_request_id,
    )
    await db.commit()
    await db.refresh(material)
    return MaterialResponse.model_validate(material)


async def list_technician_attachments(
    db: AsyncSession, *, tenant_id: UUID, order_id: UUID, technician_id: UUID
) -> list[AttachmentResponse]:
    await _get_assigned_order(
        db, tenant_id=tenant_id, order_id=order_id, technician_id=technician_id
    )
    attachments = await list_work_order_attachments(db, tenant_id=tenant_id, work_order_id=order_id)
    return [AttachmentResponse.model_validate(a) for a in attachments]


async def create_technician_attachment(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    order_id: UUID,
    file: UploadFile,
    technician_id: UUID,
    client_request_id: str | None = None,
) -> AttachmentResponse:
    await _get_assigned_order(
        db, tenant_id=tenant_id, order_id=order_id, technician_id=technician_id
    )

    if client_request_id:
        existing = await get_work_order_attachment_by_client_request_id(
            db,
            tenant_id=tenant_id,
            work_order_id=order_id,
            client_request_id=client_request_id,
        )
        if existing is not None:
            return AttachmentResponse.model_validate(existing)

    mime_type = file.content_type or "application/octet-stream"
    if mime_type not in _ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Invalid file type: {mime_type}. Allowed: image/jpeg, image/png, image/webp",
        )

    data = await file.read()
    if len(data) > _MAX_ATTACHMENT_BYTES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="File exceeds maximum size of 5 MB",
        )

    filename = file.filename or "attachment"
    attachment = await create_work_order_attachment(
        db,
        tenant_id=tenant_id,
        work_order_id=order_id,
        filename=filename,
        mime_type=mime_type,
        size_bytes=len(data),
        data=data,
        uploaded_by_user_id=technician_id,
        client_request_id=client_request_id,
    )
    await db.commit()
    await db.refresh(attachment)
    return AttachmentResponse.model_validate(attachment)


async def get_technician_attachment(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    order_id: UUID,
    attachment_id: UUID,
    technician_id: UUID,
) -> WorkOrderAttachment:
    await _get_assigned_order(
        db, tenant_id=tenant_id, order_id=order_id, technician_id=technician_id
    )
    attachment = await get_work_order_attachment(
        db, tenant_id=tenant_id, work_order_id=order_id, attachment_id=attachment_id
    )
    if attachment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment not found")
    return attachment
