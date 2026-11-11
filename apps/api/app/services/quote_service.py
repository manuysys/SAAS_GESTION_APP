from datetime import UTC, datetime
from decimal import ROUND_HALF_UP, Decimal
from io import BytesIO
from typing import cast
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Customer, Quote, Tenant, WorkOrder
from app.repositories.customers import get_customer
from app.repositories.quotes import (
    QuoteItemData,
    create_event,
    create_quote,
    get_by_public_token,
    get_quote,
    list_events,
    list_quotes,
    next_quote_number,
    replace_items,
)
from app.repositories.work_orders import get_work_order
from app.schemas.quote import (
    PublicQuoteDecision,
    PublicQuoteItem,
    PublicQuoteResponse,
    QuoteCreate,
    QuoteStatus,
    QuoteUpdate,
)
from app.services import automation_service

_CENT = Decimal("0.01")
MAX_AMOUNT = Decimal("999999999999.99")


def _quote_event_payload(quote: Quote) -> dict[str, object]:
    return {
        "quote_id": str(quote.id),
        "number": quote.number,
        "work_order_id": str(quote.work_order_id) if quote.work_order_id else None,
        "customer_id": str(quote.customer_id),
        "total": str(quote.total),
    }


def _quantize(value: Decimal) -> Decimal:
    return value.quantize(_CENT, rounding=ROUND_HALF_UP)


def _ensure_amount(value: Decimal, field: str) -> Decimal:
    if value > MAX_AMOUNT:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"{field} exceeds the maximum allowed amount",
        )
    return value


async def _ensure_not_expired(db: AsyncSession, quote: Quote) -> None:
    if quote.valid_until is None:
        return
    valid_until = quote.valid_until
    if valid_until.tzinfo is None:
        valid_until = valid_until.replace(tzinfo=UTC)
    today_ar = datetime.now(ZoneInfo("America/Argentina/Buenos_Aires")).date()
    if valid_until.date() < today_ar:
        quote.status = "expired"
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Quote expired",
        )


def _set_order_commercial_status(order: WorkOrder | None, target: str) -> None:
    if order is None:
        return
    if order.commercial_status == "approved" and target != "approved":
        return
    order.commercial_status = target


def _build_items_data(
    items: list,
) -> tuple[list[QuoteItemData], Decimal, Decimal, Decimal, Decimal]:
    items_data: list[QuoteItemData] = []
    subtotal = Decimal("0.00")
    discount_total = Decimal("0.00")
    tax_total = Decimal("0.00")

    for index, item in enumerate(items):
        quantity = item.quantity.quantize(Decimal("0.001"), rounding=ROUND_HALF_UP)
        unit_price = _quantize(item.unit_price)
        discount_rate = _quantize(item.discount_rate)
        tax_rate = _quantize(item.tax_rate)

        gross = _ensure_amount(_quantize(quantity * unit_price), "Line gross amount")
        discount = _ensure_amount(
            _quantize(gross * discount_rate / Decimal("100")), "Line discount"
        )
        taxable = _ensure_amount(_quantize(gross - discount), "Line taxable amount")
        tax = _ensure_amount(_quantize(taxable * tax_rate / Decimal("100")), "Line tax")
        line_total = _ensure_amount(_quantize(taxable + tax), "Line total")

        subtotal += gross
        discount_total += discount
        tax_total += tax

        items_data.append(
            {
                "description": item.description,
                "quantity": quantity,
                "unit_price": unit_price,
                "discount_rate": discount_rate,
                "tax_rate": tax_rate,
                "line_total": line_total,
                "sort_order": index,
            }
        )

    total = _ensure_amount(_quantize(subtotal - discount_total + tax_total), "Quote total")
    return (
        items_data,
        _ensure_amount(_quantize(subtotal), "Quote subtotal"),
        _ensure_amount(_quantize(discount_total), "Quote discount total"),
        _ensure_amount(_quantize(tax_total), "Quote tax total"),
        total,
    )


async def _validate_work_order(
    db: AsyncSession,
    tenant_id: UUID,
    work_order_id: UUID | None,
    customer_id: UUID,
) -> None:
    if work_order_id is None:
        return
    order = await get_work_order(db, tenant_id=tenant_id, order_id=work_order_id)
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work order not found")
    if order.customer_id != customer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Work order does not belong to the selected customer",
        )


