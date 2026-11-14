from __future__ import annotations

import csv
import io
import itertools
import json
import re
import zipfile
from collections.abc import Sequence
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import UUID

from email_validator import EmailNotValidError, validate_email
from fastapi import HTTPException, Request, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_client_ip
from app.models import Customer, Tenant
from app.repositories.customers import create_customer
from app.repositories.imports import create_import_job, get_import_job_for_update
from app.schemas.imports import (
    ImportCommitResponse,
    ImportPreviewResponse,
    ImportRowPreview,
    ImportSummary,
)
from app.services import audit_service, security_service

MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024
MAX_ROWS = 500
ALLOWED_EXTENSIONS = {".csv", ".xlsx"}
REQUIRED_CANONICAL_COLUMN = "name"
_XLSX_MAGIC = b"PK\x03\x04"
_MAX_XLSX_UNCOMPRESSED_BYTES = 20 * 1024 * 1024
_MAX_XLSX_ENTRIES = 1000
_MAX_XLSX_RATIO = 100
_FILE_NAME_ALLOWED_RE = re.compile(r"[^A-Za-z0-9._-]")
_CANONICAL_COLUMNS = {
    "name",
    "email",
    "phone",
    "address",
    "city",
    "province",
    "postal_code",
    "notes",
}
_MAX_LENGTHS = {
    "name": 160,
    "email": 320,
    "phone": 40,
    "address": 240,
    "city": 120,
    "province": 120,
    "postal_code": 20,
    "notes": 2000,
}

_PHONE_DIGITS_RE = re.compile(r"\D")


def _normalize_email(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip().lower()
    return stripped if stripped else None


def _normalize_phone(value: str | None) -> str | None:
    if value is None:
        return None
    digits = _PHONE_DIGITS_RE.sub("", value)
    return digits if digits else None


def _validate_email(value: str | None) -> tuple[str | None, str | None]:
    if value is None or value.strip() == "":
        return None, None
    try:
        info = validate_email(value.strip(), check_deliverability=False)
        return info.normalized, None
    except EmailNotValidError:
        return None, "Email inválido"


def _validate_phone(value: str | None) -> tuple[str | None, str | None]:
    if value is None or value.strip() == "":
        return None, None
    cleaned = value.strip()
    if len(cleaned) > _MAX_LENGTHS["phone"]:
        return None, "Teléfono demasiado largo (máx. 40 caracteres)"
    digits = _normalize_phone(cleaned)
    if digits is None or len(digits) < 6:
        return None, "Teléfono inválido"
    return cleaned, None


def _neutralize_for_csv(value: Any) -> Any:
    """Evita inyección de fórmulas en la salida CSV prefijando celdas de riesgo.

    No muta los valores persistidos; se aplica únicamente al exportar.
    """
    if isinstance(value, str):
        if value and value[0] in {"=", "+", "-", "@", "\t", "\r", "\n"}:
            return "'" + value
        return value
    if isinstance(value, dict):
        return {k: _neutralize_for_csv(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_neutralize_for_csv(v) for v in value]
    return value


def _clean_optional_field(field: str, value: Any) -> tuple[str | None, str | None]:
    if value is None:
        return None, None
    text = str(value).strip()
    if text == "":
        return None, None
    max_length = _MAX_LENGTHS.get(field)
    if max_length is not None and len(text) > max_length:
        return None, f"{field} excede {max_length} caracteres"
    return text, None


def _sanitize_file_name(filename: str) -> str:
    """Deja solo caracteres seguros para nombres de archivo y Content-Disposition."""
    name = _FILE_NAME_ALLOWED_RE.sub("_", filename)
    name = name.strip(".")
    if not name:
        name = "import"
    return name[:260]


def _canonicalize_header(header: str) -> str:
    return header.strip().lower()


def _canonicalize_headers(headers: Sequence[str | None]) -> list[str]:
    canonical: list[str] = []
    seen: set[str] = set()
    for header in headers:
        if header is None:
            canonical.append("")
            continue
        text = _canonicalize_header(header)
        if text not in seen and text in _CANONICAL_COLUMNS:
            seen.add(text)
            canonical.append(text)
        else:
            canonical.append("")
    return canonical


def _validate_xlsx_zip(content: bytes) -> None:
    try:
        with zipfile.ZipFile(io.BytesIO(content)) as archive:
            infos = archive.infolist()
            if len(infos) > _MAX_XLSX_ENTRIES:
                raise HTTPException(
                    status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                    detail="El archivo XLSX tiene demasiadas entradas comprimidas",
                )
            total_uncompressed = sum(info.file_size for info in infos)
            if total_uncompressed > _MAX_XLSX_UNCOMPRESSED_BYTES:
                raise HTTPException(
                    status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                    detail="El archivo XLSX descomprimido es demasiado grande",
                )
            if len(content) > 0:
                ratio = total_uncompressed / len(content)
                if ratio > _MAX_XLSX_RATIO:
                    raise HTTPException(
                        status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                        detail="El archivo XLSX tiene una compresión sospechosa",
                    )
    except zipfile.BadZipFile as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="El archivo XLSX está corrupto",
        ) from exc


async def _validate_file(file: UploadFile) -> tuple[bytes, str]:
    if file.filename is None:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="El archivo no tiene nombre",
        )
    extension = Path(file.filename).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Solo se aceptan archivos CSV o XLSX",
        )

    size = 0
    chunks: list[bytes] = []
    while True:
        chunk = await file.read(8192)
        if not chunk:
            break
        size += len(chunk)
        if size > MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                detail="El archivo excede el límite de 2 MB",
            )
        chunks.append(chunk)
    content = b"".join(chunks)

    if extension == ".xlsx" and not content.startswith(_XLSX_MAGIC):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="El archivo no tiene formato XLSX válido",
        )
    if extension == ".csv" and content.startswith(_XLSX_MAGIC):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="El archivo CSV no puede tener formato comprimido",
        )

    if extension == ".xlsx":
        _validate_xlsx_zip(content)

    safe_name = _sanitize_file_name(file.filename)
    return content, safe_name


