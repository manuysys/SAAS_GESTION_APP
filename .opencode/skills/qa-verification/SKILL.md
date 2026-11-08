---
name: QA Verification
description: Comandos y criterios para verificar cambios con evidencia real
---

# QA Verification

## Verificación completa

```powershell
.\scripts\verify.ps1
```

## Backend

```powershell
cd apps/api
uv run ruff check .
uv run ruff format --check .
uv run basedpyright
uv run pytest -q
```

## Frontend

```powershell
cd apps/web
pnpm lint
pnpm typecheck
pnpm test -- --run
pnpm build
```

## E2E

```powershell
cd apps/web
pnpm exec playwright test
```

## Reglas de evidencia

- Reportar comando exacto y salida resumida.
- Si un test falla, mostrar el error real, no un resumen inventado.
- No decir “todo pasa” sin haber ejecutado.
- Si algo no se pudo ejecutar, explicar por qué.
- Para bugs: pasos, esperado, actual, evidencia y severidad.

## Checklist de release

- [ ] Migraciones aplican en base limpia.
- [ ] Tests de aislamiento multi-tenant pasan.
- [ ] Lint y typecheck sin errores.
- [ ] Build de producción.
- [ ] Variables de entorno documentadas.
- [ ] `docs/PROJECT_STATUS.md` actualizado.