async def list_tenant_quotes(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    status_filter: str | None,
    customer_id: UUID | None,
    limit: int,
    offset: int,
) -> tuple[list[Quote], int]:
    return await list_quotes(
        db,
        tenant_id=tenant_id,
        status=status_filter,
        customer_id=customer_id,
        limit=limit,
        offset=offset,
    )


async def get_tenant_quote(
    db: AsyncSession, *, tenant_id: UUID, quote_id: UUID, lock: bool = False
) -> Quote:
    quote = await get_quote(db, tenant_id=tenant_id, quote_id=quote_id, lock=lock)
    if quote is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quote not found")
    return quote


async def create_tenant_quote(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    payload: QuoteCreate,
    actor_user_id: UUID,
) -> Quote:
    customer = await get_customer(db, tenant_id=tenant_id, customer_id=payload.customer_id)
    if customer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    await _validate_work_order(db, tenant_id, payload.work_order_id, payload.customer_id)

    items_data, subtotal, discount_total, tax_total, total = _build_items_data(payload.items)
    number = await next_quote_number(db, tenant_id=tenant_id)

    quote = await create_quote(
        db,
        tenant_id=tenant_id,
        customer_id=payload.customer_id,
        work_order_id=payload.work_order_id,
        number=number,
        status="draft",
        currency="ARS",
        subtotal=subtotal,
        discount_total=discount_total,
        tax_total=tax_total,
        total=total,
        notes=payload.notes,
        valid_until=payload.valid_until,
        items_data=items_data,
    )
    await create_event(
        db,
        tenant_id=tenant_id,
        quote_id=quote.id,
        event_type="created",
        actor_user_id=actor_user_id,
        payload={"number": number},
    )
    await db.commit()
    return cast(Quote, await get_quote(db, tenant_id=tenant_id, quote_id=quote.id))


async def update_tenant_quote(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    quote_id: UUID,
    payload: QuoteUpdate,
    actor_user_id: UUID,
) -> Quote:
    quote = await get_tenant_quote(db, tenant_id=tenant_id, quote_id=quote_id)
    if quote.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only draft quotes can be edited",
        )

    data = payload.model_dump(exclude_unset=True)
    next_customer_id = data.get("customer_id", quote.customer_id)
    next_work_order_id = data.get("work_order_id", quote.work_order_id)

    if "customer_id" in data:
        customer = await get_customer(db, tenant_id=tenant_id, customer_id=next_customer_id)
        if customer is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
        quote.customer_id = next_customer_id

    if "customer_id" in data or "work_order_id" in data:
        await _validate_work_order(db, tenant_id, next_work_order_id, next_customer_id)
        quote.work_order_id = next_work_order_id

    if "notes" in data:
        quote.notes = data["notes"]
    if "valid_until" in data:
        quote.valid_until = data["valid_until"]

    items = payload.items
    if items is not None:
        items_data, subtotal, discount_total, tax_total, total = _build_items_data(items)
        await replace_items(db, tenant_id=tenant_id, quote_id=quote.id, items_data=items_data)
        quote.subtotal = subtotal
        quote.discount_total = discount_total
        quote.tax_total = tax_total
        quote.total = total

    await create_event(
        db,
        tenant_id=tenant_id,
        quote_id=quote.id,
        event_type="updated",
        actor_user_id=actor_user_id,
    )
    await db.commit()
    return cast(Quote, await get_quote(db, tenant_id=tenant_id, quote_id=quote.id))


async def _transition_quote(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    quote_id: UUID,
    from_status: str,
    to_status: str,
    actor_user_id: UUID | None,
    timestamp_field: str,
    work_order_commercial_status: str,
) -> Quote:
    quote = await get_tenant_quote(db, tenant_id=tenant_id, quote_id=quote_id, lock=True)
    if to_status in ("approved", "rejected"):
        await _ensure_not_expired(db, quote)
    if quote.status != from_status:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Quote must be {from_status} to {to_status}",
        )

    quote.status = to_status
    setattr(quote, timestamp_field, datetime.now(UTC))

    if quote.work_order_id:
        order = await get_work_order(db, tenant_id=tenant_id, order_id=quote.work_order_id)
        _set_order_commercial_status(order, work_order_commercial_status)

    await create_event(
        db,
        tenant_id=tenant_id,
        quote_id=quote.id,
        event_type=to_status,
        actor_user_id=actor_user_id,
    )
    event_map = {
        "sent": "quote_sent",
        "approved": "quote_approved",
        "rejected": "quote_rejected",
    }
    await automation_service.emit_event(
        db,
        tenant_id=tenant_id,
        event_type=event_map[to_status],
        payload=_quote_event_payload(quote),
    )
    await db.commit()
    return cast(Quote, await get_quote(db, tenant_id=tenant_id, quote_id=quote.id))