def _parse_csv(content: bytes) -> tuple[list[str], list[dict[str, Any]]]:
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="No se pudo decodificar el CSV como UTF-8",
        ) from exc

    reader = csv.DictReader(io.StringIO(text))
    if reader.fieldnames is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="El CSV no tiene encabezados",
        )

    canonical_headers = _canonicalize_headers(reader.fieldnames)
    if REQUIRED_CANONICAL_COLUMN not in canonical_headers:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Falta la columna obligatoria 'name'",
        )

    rows: list[dict[str, Any]] = []
    for raw in itertools.islice(reader, MAX_ROWS + 1):
        row: dict[str, Any] = {}
        for original_key, value in raw.items():
            if original_key is None:
                continue
            canonical = _canonicalize_header(original_key)
            if canonical not in _CANONICAL_COLUMNS:
                continue
            if isinstance(value, str):
                value = value.strip()
            if value is not None and value != "":
                row[canonical] = value
        rows.append(row)

    if len(rows) > MAX_ROWS:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=f"Máximo {MAX_ROWS} filas permitidas",
        )
    return canonical_headers, rows


def _parse_xlsx(content: bytes) -> tuple[list[str], list[dict[str, Any]]]:
    try:
        from defusedxml import defuse_stdlib  # type: ignore[attr-defined]

        defuse_stdlib()
        from openpyxl import load_workbook
    except ImportError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Librería XLSX no disponible",
        ) from exc

    try:
        workbook = load_workbook(io.BytesIO(content), data_only=True, read_only=True)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="No se pudo leer el archivo XLSX",
        ) from exc

    try:
        worksheet = workbook.active
        if worksheet is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="El XLSX no tiene hojas",
            )

        rows_iter = worksheet.iter_rows(values_only=True)
        try:
            header_row = next(rows_iter)
        except StopIteration:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="El XLSX está vacío",
            ) from None

        headers = [str(cell).strip() if cell is not None else "" for cell in header_row]
        canonical_headers = _canonicalize_headers(headers)
        if REQUIRED_CANONICAL_COLUMN not in canonical_headers:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Falta la columna obligatoria 'name'",
            )

        rows: list[dict[str, Any]] = []
        for row_values in itertools.islice(rows_iter, MAX_ROWS + 1):
            row: dict[str, Any] = {}
            for index, cell in enumerate(row_values):
                if index >= len(canonical_headers):
                    break
                canonical = canonical_headers[index]
                if canonical == "" or canonical not in _CANONICAL_COLUMNS:
                    continue
                if cell is None:
                    continue
                text = cell.strip() if isinstance(cell, str) else str(cell).strip()
                if text:
                    row[canonical] = text
            rows.append(row)

        if len(rows) > MAX_ROWS:
            raise HTTPException(
                status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                detail=f"Máximo {MAX_ROWS} filas permitidas",
            )
        return canonical_headers, rows
    finally:
        workbook.close()


