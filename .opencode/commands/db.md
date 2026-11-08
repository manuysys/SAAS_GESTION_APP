---
description: Crea y aplica una migracion Alembic de forma segura
---

Trabajo de base de datos: $ARGUMENTS

1. Revisá el modelo actual y `docs/DATA_MODEL.md`.
2. Creá la migración con `uv run alembic revision --autogenerate -m "..."`.
3. Revisá el SQL generado; corregí lo que Alembic no detecte.
4. Aplicá `uv run alembic upgrade head`.
5. Probá `downgrade -1` y volvé a subir.
6. Ejecutá las pruebas de integración y aislamiento.
7. Actualizá `docs/DATA_MODEL.md` si cambió el esquema.

No aplicar migraciones destructivas sin confirmación.