async def send_quote(
    db: AsyncSession, *, tenant_id: UUID, quote_id: UUID, actor_user_id: UUID
) -> Quote:
    return await _transition_quote(
        db,
        tenant_id=tenant_id,
        quote_id=quote_id,
        from_status="draft",
        to_status="sent",
        actor_user_id=actor_user_id,
        timestamp_field="sent_at",
        work_order_commercial_status="sent",
    )


async def approve_quote(
    db: AsyncSession, *, tenant_id: UUID, quote_id: UUID, actor_user_id: UUID
) -> Quote:
    return await _transition_quote(
        db,
        tenant_id=tenant_id,
        quote_id=quote_id,
        from_status="sent",
        to_status="approved",
        actor_user_id=actor_user_id,
        timestamp_field="approved_at",
        work_order_commercial_status="approved",
    )


async def reject_quote(
    db: AsyncSession, *, tenant_id: UUID, quote_id: UUID, actor_user_id: UUID
) -> Quote:
    return await _transition_quote(
        db,
        tenant_id=tenant_id,
        quote_id=quote_id,
        from_status="sent",
        to_status="rejected",
        actor_user_id=actor_user_id,
        timestamp_field="rejected_at",
        work_order_commercial_status="rejected",
    )


async def list_tenant_quote_events(db: AsyncSession, *, tenant_id: UUID, quote_id: UUID) -> list:
    await get_tenant_quote(db, tenant_id=tenant_id, quote_id=quote_id)
    return await list_events(db, tenant_id=tenant_id, quote_id=quote_id)


async def revoke_public_link(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    quote_id: UUID,
    actor_user_id: UUID,
) -> Quote:
    quote = await get_tenant_quote(db, tenant_id=tenant_id, quote_id=quote_id, lock=True)
    quote.public_token_revoked_at = datetime.now(UTC)
    await create_event(
        db,
        tenant_id=tenant_id,
        quote_id=quote.id,
        event_type="public_link_revoked",
        actor_user_id=actor_user_id,
        payload=None,
    )
    await db.commit()
    await db.refresh(quote)
    return quote


async def public_get_quote(db: AsyncSession, *, token: str) -> PublicQuoteResponse:
    quote = await get_by_public_token(db, token=token)
    if quote is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quote not found")

    customer_result = await db.execute(
        select(Customer).where(
            Customer.id == quote.customer_id,
            Customer.tenant_id == quote.tenant_id,
        )
    )
    customer = customer_result.scalar_one_or_none()
    tenant = await db.get(Tenant, quote.tenant_id)
    customer_name = customer.name if customer else ""
    tenant_name = tenant.name if tenant else ""

    return PublicQuoteResponse(
        tenant_name=tenant_name,
        customer_name=customer_name,
        number=quote.number,
        status=cast(QuoteStatus, quote.status),
        currency=quote.currency,
        subtotal=quote.subtotal,
        discount_total=quote.discount_total,
        tax_total=quote.tax_total,
        total=quote.total,
        notes=quote.notes,
        valid_until=quote.valid_until,
        items=[
            PublicQuoteItem(
                description=item.description,
                quantity=item.quantity,
                unit_price=item.unit_price,
                discount_rate=item.discount_rate,
                tax_rate=item.tax_rate,
                line_total=item.line_total,
                sort_order=item.sort_order,
            )
            for item in quote.items
        ],
    )


async def public_approve_quote(
    db: AsyncSession, *, token: str, decision: PublicQuoteDecision
) -> PublicQuoteResponse:
    quote = await get_by_public_token(db, token=token, lock=True)
    if quote is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quote not found")

    await _ensure_not_expired(db, quote)
    if quote.status != "sent":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Quote must be sent to be approved",
        )

    quote.status = "approved"
    quote.approved_at = datetime.now(UTC)

    if quote.work_order_id:
        order = await get_work_order(db, tenant_id=quote.tenant_id, order_id=quote.work_order_id)
        _set_order_commercial_status(order, "approved")

    await create_event(
        db,
        tenant_id=quote.tenant_id,
        quote_id=quote.id,
        event_type="approved",
        actor_user_id=None,
        payload={"notes": decision.notes} if decision.notes else None,
    )
    await automation_service.emit_event(
        db,
        tenant_id=quote.tenant_id,
        event_type="quote_approved",
        payload=_quote_event_payload(quote),
    )
    await db.commit()
    await db.refresh(quote)
    return await public_get_quote(db, token=token)


