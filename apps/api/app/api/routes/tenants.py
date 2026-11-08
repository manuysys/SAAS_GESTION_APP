from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.db import get_db
from app.models import User
from app.repositories.tenants import create_membership, create_tenant
from app.schemas.auth import TenantCreate, TenantResponse
from app.services import auth_service
from app.services.auth_service import unique_slug

router = APIRouter(prefix="/tenants", tags=["tenants"])


@router.get("", response_model=list[TenantResponse])
async def list_tenants(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[TenantResponse]:
    _, memberships = await auth_service.get_me(db, user)
    return [
        TenantResponse(
            id=membership.tenant.id,
            name=membership.tenant.name,
            slug=membership.tenant.slug,
            role=membership.role,
        )
        for membership in memberships
    ]


@router.post("", response_model=TenantResponse, status_code=status.HTTP_201_CREATED)
async def create_new_tenant(
    payload: TenantCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TenantResponse:
    tenant = await create_tenant(
        db,
        name=payload.name.strip(),
        slug=await unique_slug(db, payload.name),
    )
    await create_membership(db, tenant_id=tenant.id, user_id=user.id, role="owner")
    await db.commit()
    await db.refresh(tenant)
    return TenantResponse(
        id=tenant.id,
        name=tenant.name,
        slug=tenant.slug,
        role="owner",
    )
