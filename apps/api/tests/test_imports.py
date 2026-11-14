from __future__ import annotations

import csv
import io
import zipfile
from typing import Any
from urllib.parse import urlparse

from httpx import AsyncClient

from app.services.import_service import _MAX_XLSX_UNCOMPRESSED_BYTES

_CANONICAL_COLUMNS = [
    "name",
    "email",
    "phone",
    "address",
    "city",
    "province",
    "postal_code",
    "notes",
]


def _build_csv(rows: list[dict[str, Any]]) -> bytes:
    output = io.StringIO()
    writer = csv.DictWriter(
        output,
        fieldnames=_CANONICAL_COLUMNS,
        extrasaction="ignore",
    )
    writer.writeheader()
    for row in rows:
        writer.writerow({col: row.get(col, "") for col in _CANONICAL_COLUMNS})
    return output.getvalue().encode("utf-8-sig")


def _build_xlsx(rows: list[dict[str, Any]]) -> bytes:
    from openpyxl import Workbook

    workbook = Workbook()
    worksheet = workbook.active
    assert worksheet is not None
    worksheet.append(_CANONICAL_COLUMNS)
    for row in rows:
        worksheet.append([row.get(col, "") for col in _CANONICAL_COLUMNS])
    output = io.BytesIO()
    workbook.save(output)
    workbook.close()
    return output.getvalue()


async def _register(
    client: AsyncClient,
    email: str,
    company: str,
) -> tuple[str, str]:
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "super-secret-123",
            "full_name": "Test User",
            "company_name": company,
        },
    )
    assert response.status_code == 201, response.text
    body = response.json()
    return body["access_token"], body["tenants"][0]["id"]


def _headers(token: str, tenant_id: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}", "X-Tenant-ID": tenant_id}


async def _invite_and_login(
    client: AsyncClient,
    owner_token: str,
    tenant_id: str,
    email: str,
    role: str,
) -> str:
    invite_response = await client.post(
        "/api/v1/team/invitations",
        json={"email": email, "role": role, "full_name": "Invited User"},
        headers=_headers(owner_token, tenant_id),
    )
    assert invite_response.status_code == 201, invite_response.text
    invitation_url = invite_response.json()["invitation_url"]
    token = urlparse(invitation_url).path.split("/")[-1]

    accept_response = await client.post(
        f"/api/v1/public/invitations/{token}/accept",
        json={"full_name": "Invited User", "password": "super-secret-123"},
    )
    assert accept_response.status_code == 200, accept_response.text
    return accept_response.json()["access_token"]


