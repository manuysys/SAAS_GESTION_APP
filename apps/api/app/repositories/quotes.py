from datetime import UTC, datetime
from decimal import Decimal
from typing import TypedDict
from uuid import UUID

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Quote, QuoteEvent, QuoteItem, Tenant


class QuoteItemData(TypedDict):
    description: str
    quantity: Decimal
    unit_price: Decimal
    discount_rate: Decimal
    tax_rate: Decimal
    line_total: Decimal
    sort_order: int


async def list_quotes(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    status: str | None = None,
    customer_id: UUID | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[Quote], int]:
    filters = [Quote.tenant_id == tenant_id]
    if status:
        filters.append(Quote.status == status)
    if customer_id:
        filters.append(Quote.customer_id == customer_id)

    total = await db.scalar(select(func.count()).select_from(Quote).where(*filters))
    result = await db.execute(
        select(Quote).where(*filters).order_by(Quote.created_at.desc()).limit(limit).offset(offset)
    )
    return list(result.scalars().all()), int(total or 0)


async def get_quote(
    db: AsyncSession, *, tenant_id: UUID, quote_id: UUID, lock: bool = False
) -> Quote | None:
    statement = (
        select(Quote)
        .where(Quote.id == quote_id, Quote.tenant_id == tenant_id)
        .options(selectinload(Quote.items))
    )
    if lock:
        statement = statement.with_for_update()
    result = await db.execute(statement)
    return result.scalar_one_or_none()


async def next_quote_number(db: AsyncSession, *, tenant_id: UUID) -> str:
    # Serializa la numeración por tenant dentro de la transacción actual.
    await db.execute(select(Tenant.id).where(Tenant.id == tenant_id).with_for_update())
    year = datetime.now(UTC).year
    prefix = f"QT-{year}-"
    result = await db.execute(
        select(func.count())
        .select_from(Quote)
        .where(Quote.tenant_id == tenant_id, Quote.number.ilike(f"{prefix}%"))
    )
    sequence = int(result.scalar_one() or 0) + 1
    return f"{prefix}{sequence:04d}"


async def create_quote(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    customer_id: UUID,
    work_order_id: UUID | None,
    number: str,
    status: str,
    currency: str,
    subtotal: Decimal,
    discount_total: Decimal,
    tax_total: Decimal,
    total: Decimal,
    notes: str | None,
    valid_until: datetime | None,
    items_data: list[QuoteItemData],
) -> Quote:
    quote = Quote(
        tenant_id=tenant_id,
        customer_id=customer_id,
        work_order_id=work_order_id,
        number=number,
        status=status,
        currency=currency,
        subtotal=subtotal,
        discount_total=discount_total,
        tax_total=tax_total,
        total=total,
        notes=notes,
        valid_until=valid_until,
    )
    db.add(quote)
    await db.flush()

    for item in items_data:
        db.add(
            QuoteItem(
                tenant_id=tenant_id,
                quote_id=quote.id,
                description=item["description"],
                quantity=item["quantity"],
                unit_price=item["unit_price"],
                discount_rate=item["discount_rate"],
                tax_rate=item["tax_rate"],
                line_total=item["line_total"],
                sort_order=item["sort_order"],
            )
        )
    await db.flush()
    return quote


async def replace_items(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    quote_id: UUID,
    items_data: list[QuoteItemData],
) -> None:
    await db.execute(
        delete(QuoteItem).where(QuoteItem.tenant_id == tenant_id, QuoteItem.quote_id == quote_id)
    )
    for item in items_data:
        db.add(
            QuoteItem(
                tenant_id=tenant_id,
                quote_id=quote_id,
                description=item["description"],
                quantity=item["quantity"],
                unit_price=item["unit_price"],
                discount_rate=item["discount_rate"],
                tax_rate=item["tax_rate"],
                line_total=item["line_total"],
                sort_order=item["sort_order"],
            )
        )
    await db.flush()


async def create_event(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    quote_id: UUID,
    event_type: str,
    actor_user_id: UUID | None,
    payload: dict[str, object] | None = None,
) -> QuoteEvent:
    event = QuoteEvent(
        tenant_id=tenant_id,
        quote_id=quote_id,
        event_type=event_type,
        actor_user_id=actor_user_id,
        payload=payload,
    )
    db.add(event)
    await db.flush()
    return event


async def list_events(db: AsyncSession, *, tenant_id: UUID, quote_id: UUID) -> list[QuoteEvent]:
    result = await db.execute(
        select(QuoteEvent)
        .where(QuoteEvent.tenant_id == tenant_id, QuoteEvent.quote_id == quote_id)
        .order_by(QuoteEvent.created_at.asc())
    )
    return list(result.scalars().all())


async def get_by_public_token(db: AsyncSession, *, token: str, lock: bool = False) -> Quote | None:
    statement = select(Quote).where(Quote.public_token == token).options(selectinload(Quote.items))
    if lock:
        statement = statement.with_for_update()
    result = await db.execute(statement)
    return result.scalar_one_or_none()
