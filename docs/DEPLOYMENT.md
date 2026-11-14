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

### Migraciones contra Neon

Alembic usa `DATABASE_URL_SYNC` con el driver `psycopg`. El URI de Neon
(`postgresql://...`) se convierte al esquema `postgresql+psycopg://`:

```powershell
$neon = 'postgresql://usuario:clave@host/neondb?sslmode=require'
$env:DATABASE_URL_SYNC = $neon -replace '^postgresql://','postgresql+psycopg://'
cd apps/api
uv run alembic current         # revisar revisión aplicada
uv run alembic upgrade head
uv run alembic current         # debe coincidir con el head
```

La conexión directa de Neon (sin pooler) es la que se usa para migrar.

### Despliegue con Vercel CLI

Desplegar **secuencialmente**, nunca en paralelo (el CLI falla al escribir
`.vercel/project.json` si dos despliegues corren juntos):

```powershell
cd apps/api; vercel --prod --yes    # API primero
cd ..\web;   vercel --prod --yes    # web después
```

Los despliegues toman el árbol de trabajo local, no un commit. Verificar
después de cada uno:

```powershell
curl.exe -s -o NUL -w "%{http_code}" https://saas-gestion-api.vercel.app/api/v1/health/ready
curl.exe -s -o NUL -w "%{http_code}" https://saas-gestion-web.vercel.app/
```

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
## App móvil Android

```powershell
# Iconos de la app (letra D, paleta ink/teal)
.\scripts\generate-mobile-icons.ps1

# Keystore de release (una sola vez; no se commitea)
.\scripts\generate-android-keystore.ps1

# SDK/JDK para builds locales
. .\scripts\android-env.ps1
```

- Detalle de firma, AAB y Play Console: `docs/ANDROID_RELEASE.md`.
- Build local y EAS: `docs/MOBILE_BUILD.md`.
- El APK de `android-apk.yml` usa firma de debug y no es publicable.
- El AAB firmado sale de `.github/workflows/android-release.yml`, que falla si
  faltan los secretos `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`,
  `ANDROID_KEY_ALIAS` y `ANDROID_KEY_PASSWORD`.

## Backups y restauración

- Estrategia, cifrado, retención y prueba de restauración:
  `docs/BACKUP_RESTORE.md`.
- El workflow `.github/workflows/backup.yml` usa el secreto
  `NEON_DATABASE_URL`.
- No restaurar nunca sobre producción durante una prueba.

## Email transaccional

- Configuración de Resend, DNS y verificación de entrega:
  `docs/EMAIL_RESEND.md`.
