---
name: Backend FastAPI
description: Convenciones y comandos para implementar el backend FastAPI con SQLAlchemy, Pydantic y Alembic
---

# Backend FastAPI

## Estructura

```text
apps/api/
  app/
    api/          routers y dependencias
    core/         config, seguridad, errores, logging
    models/       SQLAlchemy 2
    schemas/      Pydantic v2
    services/     reglas de negocio
    repositories/ acceso a datos con tenant
    workers/      tareas y outbox
  migrations/     Alembic
  tests/          unitarias, integración, tenant
```

## Reglas

- Routers delgados; servicios con transacciones; repositorios con `tenant_id`.
- Pydantic para entrada/salida; no exponer modelos SQLAlchemy.
- Dinero `Decimal`; fechas UTC; IDs UUID.
- Errores de dominio con códigos estables.
- No SQL concatenado; no `text()` con input del usuario.
- Tests de aislamiento entre dos tenants para cada módulo.
- Migraciones autogeneradas, revisadas y reversibles.

## Comandos

```powershell
cd apps/api
uv sync
uv run alembic upgrade head
uv run ruff check .
uv run ruff format .
uv run basedpyright
uv run pytest
```

## Checklist de endpoint

- [ ] Autenticación y tenant.
- [ ] Permiso por rol.
- [ ] Validación Pydantic.
- [ ] Servicio con transacción.
- [ ] Repositorio filtrado por tenant.
- [ ] Error consistente.
- [ ] Test feliz, test de error, test de otro tenant.
- [ ] Documentación OpenAPI.
