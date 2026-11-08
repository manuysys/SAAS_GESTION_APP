# Despliegue

## Desarrollo local (Windows)

| Componente | Herramienta |
|---|---|
| Node | 24 LTS vía `fnm` |
| Paquetes web | pnpm 12 |
| Python | 3.12 vía `uv` |
| PostgreSQL | 17.11 portable en `.local/postgres`, puerto 55432 |
| Almacenamiento | `.local/uploads` |
| IA | Ollama local (opcional) |

### Arranque

```powershell
.\scripts\db-start.ps1
cd apps/api; uv run alembic upgrade head
cd ../..
.\scripts\dev.ps1
```

## Producción (propuesta inicial)

| Componente | Opción recomendada |
|---|---|
| Frontend | Vercel |
| API | Railway / Fly.io / Render (contenedor Docker) |
| PostgreSQL | Supabase / Neon / instancia administrada |
| Storage | Supabase Storage o S3-compatible |
| CI/CD | GitHub Actions |
| Monitoreo | Sentry + logs del proveedor |
| Dominio | Cloudflare DNS |

No se elige proveedor definitivo hasta validar costos y requisitos.

## Variables de entorno

Ver `.env.example`. En producción:

- `APP_ENV=production`, `APP_DEBUG=false`.
- `JWT_SECRET` de 32+ bytes aleatorios.
- `COOKIE_SECURE=true`.
- `DATABASE_URL` con SSL.
- Secretos en el gestor del proveedor, nunca en el repo.

## Migraciones

```powershell
cd apps/api
uv run alembic revision --autogenerate -m "descripcion"
uv run alembic upgrade head
uv run alembic downgrade -1   # solo en desarrollo
```

Las migraciones se prueban en CI contra PostgreSQL limpio.

## Respaldos

- Backup diario automático de PostgreSQL.
- Retención mínima: 7 diarios, 4 semanales, 3 mensuales.
- Prueba de restauración documentada antes del lanzamiento.
- Backups cifrados y fuera del servidor principal.

## CI mínimo

1. Instalar dependencias.
2. Levantar PostgreSQL de servicio.
3. Ejecutar migraciones.
4. Ruff + BasedPyright + pytest.
5. ESLint + tsc + tests + build.
6. Playwright E2E en flujos críticos.
7. Bloquear merge si falla cualquier paso.

## Rollback

- API: redeploy de la imagen anterior.
- Frontend: rollback de Vercel.
- Base: migración reversible o restauración de backup.
- Documentar cada incidente en `docs/KNOWN_ISSUES.md`.
