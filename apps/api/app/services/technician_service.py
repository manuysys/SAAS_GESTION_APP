from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Membership, User


async def list_active_technicians(db: AsyncSession, *, tenant_id: UUID) -> list[dict[str, object]]:
    result = await db.execute(
        select(User.id, User.full_name, User.email)
        .join(Membership, Membership.user_id == User.id)
        .where(
            Membership.tenant_id == tenant_id,
            Membership.role == "technician",
            Membership.status == "active",
            User.status == "active",
        )
        .order_by(User.full_name.asc())
    )
    return [{"id": row.id, "full_name": row.full_name, "email": row.email} for row in result.all()]