async def test_preview_csv_valid(client: AsyncClient) -> None:
    token, tenant_id = await _register(client, "csv-owner@example.com", "CSV Co")
    rows = [
        {"name": "Carlos Gomez", "email": "carlos@example.com", "phone": "+54 11 5555-1234"},
        {"name": "Ana Lopez", "email": "ana@example.com", "address": "Av. Corrientes 1234"},
    ]

    response = await client.post(
        "/api/v1/imports/customers/preview",
        files={"file": ("clients.csv", io.BytesIO(_build_csv(rows)), "text/csv")},
        headers=_headers(token, tenant_id),
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["summary"] == {"total": 2, "valid": 2, "invalid": 0, "duplicates": 0}
    assert len(body["rows"]) == 2
    assert all(not row["errors"] and not row["duplicate"] for row in body["rows"])
    assert "name" in body["headers"]

    commit = await client.post(
        "/api/v1/imports/customers/commit",
        json={"job_id": body["job_id"]},
        headers=_headers(token, tenant_id),
    )
    assert commit.status_code == 200, commit.text
    assert commit.json() == {"created": 2, "skipped_duplicates": 0, "skipped_invalid": 0}

    listed = await client.get("/api/v1/customers", headers=_headers(token, tenant_id))
    assert listed.status_code == 200
    assert listed.json()["total"] == 2


async def test_preview_xlsx_valid(client: AsyncClient) -> None:
    token, tenant_id = await _register(client, "xlsx-owner@example.com", "XLSX Co")
    rows = [
        {"name": "Luis Perez", "email": "luis@example.com", "phone": "1155554321"},
        {"name": "Maria Diaz", "city": "Córdoba"},
    ]

    response = await client.post(
        "/api/v1/imports/customers/preview",
        files={
            "file": (
                "clients.xlsx",
                io.BytesIO(_build_xlsx(rows)),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        },
        headers=_headers(token, tenant_id),
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["summary"] == {"total": 2, "valid": 2, "invalid": 0, "duplicates": 0}
    assert len(body["rows"]) == 2


async def test_preview_missing_name_column(client: AsyncClient) -> None:
    token, tenant_id = await _register(client, "missing-owner@example.com", "Missing Co")
    csv_content = "email\nsolo@example.com\n".encode("utf-8-sig")

    response = await client.post(
        "/api/v1/imports/customers/preview",
        files={"file": ("bad.csv", io.BytesIO(csv_content), "text/csv")},
        headers=_headers(token, tenant_id),
    )
    assert response.status_code == 422
    assert "name" in response.json()["detail"].lower()


async def test_preview_invalid_email(client: AsyncClient) -> None:
    token, tenant_id = await _register(client, "email-owner@example.com", "Email Co")
    rows = [{"name": "Malo", "email": "no-es-un-email"}]

    response = await client.post(
        "/api/v1/imports/customers/preview",
        files={"file": ("bad.csv", io.BytesIO(_build_csv(rows)), "text/csv")},
        headers=_headers(token, tenant_id),
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["summary"]["total"] == 1
    assert body["summary"]["invalid"] == 1
    assert body["summary"]["valid"] == 0
    assert "email" in body["rows"][0]["errors"][0].lower()


async def test_preview_duplicate_against_existing_customer(client: AsyncClient) -> None:
    token, tenant_id = await _register(client, "dup-existing-owner@example.com", "Dup Co")
    created = await client.post(
        "/api/v1/customers",
        json={"name": "Carlos", "email": "carlos@example.com", "phone": "+54 11 5555-1234"},
        headers=_headers(token, tenant_id),
    )
    assert created.status_code == 201

    rows = [{"name": "Carlos Nuevo", "email": "carlos@example.com"}]
    response = await client.post(
        "/api/v1/imports/customers/preview",
        files={"file": ("dup.csv", io.BytesIO(_build_csv(rows)), "text/csv")},
        headers=_headers(token, tenant_id),
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["summary"]["duplicates"] == 1
    assert body["summary"]["valid"] == 0
    assert body["rows"][0]["duplicate"] is True


async def test_preview_duplicate_within_file(client: AsyncClient) -> None:
    token, tenant_id = await _register(client, "dup-file-owner@example.com", "Dup File Co")
    rows = [
        {"name": "Primero", "email": "shared@example.com"},
        {"name": "Segundo", "email": "shared@example.com"},
    ]

    response = await client.post(
        "/api/v1/imports/customers/preview",
        files={"file": ("dup.csv", io.BytesIO(_build_csv(rows)), "text/csv")},
        headers=_headers(token, tenant_id),
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["summary"] == {"total": 2, "valid": 1, "invalid": 0, "duplicates": 1}
    valid_rows = [row for row in body["rows"] if not row["duplicate"]]
    duplicate_rows = [row for row in body["rows"] if row["duplicate"]]
    assert len(valid_rows) == 1
    assert len(duplicate_rows) == 1


async def test_preview_row_limit(client: AsyncClient) -> None:
    token, tenant_id = await _register(client, "limit-owner@example.com", "Limit Co")
    rows = [{"name": f"Cliente {i}"} for i in range(501)]

    response = await client.post(
        "/api/v1/imports/customers/preview",
        files={"file": ("big.csv", io.BytesIO(_build_csv(rows)), "text/csv")},
        headers=_headers(token, tenant_id),
    )
    assert response.status_code == 413


async def test_commit_idempotent(client: AsyncClient) -> None:
    token, tenant_id = await _register(client, "idempotent-owner@example.com", "Idem Co")
    rows = [{"name": "Unico", "email": "unico@example.com"}]

    preview = await client.post(
        "/api/v1/imports/customers/preview",
        files={"file": ("clients.csv", io.BytesIO(_build_csv(rows)), "text/csv")},
        headers=_headers(token, tenant_id),
    )
    assert preview.status_code == 200
    job_id = preview.json()["job_id"]

    first = await client.post(
        "/api/v1/imports/customers/commit",
        json={"job_id": job_id},
        headers=_headers(token, tenant_id),
    )
    assert first.status_code == 200
    assert first.json()["created"] == 1

    second = await client.post(
        "/api/v1/imports/customers/commit",
        json={"job_id": job_id},
        headers=_headers(token, tenant_id),
    )
    assert second.status_code == 200
    assert second.json() == first.json()

    listed = await client.get("/api/v1/customers", headers=_headers(token, tenant_id))
    assert listed.json()["total"] == 1


async def test_commit_isolation_between_tenants(client: AsyncClient) -> None:
    token_a, tenant_a = await _register(client, "iso-a@example.com", "Empresa A")
    token_b, tenant_b = await _register(client, "iso-b@example.com", "Empresa B")

    preview = await client.post(
        "/api/v1/imports/customers/preview",
        files={"file": ("clients.csv", io.BytesIO(_build_csv([{"name": "A"}])), "text/csv")},
        headers=_headers(token_a, tenant_a),
    )
    assert preview.status_code == 200
    job_id = preview.json()["job_id"]

    commit = await client.post(
        "/api/v1/imports/customers/commit",
        json={"job_id": job_id},
        headers=_headers(token_b, tenant_b),
    )
    assert commit.status_code == 404

    errors_csv = await client.get(
        f"/api/v1/imports/{job_id}/errors.csv",
        headers=_headers(token_b, tenant_b),
    )
    assert errors_csv.status_code == 404


async def test_technician_and_viewer_cannot_import(client: AsyncClient) -> None:
    owner_token, tenant_id = await _register(client, "perm-owner@example.com", "Perm Co")
    tech_token = await _invite_and_login(
        client, owner_token, tenant_id, "tech@example.com", "technician"
    )
    viewer_token = await _invite_and_login(
        client, owner_token, tenant_id, "viewer@example.com", "viewer"
    )

    file_payload = {"file": ("clients.csv", io.BytesIO(_build_csv([{"name": "X"}])), "text/csv")}

    tech_response = await client.post(
        "/api/v1/imports/customers/preview",
        files=file_payload,
        headers=_headers(tech_token, tenant_id),
    )
    assert tech_response.status_code == 403

    viewer_response = await client.post(
        "/api/v1/imports/customers/preview",
        files=file_payload,
        headers=_headers(viewer_token, tenant_id),
    )
    assert viewer_response.status_code == 403


async def test_errors_csv_download(client: AsyncClient) -> None:
    token, tenant_id = await _register(client, "errors-owner@example.com", "Errors Co")
    rows = [
        {"name": "Valido", "email": "valido@example.com"},
        {"name": "Invalido", "email": "mal"},
    ]

    preview = await client.post(
        "/api/v1/imports/customers/preview",
        files={"file": ("clients.csv", io.BytesIO(_build_csv(rows)), "text/csv")},
        headers=_headers(token, tenant_id),
    )
    assert preview.status_code == 200
    job_id = preview.json()["job_id"]

    response = await client.get(
        f"/api/v1/imports/{job_id}/errors.csv",
        headers=_headers(token, tenant_id),
    )
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    content = response.content.decode("utf-8-sig")
    assert "line,data,errors" in content
    assert "Invalido" in content
    assert "Email inválido" in content


async def test_preview_rejects_csv_with_zip_magic(client: AsyncClient) -> None:
    token, tenant_id = await _register(client, "magic-csv@example.com", "Magic CSV")
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w") as archive:
        archive.writestr("sheet.xml", "<xml/>")

    response = await client.post(
        "/api/v1/imports/customers/preview",
        files={"file": ("fake.csv", zip_buffer, "text/csv")},
        headers=_headers(token, tenant_id),
    )
    assert response.status_code == 422, response.text


async def test_preview_rejects_xlsx_without_pk_magic(client: AsyncClient) -> None:
    token, tenant_id = await _register(client, "magic-xlsx@example.com", "Magic XLSX")
    response = await client.post(
        "/api/v1/imports/customers/preview",
        files={"file": ("fake.xlsx", io.BytesIO(b"not a zip file"), "text/csv")},
        headers=_headers(token, tenant_id),
    )
    assert response.status_code == 422, response.text


def _build_zip_bytes_with_oversized_entry() -> bytes:
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("xl/worksheets/sheet1.xml", b"0" * (_MAX_XLSX_UNCOMPRESSED_BYTES + 1))
    return output.getvalue()


def _build_zip_bomb_bytes() -> bytes:
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("xl/worksheets/sheet1.xml", b"0" * (5 * 1024 * 1024))
    return output.getvalue()


async def test_preview_rejects_xlsx_with_oversized_uncompressed(client: AsyncClient) -> None:
    token, tenant_id = await _register(client, "big-xlsx@example.com", "Big XLSX")
    response = await client.post(
        "/api/v1/imports/customers/preview",
        files={
            "file": (
                "big.xlsx",
                io.BytesIO(_build_zip_bytes_with_oversized_entry()),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        },
        headers=_headers(token, tenant_id),
    )
    assert response.status_code == 413, response.text


async def test_preview_rejects_xlsx_zip_bomb_ratio(client: AsyncClient) -> None:
    token, tenant_id = await _register(client, "bomb-xlsx@example.com", "Bomb XLSX")
    response = await client.post(
        "/api/v1/imports/customers/preview",
        files={
            "file": (
                "bomb.xlsx",
                io.BytesIO(_build_zip_bomb_bytes()),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        },
        headers=_headers(token, tenant_id),
    )
    assert response.status_code == 413, response.text


async def test_preview_xlsx_cuts_at_row_501(client: AsyncClient) -> None:
    token, tenant_id = await _register(client, "rows-xlsx@example.com", "Rows XLSX")
    rows = [{"name": f"Cliente {i}"} for i in range(501)]

    response = await client.post(
        "/api/v1/imports/customers/preview",
        files={
            "file": (
                "rows.xlsx",
                io.BytesIO(_build_xlsx(rows)),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        },
        headers=_headers(token, tenant_id),
    )
    assert response.status_code == 413, response.text


async def test_preview_preserves_original_values(client: AsyncClient) -> None:
    token, tenant_id = await _register(client, "formula-owner@example.com", "Formula Co")
    rows = [{"name": "=cmd|' /C calc'!A0", "phone": "+54 11 5555-1234"}]

    response = await client.post(
        "/api/v1/imports/customers/preview",
        files={"file": ("formula.csv", io.BytesIO(_build_csv(rows)), "text/csv")},
        headers=_headers(token, tenant_id),
    )
    assert response.status_code == 200, response.text
    preview_rows = response.json()["rows"]
    assert preview_rows[0]["data"]["name"] == "=cmd|' /C calc'!A0"
    assert preview_rows[0]["data"]["phone"] == "+54 11 5555-1234"


async def test_imported_phone_persists_exactly(client: AsyncClient) -> None:
    token, tenant_id = await _register(client, "phone-owner@example.com", "Phone Co")
    rows = [{"name": "Carlos", "phone": "+54 11 4000-9001"}]

    preview = await client.post(
        "/api/v1/imports/customers/preview",
        files={"file": ("clients.csv", io.BytesIO(_build_csv(rows)), "text/csv")},
        headers=_headers(token, tenant_id),
    )
    assert preview.status_code == 200, preview.text
    job_id = preview.json()["job_id"]

    commit = await client.post(
        "/api/v1/imports/customers/commit",
        json={"job_id": job_id},
        headers=_headers(token, tenant_id),
    )
    assert commit.status_code == 200, commit.text
    assert commit.json()["created"] == 1

    listed = await client.get("/api/v1/customers", headers=_headers(token, tenant_id))
    assert listed.status_code == 200
    customer = listed.json()["items"][0]
    assert customer["phone"] == "+54 11 4000-9001"
    assert customer["name"] == "Carlos"


async def test_errors_csv_neutralizes_formula_fields(client: AsyncClient) -> None:
    token, tenant_id = await _register(client, "csv-formula-owner@example.com", "CSV Formula Co")
    rows = [
        {"name": "=cmd|' /C calc'!A0", "phone": "+54 11 5555-1234", "email": "mal"},
        {"name": "@mention", "email": "no-es-un-email"},
    ]

    preview = await client.post(
        "/api/v1/imports/customers/preview",
        files={"file": ("formula.csv", io.BytesIO(_build_csv(rows)), "text/csv")},
        headers=_headers(token, tenant_id),
    )
    assert preview.status_code == 200, preview.text
    job_id = preview.json()["job_id"]

    response = await client.get(
        f"/api/v1/imports/{job_id}/errors.csv",
        headers=_headers(token, tenant_id),
    )
    assert response.status_code == 200
    content = response.content.decode("utf-8-sig")
    assert "'=cmd|' /C calc'!A0" in content
    assert "'+54 11 5555-1234" in content
    assert "'@mention" in content


async def test_errors_csv_filename_is_sanitized(client: AsyncClient) -> None:
    token, tenant_id = await _register(client, "name-owner@example.com", "Name Co")
    rows = [{"name": "Invalido", "email": "mal"}]
    unsafe_name = 'foo"bar\r\n.csv'

    preview = await client.post(
        "/api/v1/imports/customers/preview",
        files={"file": (unsafe_name, io.BytesIO(_build_csv(rows)), "text/csv")},
        headers=_headers(token, tenant_id),
    )
    assert preview.status_code == 200
    job_id = preview.json()["job_id"]

    response = await client.get(
        f"/api/v1/imports/{job_id}/errors.csv",
        headers=_headers(token, tenant_id),
    )
    assert response.status_code == 200
    disposition = response.headers.get("content-disposition", "")
    assert '"' not in disposition
    assert "\r" not in disposition
    assert "\n" not in disposition
    assert "errors_" in disposition


async def test_commit_skips_duplicate_created_after_preview(client: AsyncClient) -> None:
    token, tenant_id = await _register(client, "race-owner@example.com", "Race Co")
    rows = [{"name": "Carlos", "email": "carlos@example.com"}]

    preview = await client.post(
        "/api/v1/imports/customers/preview",
        files={"file": ("clients.csv", io.BytesIO(_build_csv(rows)), "text/csv")},
        headers=_headers(token, tenant_id),
    )
    assert preview.status_code == 200
    job_id = preview.json()["job_id"]

    created = await client.post(
        "/api/v1/customers",
        json={"name": "Carlos", "email": "carlos@example.com"},
        headers=_headers(token, tenant_id),
    )
    assert created.status_code == 201

    commit = await client.post(
        "/api/v1/imports/customers/commit",
        json={"job_id": job_id},
        headers=_headers(token, tenant_id),
    )
    assert commit.status_code == 200, commit.text
    assert commit.json() == {"created": 0, "skipped_duplicates": 1, "skipped_invalid": 0}

    listed = await client.get("/api/v1/customers", headers=_headers(token, tenant_id))
    assert listed.json()["total"] == 1


async def test_commit_and_errors_csv_forbidden_to_technician_and_viewer(
    client: AsyncClient,
) -> None:
    owner_token, tenant_id = await _register(client, "perm2-owner@example.com", "Perm2 Co")
    tech_token = await _invite_and_login(
        client, owner_token, tenant_id, "tech2@example.com", "technician"
    )
    viewer_token = await _invite_and_login(
        client, owner_token, tenant_id, "viewer2@example.com", "viewer"
    )

    preview = await client.post(
        "/api/v1/imports/customers/preview",
        files={"file": ("clients.csv", io.BytesIO(_build_csv([{"name": "X"}])), "text/csv")},
        headers=_headers(owner_token, tenant_id),
    )
    assert preview.status_code == 200
    job_id = preview.json()["job_id"]

    for forbidden_token in (tech_token, viewer_token):
        commit_response = await client.post(
            "/api/v1/imports/customers/commit",
            json={"job_id": job_id},
            headers=_headers(forbidden_token, tenant_id),
        )
        assert commit_response.status_code == 403

        errors_response = await client.get(
            f"/api/v1/imports/{job_id}/errors.csv",
            headers=_headers(forbidden_token, tenant_id),
        )
        assert errors_response.status_code == 403


async def test_dispatcher_can_preview_and_commit(client: AsyncClient) -> None:
    owner_token, tenant_id = await _register(client, "disp-owner@example.com", "Disp Co")
    dispatcher_token = await _invite_and_login(
        client, owner_token, tenant_id, "dispatcher@example.com", "dispatcher"
    )
    rows = [{"name": "Cliente", "email": "cliente@example.com"}]

    preview = await client.post(
        "/api/v1/imports/customers/preview",
        files={"file": ("clients.csv", io.BytesIO(_build_csv(rows)), "text/csv")},
        headers=_headers(dispatcher_token, tenant_id),
    )
    assert preview.status_code == 200, preview.text

    commit = await client.post(
        "/api/v1/imports/customers/commit",
        json={"job_id": preview.json()["job_id"]},
        headers=_headers(dispatcher_token, tenant_id),
    )
    assert commit.status_code == 200, commit.text
    assert commit.json()["created"] == 1


async def test_commit_serializes_imports_by_tenant(client: AsyncClient) -> None:
    token, tenant_id = await _register(client, "serial-owner@example.com", "Serial Co")
    rows = [{"name": "Carlos", "email": "carlos@example.com"}]

    preview1 = await client.post(
        "/api/v1/imports/customers/preview",
        files={"file": ("job1.csv", io.BytesIO(_build_csv(rows)), "text/csv")},
        headers=_headers(token, tenant_id),
    )
    assert preview1.status_code == 200, preview1.text

    preview2 = await client.post(
        "/api/v1/imports/customers/preview",
        files={"file": ("job2.csv", io.BytesIO(_build_csv(rows)), "text/csv")},
        headers=_headers(token, tenant_id),
    )
    assert preview2.status_code == 200, preview2.text

    commit1 = await client.post(
        "/api/v1/imports/customers/commit",
        json={"job_id": preview1.json()["job_id"]},
        headers=_headers(token, tenant_id),
    )
    assert commit1.status_code == 200, commit1.text
    assert commit1.json() == {"created": 1, "skipped_duplicates": 0, "skipped_invalid": 0}

    commit2 = await client.post(
        "/api/v1/imports/customers/commit",
        json={"job_id": preview2.json()["job_id"]},
        headers=_headers(token, tenant_id),
    )
    assert commit2.status_code == 200, commit2.text
    assert commit2.json() == {"created": 0, "skipped_duplicates": 1, "skipped_invalid": 0}

    listed = await client.get("/api/v1/customers", headers=_headers(token, tenant_id))
    assert listed.json()["total"] == 1
