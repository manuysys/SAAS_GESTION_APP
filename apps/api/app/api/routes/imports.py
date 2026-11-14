from __future__ import annotations

import io
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, File, Request, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import StreamingResponse

from app.api.deps import require_roles
from app.core.db import get_db
from app.models import Membership
from app.schemas.imports import (
    ImportCommitRequest,
    ImportCommitResponse,
    ImportPreviewResponse,
)
from app.services import import_service
from app.services.import_service import _sanitize_file_name

router = APIRouter(prefix="/imports", tags=["imports"])

IMPORT_ROLES = ("owner", "admin", "dispatcher")


@router.post("/customers/preview", response_model=ImportPreviewResponse)
async def preview_customers_import(
    request: Request,
    file: UploadFile = File(...),
    membership: Membership = Depends(require_roles(*IMPORT_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> ImportPreviewResponse:
    return await import_service.preview_customers_import(
        db,
        tenant_id=membership.tenant_id,
        created_by=membership.user_id,
        file=file,
        request=request,
    )


@router.post("/customers/commit", response_model=ImportCommitResponse)
async def commit_customers_import(
    payload: ImportCommitRequest,
    request: Request,
    membership: Membership = Depends(require_roles(*IMPORT_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> ImportCommitResponse:
    return await import_service.commit_customers_import(
        db,
        tenant_id=membership.tenant_id,
        job_id=payload.job_id,
        actor_user_id=membership.user_id,
        request=request,
    )


@router.get("/{job_id}/errors.csv")
async def get_import_errors_csv(
    job_id: UUID,
    membership: Membership = Depends(require_roles(*IMPORT_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    csv_text, file_name = await import_service.get_errors_csv(
        db,
        tenant_id=membership.tenant_id,
        job_id=job_id,
    )
    safe_name = _sanitize_file_name(Path(file_name).stem)
    output = io.BytesIO(csv_text.encode("utf-8-sig"))
    return StreamingResponse(
        output,
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f"attachment; filename=errors_{safe_name}.csv",
        },
        status_code=status.HTTP_200_OK,
    )