async def public_reject_quote(
    db: AsyncSession, *, token: str, decision: PublicQuoteDecision
) -> PublicQuoteResponse:
    quote = await get_by_public_token(db, token=token, lock=True)
    if quote is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quote not found")

    await _ensure_not_expired(db, quote)
    if quote.status != "sent":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Quote must be sent to be rejected",
        )

    quote.status = "rejected"
    quote.rejected_at = datetime.now(UTC)

    if quote.work_order_id:
        order = await get_work_order(db, tenant_id=quote.tenant_id, order_id=quote.work_order_id)
        _set_order_commercial_status(order, "rejected")

    await create_event(
        db,
        tenant_id=quote.tenant_id,
        quote_id=quote.id,
        event_type="rejected",
        actor_user_id=None,
        payload={"notes": decision.notes} if decision.notes else None,
    )
    await automation_service.emit_event(
        db,
        tenant_id=quote.tenant_id,
        event_type="quote_rejected",
        payload=_quote_event_payload(quote),
    )
    await db.commit()
    await db.refresh(quote)
    return await public_get_quote(db, token=token)


async def generate_quote_pdf(db: AsyncSession, *, tenant_id: UUID, quote_id: UUID) -> bytes:
    quote = await get_tenant_quote(db, tenant_id=tenant_id, quote_id=quote_id)
    customer = await db.get(Customer, quote.customer_id)
    tenant = await db.get(Tenant, quote.tenant_id)

    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    _width, height = A4
    margin = 50
    y = height - margin

    c.setFont("Helvetica-Bold", 16)
    c.drawString(margin, y, "Presupuesto")
    y -= 30

    c.setFont("Helvetica", 11)
    c.drawString(margin, y, f"Empresa: {tenant.name if tenant else ''}")
    y -= 18
    c.drawString(margin, y, f"Cliente: {customer.name if customer else ''}")
    y -= 18
    c.drawString(margin, y, f"Número: {quote.number}")
    y -= 18
    c.drawString(margin, y, f"Fecha: {quote.created_at.strftime('%Y-%m-%d')}")
    y -= 18
    if quote.valid_until:
        c.drawString(margin, y, f"Válido hasta: {quote.valid_until.strftime('%Y-%m-%d')}")
        y -= 18

    y -= 20
    c.setFont("Helvetica-Bold", 11)
    headers = ["Descripción", "Cant.", "P. unit.", "Dto %", "Imp %", "Total"]
    col_widths = [220, 50, 80, 50, 50, 80]
    x = margin
    for header, col_width in zip(headers, col_widths, strict=True):
        c.drawString(x, y, header)
        x += col_width
    y -= 18

    c.setFont("Helvetica", 10)
    for item in quote.items:
        x = margin
        values = [
            item.description[:35],
            str(item.quantity),
            f"{quote.currency} {item.unit_price:.2f}",
            f"{item.discount_rate:.2f}",
            f"{item.tax_rate:.2f}",
            f"{quote.currency} {item.line_total:.2f}",
        ]
        for value, col_width in zip(values, col_widths, strict=True):
            c.drawString(x, y, value)
            x += col_width
        y -= 16

    y -= 20
    c.setFont("Helvetica-Bold", 11)
    c.drawString(margin, y, f"Subtotal: {quote.currency} {quote.subtotal:.2f}")
    y -= 18
    c.drawString(margin, y, f"Descuento: {quote.currency} {quote.discount_total:.2f}")
    y -= 18
    c.drawString(margin, y, f"Impuestos: {quote.currency} {quote.tax_total:.2f}")
    y -= 18
    c.setFont("Helvetica-Bold", 13)
    c.drawString(margin, y, f"Total: {quote.currency} {quote.total:.2f}")

    if quote.notes:
        y -= 40
        c.setFont("Helvetica-Bold", 11)
        c.drawString(margin, y, "Notas:")
        y -= 18
        c.setFont("Helvetica", 10)
        for line in quote.notes.splitlines()[:20]:
            c.drawString(margin, y, line[:100])
            y -= 14

    c.showPage()
    c.save()
    return buffer.getvalue()
