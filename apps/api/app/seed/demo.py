from __future__ import annotations

from datetime import UTC, datetime, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.quote import generate_public_token
from app.repositories import (
    appointments,
    customers,
    payments,
    quotes,
    service_requests,
    work_orders,
)

DEMO_SEED_VERSION = "2026-11-11-1"


def _tomorrow_at(hour: int, minute: int = 0) -> datetime:
    """Devuelve la fecha/hora UTC de mañana a la hora argentina indicada."""
    # America/Argentina/Buenos_Aires es UTC-3 en el horario de verano argentino.
    return (datetime.now(UTC) + timedelta(days=1)).replace(
        hour=hour + 3, minute=minute, second=0, microsecond=0
    )


async def seed_demo_data(
    db: AsyncSession,
    tenant_id: UUID,
    actor_user_id: UUID | None = None,
    appointment_technician_id: UUID | None = None,
) -> dict[str, int | str]:
    """Inserta datos de demostración idempotentes para `tenant_id`.

    El llamador debe haber limpiado previamente los datos demo del tenant o
    llamar a esta función dentro de un reset controlado.
    """

    # Clientes demo
    c1 = await customers.create_customer(
        db,
        tenant_id=tenant_id,
        name="Carlos Gomez",
        phone="+54 11 5555-1001",
        email="carlos@example.com",
        address=None,
        city=None,
        province=None,
        postal_code=None,
        notes="Cliente demo de aire acondicionado",
    )
    c2 = await customers.create_customer(
        db,
        tenant_id=tenant_id,
        name="Maria Lopez",
        phone="+54 11 5555-1002",
        email="maria@example.com",
        address=None,
        city=None,
        province=None,
        postal_code=None,
        notes="Cliente demo de instalación eléctrica",
    )
    c3 = await customers.create_customer(
        db,
        tenant_id=tenant_id,
        name="Taller Central",
        phone="+54 11 5555-1003",
        email="taller@example.com",
        address=None,
        city=None,
        province=None,
        postal_code=None,
        notes="Cliente demo de mantenimiento preventivo",
    )

    # Solicitudes de servicio
    r1 = await service_requests.create_service_request(
        db,
        tenant_id=tenant_id,
        customer_id=c1.id,
        title="Aire acondicionado no enfria",
        description="El equipo enciende pero no enfria",
        priority="high",
        source="whatsapp",
    )
    r1.status = "converted"
    await service_requests.create_service_request(
        db,
        tenant_id=tenant_id,
        customer_id=c2.id,
        title="Revision de instalacion electrica",
        description="Salta la termica al encender varios equipos",
        priority="urgent",
        source="phone",
    )

    # Ordenes de trabajo
    wo1_code = await work_orders.next_work_order_code(db, tenant_id=tenant_id)
    wo1 = await work_orders.create_work_order(
        db,
        tenant_id=tenant_id,
        customer_id=c1.id,
        service_request_id=r1.id,
        code=wo1_code,
        title="Reparacion aire acondicionado",
        description="Diagnostico y reparacion del equipo",
        priority="high",
        assigned_user_id=actor_user_id,
        scheduled_at=_tomorrow_at(10, 0),
    )

    wo2_code = await work_orders.next_work_order_code(db, tenant_id=tenant_id)
    await work_orders.create_work_order(
        db,
        tenant_id=tenant_id,
        customer_id=c3.id,
        service_request_id=None,
        code=wo2_code,
        title="Mantenimiento preventivo mensual",
        description="Revision general de equipos",
        priority="normal",
        assigned_user_id=None,
        scheduled_at=None,
    )

    # Presupuesto enviado para wo1
    quote_number = await quotes.next_quote_number(db, tenant_id=tenant_id)
    quote_items: list[quotes.QuoteItemData] = [
        {
            "description": "Diagnostico y reparacion",
            "quantity": Decimal("1"),
            "unit_price": Decimal("45000.00"),
            "discount_rate": Decimal("0.00"),
            "tax_rate": Decimal("21.00"),
            "line_total": Decimal("54450.00"),
            "sort_order": 0,
        },
        {
            "description": "Carga de gas refrigerante",
            "quantity": Decimal("1"),
            "unit_price": Decimal("28000.00"),
            "discount_rate": Decimal("5.00"),
            "tax_rate": Decimal("21.00"),
            "line_total": Decimal("32186.00"),
            "sort_order": 1,
        },
    ]
    subtotal = Decimal("73000.00")
    discount_total = Decimal("1400.00")
    tax_total = Decimal("15036.00")
    total = Decimal("86636.00")

    quote = await quotes.create_quote(
        db,
        tenant_id=tenant_id,
        customer_id=c1.id,
        work_order_id=wo1.id,
        number=quote_number,
        status="sent",
        currency="ARS",
        subtotal=subtotal,
        discount_total=discount_total,
        tax_total=tax_total,
        total=total,
        notes="Incluye mano de obra y materiales",
        valid_until=datetime.now(UTC) + timedelta(days=30),
        items_data=quote_items,
    )

    # Actualizar el estado del presupuesto a "sent" y generar token publico.
    # create_quote usa el status que le pasamos, pero no setea sent_at ni token.
    quote.public_token = generate_public_token()
    quote.sent_at = datetime.now(UTC)
    wo1.commercial_status = "sent"

    # Turno futuro para wo1 (garantiza que haya al menos uno en dashboards)
    if appointment_technician_id is not None:
        await appointments.create_appointment(
            db,
            tenant_id=tenant_id,
            work_order_id=wo1.id,
            technician_id=appointment_technician_id,
            starts_at=_tomorrow_at(10, 0),
            ends_at=_tomorrow_at(11, 0),
            notes="Visita de diagnostico",
        )

    # Pago parcial para wo1
    await payments.create_payment(
        db,
        tenant_id=tenant_id,
        work_order_id=wo1.id,
        quote_id=quote.id,
        amount=Decimal("20000.00"),
        currency="ARS",
        method="cash",
        paid_at=datetime.now(UTC),
        reference=None,
        notes="Sena del trabajo",
    )
    wo1.payment_status = "partial"

    await db.flush()

    return {
        "customers": 3,
        "service_requests": 2,
        "work_orders": 2,
        "quotes": 1,
        "appointments": 1 if appointment_technician_id is not None else 0,
        "payments": 1,
        "version": DEMO_SEED_VERSION,
    }
