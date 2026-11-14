from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_platform_admin
from app.core.db import get_db
from app.models import Membership
from app.services import demo_service, security_service

router = APIRouter(prefix="/admin/demo", tags=["admin"])


@router.post("/reset")
async def reset_demo(
    request: Request,
    membership: Membership = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    await security_service.check_rate_limit(
        db,
        request,
        scope="demo-reset",
        limit=10,
    )
    result = await demo_service.reset_demo(
        db,
        actor_user_id=membership.user_id,
        request=request,
    )
    await db.commit()
    return result
