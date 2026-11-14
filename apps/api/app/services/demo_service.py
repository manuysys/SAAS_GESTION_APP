from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException, Request, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_client_ip
from app.core.security import hash_password
from app.models import (
    Appointment,
    Customer,
    EmailDelivery,
    ImportJob,
    Membership,
    Notification,
    Payment,
    Quote,
    QuoteEvent,
    QuoteItem,
    ServiceRequest,
    Tenant,
    User,
    WhatsAppMessage,
    WorkOrder,
    WorkOrderAttachment,
    WorkOrderEvent,
    WorkOrderMaterial,
)
from app.seed.demo import seed_demo_data
from app.services import audit_service

DEMO_TENANT_SLUG = "servicios-demo"


async def _get_demo_tenant_for_update(db: AsyncSession) -> Tenant:
    tenant = await db.scalar(
        select(Tenant).where(Tenant.slug == DEMO_TENANT_SLUG).with_for_update()
    )
    if tenant is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Demo tenant not found",
        )
    return tenant


async def _effective_demo_actor(
    db: AsyncSession,
    tenant_id: UUID,
    actor_user_id: UUID,
) -> UUID | None:
    membership = await db.scalar(
        select(Membership).where(
            Membership.tenant_id == tenant_id,
            Membership.user_id == actor_user_id,
            Membership.role == "technician",
            Membership.status == "active",
        )
    )
    return actor_user_id if membership is not None else None


async def _ensure_demo_appointment_technician(
    db: AsyncSession,
    tenant_id: UUID,
    effective_actor: UUID | None,
) -> UUID:
    """Devuelve un técnico demo para el turno; crea uno si no existe."""
    if effective_actor is not None:
        return effective_actor
    existing_user_id = await db.scalar(
        select(Membership.user_id).where(
            Membership.tenant_id == tenant_id,
            Membership.role == "technician",
            Membership.status == "active",
        )
    )
    if existing_user_id is not None:
        return existing_user_id
    user = User(
        email="demo-technician@example.com",
        password_hash=hash_password("unused-demo-password"),
        full_name="Tecnico Demo",
    )
    db.add(user)
    await db.flush()
    membership = Membership(
        tenant_id=tenant_id,
        user_id=user.id,
        role="technician",
        status="active",
    )
    db.add(membership)
    await db.flush()
    return user.id


async def _clear_demo_data(db: AsyncSession, tenant_id: UUID) -> None:
    """Elimina los datos de negocio del tenant demo preservando audit_logs."""
    await db.execute(delete(ImportJob).where(ImportJob.tenant_id == tenant_id))
    await db.execute(delete(Notification).where(Notification.tenant_id == tenant_id))
    await db.execute(delete(WhatsAppMessage).where(WhatsAppMessage.tenant_id == tenant_id))
    await db.execute(delete(EmailDelivery).where(EmailDelivery.tenant_id == tenant_id))
    await db.execute(delete(Payment).where(Payment.tenant_id == tenant_id))
    await db.execute(delete(Appointment).where(Appointment.tenant_id == tenant_id))
    await db.execute(delete(QuoteItem).where(QuoteItem.tenant_id == tenant_id))
    await db.execute(delete(QuoteEvent).where(QuoteEvent.tenant_id == tenant_id))
    await db.execute(delete(Quote).where(Quote.tenant_id == tenant_id))
    await db.execute(delete(WorkOrderAttachment).where(WorkOrderAttachment.tenant_id == tenant_id))
    await db.execute(delete(WorkOrderMaterial).where(WorkOrderMaterial.tenant_id == tenant_id))
    await db.execute(delete(WorkOrderEvent).where(WorkOrderEvent.tenant_id == tenant_id))
    await db.execute(delete(WorkOrder).where(WorkOrder.tenant_id == tenant_id))
    await db.execute(delete(ServiceRequest).where(ServiceRequest.tenant_id == tenant_id))
    await db.execute(delete(Customer).where(Customer.tenant_id == tenant_id))


async def reset_demo(
    db: AsyncSession,
    *,
    actor_user_id: UUID,
    request: Request | None = None,
) -> dict[str, object]:
    """Resetea el tenant demo.

    El lock FOR UPDATE en tenants serializa los resets del demo, pero otros
    endpoints que modifiquen el mismo tenant sin tomar el lock pueden generar
    condiciones de carrera. Se acepta para el MVP.
    """
    tenant = await _get_demo_tenant_for_update(db)
    effective_actor = await _effective_demo_actor(db, tenant.id, actor_user_id)
    appointment_technician_id = await _ensure_demo_appointment_technician(
        db, tenant.id, effective_actor
    )
    await _clear_demo_data(db, tenant.id)
    tenant.onboarding_state = None
    counts = await seed_demo_data(
        db,
        tenant_id=tenant.id,
        actor_user_id=effective_actor,
        appointment_technician_id=appointment_technician_id,
    )

    ip = get_client_ip(request) if request is not None else None
    user_agent = request.headers.get("user-agent") if request is not None else None
    await audit_service.record(
        db,
        action="demo_reset",
        entity_type="tenant",
        entity_id=str(tenant.id),
        tenant_id=tenant.id,
        actor_user_id=actor_user_id,
        metadata={"counts": counts, "slug": DEMO_TENANT_SLUG},
        ip=ip,
        user_agent=user_agent,
    )

    return {
        "tenant_id": str(tenant.id),
        "counts": counts,
    }
