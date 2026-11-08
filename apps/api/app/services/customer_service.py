from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Customer
from app.repositories.customers import (
    create_customer,
    get_customer,
    list_customers,
)
from app.schemas.customer import CustomerCreate, CustomerUpdate


async def list_tenant_customers(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    query: str | None,
    limit: int,
    offset: int,
) -> tuple[list[Customer], int]:
    return await list_customers(
        db,
        tenant_id=tenant_id,
        query=query,
        limit=limit,
        offset=offset,
    )


async def create_tenant_customer(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    payload: CustomerCreate,
) -> Customer:
    customer = await create_customer(
        db,
        tenant_id=tenant_id,
        name=payload.name.strip(),
        phone=payload.phone,
        email=str(payload.email) if payload.email else None,
        notes=payload.notes,
    )
    await db.commit()
    await db.refresh(customer)
    return customer


async def get_tenant_customer(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    customer_id: UUID,
) -> Customer:
    customer = await get_customer(db, tenant_id=tenant_id, customer_id=customer_id)
    if customer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )
    return customer


async def update_tenant_customer(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    customer_id: UUID,
    payload: CustomerUpdate,
) -> Customer:
    customer = await get_tenant_customer(db, tenant_id=tenant_id, customer_id=customer_id)
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        if field == "email" and value is not None:
            value = str(value).lower()
        setattr(customer, field, value)
    await db.commit()
    await db.refresh(customer)
    return customer


async def delete_tenant_customer(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    customer_id: UUID,
) -> None:
    customer = await get_tenant_customer(db, tenant_id=tenant_id, customer_id=customer_id)
    customer.status = "archived"
    customer.deleted_at = datetime.now(UTC)
    await db.commit()
