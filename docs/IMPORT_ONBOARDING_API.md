# Contrato de importación, onboarding y reset de demo

**Fecha:** 2026-11-11
**Estado:** contrato para implementación del bloque Pilot-ready. No describe
funcionalidad ya desplegada.

## Alcance

- Importador de clientes desde CSV y XLSX.
- Asistente de onboarding de cuatro pasos con progreso guardado.
- Seed versionado y reset del tenant demo `servicios-demo`.

## Importador de clientes

Endpoints autenticados (`Authorization: Bearer` + `X-Tenant-ID`), solo
`owner`, `admin`, `dispatcher`.

`POST /api/v1/imports/customers/preview` — multipart con `file`.

Respuesta `200`:

```json
{
  "job_id": "uuid",
  "headers": ["name", "email", "phone", "address", "city", "province", "postal_code", "notes"],
  "rows": [
    {
      "line": 2,
      "data": {"name": "Carlos Gomez", "email": "carlos@example.com"},
      "errors": [],
      "duplicate": false
    }
  ],
  "summary": {"total": 10, "valid": 8, "invalid": 1, "duplicates": 1}
}
```

Reglas:

- CSV y XLSX. Máximo 500 filas y 2 MB.
- Columna obligatoria: `name`. Email/teléfono opcionales pero con formato válido.
- Duplicado: mismo email o teléfono normalizado ya existente en el tenant, o
  repetido dentro del archivo. Se marca y se salta.
- Se persiste `import_jobs` con `tenant_id`, `status`, `summary`, `rows_json`,
  `errors_json`, `created_by`, timestamps. Migración `d4e5f6a7b8c9` después de
  `c3d4e5f6a7b8`.

`POST /api/v1/imports/customers/commit`

```json
{ "job_id": "uuid" }
```

Respuesta `200`:

```json
{ "created": 8, "skipped_duplicates": 1, "skipped_invalid": 1 }
```

- Idempotente: si el job ya fue aplicado, devuelve el mismo resultado sin
  duplicar clientes.
- Solo filas válidas y no duplicadas.

`GET /api/v1/imports/{job_id}/errors.csv` — descarga CSV con línea, datos y error.

## Onboarding

Columna `tenants.onboarding_state` JSONB nullable. Migración `e5f6a7b8c9d0`
después de `d4e5f6a7b8c9`.

`GET /api/v1/onboarding`

```json
{
  "completed": false,
  "state": {
    "step": 1,
    "company": {"name": "Mi Empresa", "timezone": "America/Argentina/Buenos_Aires", "currency": "ARS"},
    "services": [{"name": "Instalación", "duration_minutes": 60, "price": "15000.00"}],
    "schedule": {"monday": {"start": "09:00", "end": "18:00"}},
    "team_invited": false,
    "first_customer": false
  }
}
```

`PATCH /api/v1/onboarding` — merge parcial del estado. Solo owner/admin.

`POST /api/v1/onboarding/complete` → `{"completed": true}`.

Pasos del asistente:

1. Empresa: nombre, zona horaria y moneda.
2. Servicios y horarios: lista de servicios y franja horaria.
3. Equipo: acceso a invitaciones existente; `team_invited=true` al confirmar.
4. Primeros datos: importar CSV o crear el primer cliente; `first_customer=true`.

## Reset de demo

`POST /api/v1/admin/demo/reset` — solo platform admin. Opera únicamente sobre
`servicios-demo`; no toca otros tenants.

- Seed versionado en `app/seed/demo.py` (o `scripts/seed_demo.py`) con datos de
  demostración no reales: clientes, solicitudes, órdenes, presupuestos, turnos y
  pagos.
- Idempotente: se puede ejecutar varias veces sin duplicar.
- Devuelve conteos por entidad.

## Restricciones

- No modificar rutas ni modelos existentes salvo las columnas nuevas indicadas.
- `Decimal`/`NUMERIC` para dinero. Fechas en UTC.
- Validar tenant y rol en backend en todos los endpoints.
- Tests de aislamiento, idempotencia, validación y permisos.
