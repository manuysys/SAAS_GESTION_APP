from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import CustomerAccessToken


async def get_access_token_by_hash(
    db: AsyncSession, *, token_hash: str
) -> CustomerAccessToken | None:
    result = await db.execute(
        select(CustomerAccessToken).where(CustomerAccessToken.token_hash == token_hash)
    )
    return result.scalar_one_or_none()


async def create_access_token(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    customer_id: UUID,
    token_hash: str,
    expires_at: datetime,
) -> CustomerAccessToken:
    token = CustomerAccessToken(
        tenant_id=tenant_id,
        customer_id=customer_id,
        token_hash=token_hash,
        expires_at=expires_at,
        created_at=datetime.now(UTC),
    )
    db.add(token)
    await db.flush()
    return token
