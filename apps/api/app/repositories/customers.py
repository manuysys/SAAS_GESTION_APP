from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Customer


async def list_customers(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    query: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[Customer], int]:
    filters = [Customer.tenant_id == tenant_id, Customer.deleted_at.is_(None)]
    if query:
        pattern = f"%{query.strip()}%"
        filters.append(
            or_(
                Customer.name.ilike(pattern),
                Customer.phone.ilike(pattern),
                Customer.email.ilike(pattern),
            )
        )

    total = await db.scalar(select(func.count()).select_from(Customer).where(*filters))
    result = await db.execute(
        select(Customer)
        .where(*filters)
        .order_by(Customer.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(result.scalars().all()), int(total or 0)


async def get_customer(db: AsyncSession, *, tenant_id: UUID, customer_id: UUID) -> Customer | None:
    result = await db.execute(
        select(Customer).where(
            Customer.id == customer_id,
            Customer.tenant_id == tenant_id,
            Customer.deleted_at.is_(None),
        )
    )
    return result.scalar_one_or_none()


async def create_customer(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    name: str,
    phone: str | None,
    email: str | None,
    address: str | None,
    city: str | None,
    province: str | None,
    postal_code: str | None,
    notes: str | None,
) -> Customer:
    customer = Customer(
        tenant_id=tenant_id,
        name=name,
        phone=phone,
        email=email.lower() if email else None,
        address=address,
        city=city,
        province=province,
        postal_code=postal_code,
        notes=notes,
    )
    db.add(customer)
    await db.flush()
    return customer
