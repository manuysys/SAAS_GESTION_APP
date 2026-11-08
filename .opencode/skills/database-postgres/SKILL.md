---
name: Database PostgreSQL
description: Convenciones de esquema, migraciones, índices y aislamiento en PostgreSQL
---

# Database PostgreSQL

## Convenciones

- PK UUID; `timestamptz` UTC; `NUMERIC(14,2)` para dinero.
- `tenant_id` en toda entidad de negocio.
- Índices compuestos que empiezan por `tenant_id`.
- Únicos por tenant, no globales.
- `deleted_at` para borrado lógico cuando aplique.
- FK explícitas; evaluar FK compuestas `(tenant_id, id)`.
- No cascadas indiscriminadas.

## Migraciones

```powershell
cd apps/api
uv run alembic revision --autogenerate -m "descripcion"
uv run alembic upgrade head
uv run alembic downgrade -1
```

Revisar siempre el SQL autogenerado. Probar en base limpia y en base con datos.

## Aislamiento

- Filtro de aplicación obligatorio.
- RLS como defensa en profundidad:
  `USING (tenant_id = current_setting('app.tenant_id')::uuid)`.
- Tests con dos tenants sembrados.

## Performance

- `EXPLAIN ANALYZE` para consultas lentas.
- Evitar N+1; usar `selectinload`/`joinedload` conscientemente.
- Índices para filtros y ordenamientos frecuentes.
- Paginación por cursor en listados grandes.