def _as_row_preview(row: dict[str, Any]) -> ImportRowPreview:
    return ImportRowPreview(
        line=int(row["line"]),
        data=row["data"],
        errors=row["errors"],
        duplicate=bool(row["duplicate"]),
    )


async def _validate_rows(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    rows: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], ImportSummary]:
    existing = await db.execute(
        select(Customer).where(
            Customer.tenant_id == tenant_id,
            Customer.deleted_at.is_(None),
        )
    )
    existing_by_email: dict[str, UUID] = {}
    existing_by_phone: dict[str, UUID] = {}
    for customer in existing.scalars().all():
        email = _normalize_email(customer.email)
        if email:
            existing_by_email[email] = customer.id
        phone = _normalize_phone(customer.phone)
        if phone:
            existing_by_phone[phone] = customer.id

    seen_email: dict[str, int] = {}
    seen_phone: dict[str, int] = {}

    out_rows: list[dict[str, Any]] = []
    valid_count = 0
    invalid_count = 0
    duplicate_count = 0

    for line_number, raw in enumerate(rows, start=2):
        errors: list[str] = []
        duplicate = False
        data: dict[str, Any] = {}

        name_value, name_error = _clean_optional_field("name", raw.get("name"))
        if name_error:
            errors.append(name_error)
        elif name_value is None:
            errors.append("El campo name es obligatorio")
        else:
            data["name"] = name_value

        email_value, email_error = _validate_email(raw.get("email"))
        if email_error:
            errors.append(email_error)
        elif email_value is not None:
            data["email"] = email_value

        phone_value, phone_error = _validate_phone(raw.get("phone"))
        if phone_error:
            errors.append(phone_error)
        elif phone_value is not None:
            data["phone"] = phone_value

        for field in ("address", "city", "province", "postal_code", "notes"):
            field_value, field_error = _clean_optional_field(field, raw.get(field))
            if field_error:
                errors.append(field_error)
            elif field_value is not None:
                data[field] = field_value

        normalized_email = _normalize_email(email_value)
        normalized_phone = _normalize_phone(phone_value)

        if normalized_email:
            if normalized_email in existing_by_email:
                duplicate = True
                errors.append("Email ya existe en la empresa")
            elif normalized_email in seen_email:
                duplicate = True
                errors.append(f"Email duplicado en línea {seen_email[normalized_email]}")
            else:
                seen_email[normalized_email] = line_number

        if normalized_phone:
            if normalized_phone in existing_by_phone:
                duplicate = True
                errors.append("Teléfono ya existe en la empresa")
            elif normalized_phone in seen_phone:
                duplicate = True
                errors.append(f"Teléfono duplicado en línea {seen_phone[normalized_phone]}")
            else:
                seen_phone[normalized_phone] = line_number

        if duplicate:
            duplicate_count += 1
        elif errors:
            invalid_count += 1
        else:
            valid_count += 1

        out_rows.append(
            {
                "line": line_number,
                "data": data,
                "errors": errors,
                "duplicate": duplicate,
            }
        )

    summary = ImportSummary(
        total=len(rows),
        valid=valid_count,
        invalid=invalid_count,
        duplicates=duplicate_count,
    )
    return out_rows, summary


