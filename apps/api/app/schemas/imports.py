from __future__ import annotations

from typing import Any
from uuid import UUID

from pydantic import BaseModel


class ImportRowPreview(BaseModel):
    line: int
    data: dict[str, Any]
    errors: list[str]
    duplicate: bool


class ImportSummary(BaseModel):
    total: int
    valid: int
    invalid: int
    duplicates: int


class ImportPreviewResponse(BaseModel):
    job_id: UUID
    headers: list[str]
    rows: list[ImportRowPreview]
    summary: ImportSummary


class ImportCommitRequest(BaseModel):
    job_id: UUID


class ImportCommitResponse(BaseModel):
    created: int
    skipped_duplicates: int
    skipped_invalid: int
