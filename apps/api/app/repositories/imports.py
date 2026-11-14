from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ImportJob


async def create_import_job(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    created_by: UUID | None,
    file_name: str,
    status: str = "preview",
    summary: dict[str, Any] | None = None,
    rows_json: list[dict[str, Any]] | None = None,
    errors_json: list[dict[str, Any]] | None = None,
) -> ImportJob:
    job = ImportJob(
        tenant_id=tenant_id,
        created_by=created_by,
        file_name=file_name,
        status=status,
        summary=summary,
        rows_json=rows_json,
        errors_json=errors_json,
    )
    db.add(job)
    await db.flush()
    return job


async def get_import_job(
    db: AsyncSession,
    *,
    job_id: UUID,
    tenant_id: UUID,
) -> ImportJob | None:
    result = await db.execute(
        select(ImportJob).where(
            ImportJob.id == job_id,
            ImportJob.tenant_id == tenant_id,
        )
    )
    return result.scalar_one_or_none()


async def get_import_job_for_update(
    db: AsyncSession,
    *,
    job_id: UUID,
    tenant_id: UUID,
) -> ImportJob | None:
    result = await db.execute(
        select(ImportJob)
        .where(
            ImportJob.id == job_id,
            ImportJob.tenant_id == tenant_id,
        )
        .with_for_update()
    )
    return result.scalar_one_or_none()