async def preview_customers_import(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    created_by: UUID,
    file: UploadFile,
    request: Request,
) -> ImportPreviewResponse:
    await security_service.check_rate_limit(
        db,
        request,
        scope="import-preview",
        limit=30,
    )

    content, safe_name = await _validate_file(file)
    if safe_name.lower().endswith(".csv"):
        headers, raw_rows = _parse_csv(content)
    else:
        headers, raw_rows = _parse_xlsx(content)

    rows, summary = await _validate_rows(
        db,
        tenant_id=tenant_id,
        rows=raw_rows,
    )
    error_rows = [row for row in rows if row["errors"] or row["duplicate"]]

    job = await create_import_job(
        db,
        tenant_id=tenant_id,
        created_by=created_by,
        file_name=safe_name,
        status="preview",
        summary=summary.model_dump(),
        rows_json=rows,
        errors_json=error_rows,
    )
    await db.flush()
    await audit_service.record(
        db,
        action="import_preview",
        entity_type="import_job",
        entity_id=str(job.id),
        tenant_id=tenant_id,
        actor_user_id=created_by,
        metadata={
            "file_name": job.file_name,
            "summary": summary.model_dump(),
        },
        ip=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    await db.commit()
    await db.refresh(job)

    return ImportPreviewResponse(
        job_id=job.id,
        headers=headers,
        rows=[_as_row_preview(row) for row in rows],
        summary=summary,
    )


async def commit_customers_import(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    job_id: UUID,
    actor_user_id: UUID,
    request: Request,
) -> ImportCommitResponse:
    await security_service.check_rate_limit(
        db,
        request,
        scope="import-commit",
        limit=30,
    )

    job = await get_import_job_for_update(db, job_id=job_id, tenant_id=tenant_id)
    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trabajo de importación no encontrado",
        )

    if job.status == "applied" and job.applied_at is not None:
        stored = (job.summary or {}).get("commit_result")
        if stored is not None:
            return ImportCommitResponse.model_validate(stored)

    if job.status != "preview":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El trabajo no está listo para aplicar",
        )

    tenant = await db.scalar(select(Tenant.id).where(Tenant.id == tenant_id).with_for_update())
    if tenant is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empresa no encontrada",
        )

    existing = await db.execute(
        select(Customer).where(
            Customer.tenant_id == tenant_id,
            Customer.deleted_at.is_(None),
        )
    )
    existing_by_email: dict[str, UUID] = {}
    existing_by_phone: dict[str, UUID] = {}
    for customer in existing.scalars().all():
        email = _normalize_email(customer.email)
        if email:
            existing_by_email[email] = customer.id
        phone = _normalize_phone(customer.phone)
        if phone:
            existing_by_phone[phone] = customer.id

    seen_email: set[str] = set()
    seen_phone: set[str] = set()
    created = 0
    skipped_duplicates = 0
    skipped_invalid = 0

    for row in job.rows_json or []:
        if row.get("duplicate"):
            skipped_duplicates += 1
            continue
        if row.get("errors"):
            skipped_invalid += 1
            continue

        data = row.get("data") or {}
        if not data.get("name"):
            skipped_invalid += 1
            continue

        email = data.get("email")
        phone = data.get("phone")
        normalized_email = _normalize_email(email)
        normalized_phone = _normalize_phone(phone)

        if normalized_email and normalized_email in existing_by_email:
            skipped_duplicates += 1
            continue
        if normalized_phone and normalized_phone in existing_by_phone:
            skipped_duplicates += 1
            continue
        if normalized_email and normalized_email in seen_email:
            skipped_duplicates += 1
            continue
        if normalized_phone and normalized_phone in seen_phone:
            skipped_duplicates += 1
            continue

        if normalized_email:
            seen_email.add(normalized_email)
        if normalized_phone:
            seen_phone.add(normalized_phone)

        await create_customer(
            db,
            tenant_id=tenant_id,
            name=data["name"],
            phone=phone,
            email=email,
            address=data.get("address"),
            city=data.get("city"),
            province=data.get("province"),
            postal_code=data.get("postal_code"),
            notes=data.get("notes"),
        )
        created += 1

    result = ImportCommitResponse(
        created=created,
        skipped_duplicates=skipped_duplicates,
        skipped_invalid=skipped_invalid,
    )

    job.status = "applied"
    job.applied_at = datetime.now(UTC)
    summary = dict(job.summary or {})
    summary["commit_result"] = result.model_dump()
    job.summary = summary

    await db.flush()
    await audit_service.record(
        db,
        action="import_commit",
        entity_type="import_job",
        entity_id=str(job.id),
        tenant_id=tenant_id,
        actor_user_id=actor_user_id,
        metadata={
            "file_name": job.file_name,
            "result": result.model_dump(),
        },
        ip=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    await db.commit()
    return result


async def get_errors_csv(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    job_id: UUID,
) -> tuple[str, str]:
    job = await get_import_job_for_update(db, job_id=job_id, tenant_id=tenant_id)
    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trabajo de importación no encontrado",
        )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["line", "data", "errors"])
    for row in job.rows_json or []:
        if row.get("errors") or row.get("duplicate"):
            writer.writerow(
                [
                    row["line"],
                    json.dumps(_neutralize_for_csv(row.get("data")), ensure_ascii=False),
                    "; ".join(row.get("errors", [])),
                ]
            )
    return output.getvalue(), job.file_name
