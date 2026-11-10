from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Customer, WorkOrder, WorkOrderAttachment, WorkOrderMaterial


async def list_technician_work_orders(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    technician_id: UUID,
    operational_status: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[tuple[WorkOrder, Customer]], int]:
    filters = [
        WorkOrder.tenant_id == tenant_id,
        WorkOrder.assigned_user_id == technician_id,
    ]
    if operational_status is not None:
        filters.append(WorkOrder.operational_status == operational_status)
    total = await db.scalar(select(func.count()).select_from(WorkOrder).where(*filters))
    result = await db.execute(
        select(WorkOrder, Customer)
        .join(Customer, WorkOrder.customer_id == Customer.id)
        .where(*filters)
        .order_by(WorkOrder.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    rows = [(order, customer) for order, customer in result.all()]
    return rows, int(total or 0)


async def get_technician_work_order(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    order_id: UUID,
    technician_id: UUID,
) -> tuple[WorkOrder, Customer] | None:
    result = await db.execute(
        select(WorkOrder, Customer)
        .join(Customer, WorkOrder.customer_id == Customer.id)
        .where(
            WorkOrder.tenant_id == tenant_id,
            WorkOrder.id == order_id,
            WorkOrder.assigned_user_id == technician_id,
        )
    )
    return result.one_or_none()


async def list_work_order_materials(
    db: AsyncSession, *, tenant_id: UUID, work_order_id: UUID
) -> list[WorkOrderMaterial]:
    result = await db.execute(
        select(WorkOrderMaterial)
        .where(
            WorkOrderMaterial.tenant_id == tenant_id,
            WorkOrderMaterial.work_order_id == work_order_id,
        )
        .order_by(WorkOrderMaterial.created_at.desc())
    )
    return list(result.scalars().all())


async def get_work_order_material_by_client_request_id(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    work_order_id: UUID,
    client_request_id: str,
) -> WorkOrderMaterial | None:
    result = await db.execute(
        select(WorkOrderMaterial).where(
            WorkOrderMaterial.tenant_id == tenant_id,
            WorkOrderMaterial.work_order_id == work_order_id,
            WorkOrderMaterial.client_request_id == client_request_id,
        )
    )
    return result.scalar_one_or_none()


async def create_work_order_material(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    work_order_id: UUID,
    description: str,
    quantity: Decimal,
    unit: str,
    created_by_user_id: UUID,
    client_request_id: str | None,
) -> WorkOrderMaterial:
    material = WorkOrderMaterial(
        tenant_id=tenant_id,
        work_order_id=work_order_id,
        description=description,
        quantity=quantity,
        unit=unit,
        client_request_id=client_request_id,
        created_by_user_id=created_by_user_id,
    )
    db.add(material)
    await db.flush()
    return material


async def list_work_order_attachments(
    db: AsyncSession, *, tenant_id: UUID, work_order_id: UUID
) -> list[WorkOrderAttachment]:
    result = await db.execute(
        select(WorkOrderAttachment)
        .where(
            WorkOrderAttachment.tenant_id == tenant_id,
            WorkOrderAttachment.work_order_id == work_order_id,
        )
        .order_by(WorkOrderAttachment.created_at.desc())
    )
    return list(result.scalars().all())


async def get_work_order_attachment_by_client_request_id(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    work_order_id: UUID,
    client_request_id: str,
) -> WorkOrderAttachment | None:
    result = await db.execute(
        select(WorkOrderAttachment).where(
            WorkOrderAttachment.tenant_id == tenant_id,
            WorkOrderAttachment.work_order_id == work_order_id,
            WorkOrderAttachment.client_request_id == client_request_id,
        )
    )
    return result.scalar_one_or_none()


async def create_work_order_attachment(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    work_order_id: UUID,
    filename: str,
    mime_type: str,
    size_bytes: int,
    data: bytes,
    uploaded_by_user_id: UUID,
    client_request_id: str | None,
) -> WorkOrderAttachment:
    attachment = WorkOrderAttachment(
        tenant_id=tenant_id,
        work_order_id=work_order_id,
        filename=filename,
        mime_type=mime_type,
        size_bytes=size_bytes,
        data=data,
        client_request_id=client_request_id,
        uploaded_by_user_id=uploaded_by_user_id,
    )
    db.add(attachment)
    await db.flush()
    return attachment


async def get_work_order_attachment(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    work_order_id: UUID,
    attachment_id: UUID,
) -> WorkOrderAttachment | None:
    result = await db.execute(
        select(WorkOrderAttachment).where(
            WorkOrderAttachment.tenant_id == tenant_id,
            WorkOrderAttachment.work_order_id == work_order_id,
            WorkOrderAttachment.id == attachment_id,
        )
    )
    return result.scalar_one_or_none()
