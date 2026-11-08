from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Membership, Tenant


async def create_tenant(db: AsyncSession, *, name: str, slug: str) -> Tenant:
    tenant = Tenant(name=name, slug=slug)
    db.add(tenant)
    await db.flush()
    return tenant


async def create_membership(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    user_id: UUID,
    role: str,
) -> Membership:
    membership = Membership(tenant_id=tenant_id, user_id=user_id, role=role)
    db.add(membership)
    await db.flush()
    return membership


async def list_memberships_for_user(db: AsyncSession, user_id: UUID) -> list[Membership]:
    result = await db.execute(
        select(Membership)
        .where(Membership.user_id == user_id, Membership.status == "active")
        .options(selectinload(Membership.tenant))
    )
    return list(result.scalars().all())


async def slug_exists(db: AsyncSession, slug: str) -> bool:
    result = await db.execute(select(Tenant.id).where(Tenant.slug == slug))
    return result.scalar_one_or_none() is not None
