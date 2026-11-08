from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ServiceRequest


async def list_service_requests(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    status: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[ServiceRequest], int]:
    filters = [ServiceRequest.tenant_id == tenant_id]
    if status:
        filters.append(ServiceRequest.status == status)

    total = await db.scalar(select(func.count()).select_from(ServiceRequest).where(*filters))
    result = await db.execute(
        select(ServiceRequest)
        .where(*filters)
        .order_by(ServiceRequest.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(result.scalars().all()), int(total or 0)


async def get_service_request(
    db: AsyncSession, *, tenant_id: UUID, request_id: UUID
) -> ServiceRequest | None:
    result = await db.execute(
        select(ServiceRequest).where(
            ServiceRequest.id == request_id,
            ServiceRequest.tenant_id == tenant_id,
        )
    )
    return result.scalar_one_or_none()


async def create_service_request(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    customer_id: UUID,
    title: str,
    description: str | None,
    priority: str,
    source: str,
) -> ServiceRequest:
    request = ServiceRequest(
        tenant_id=tenant_id,
        customer_id=customer_id,
        title=title,
        description=description,
        priority=priority,
        source=source,
    )
    db.add(request)
    await db.flush()
    return request
