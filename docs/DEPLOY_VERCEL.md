# Despliegue en Vercel + Neon

## Arquitectura

```text
Vercel (Next.js)  ──HTTPS──>  Vercel (FastAPI)  ──SSL──>  Neon PostgreSQL
```

- Frontend: proyecto Vercel con root `apps/web`.
- Backend: proyecto Vercel con root `apps/api`, preset **FastAPI** y runtime
  Python 3.12. Vercel detecta `app/main.py` y sirve toda la app como una función.
- Base de datos: Neon PostgreSQL (marketplace de Vercel o cuenta directa).

No usar SQLite en Vercel: el filesystem es efímero y de solo lectura.

## 1. Crear la base en Neon

### Opción A — Marketplace de Vercel

```powershell
vercel integration accept-terms neon --yes
cd apps/web
vercel integration add neon --name saas-gestion-db --meta region=gru1 --meta auth=false --json
```

El comando crea el recurso, lo conecta al proyecto web y descarga las variables
`DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `PGHOST`, etc. en `apps/web/.env.local`.
El plan por defecto es Free.

### Opción B — Cuenta directa en Neon

1. Crear un proyecto en https://neon.tech.
2. Copiar la conexión directa (sin `-pooler`) para migraciones.
3. Para la API usar asyncpg con SSL:

```text
postgresql+asyncpg://usuario:password@ep-xxxx.c-2.region.aws.neon.tech/neondb?ssl=require
```

Para migraciones, usar psycopg:

```text
postgresql+psycopg://usuario:password@ep-xxxx.c-2.region.aws.neon.tech/neondb?sslmode=require
```

Si se usa el pooler en modo transaction, agregar `statement_cache_size=0` o usar
la conexión directa. Para el volumen de la demo, la conexión directa alcanza.

## 2. Aplicar migraciones

Desde la máquina local, apuntando a Neon:

```powershell
$env:DATABASE_URL_SYNC="postgresql+psycopg://usuario:password@host/neondb?sslmode=require"
cd apps/api
uv run alembic upgrade head
uv run alembic current
```

Verificar que el head sea `5ffb8399d836` (o el último del repositorio).

## 3. Desplegar la API en Vercel

El proyecto incluye:

- `apps/api/requirements.txt` con dependencias de runtime.
- `apps/api/.python-version` con `3.12`.
- `apps/api/vercel.json` con `maxDuration` y exclusiones de tests/migraciones.

Comandos:

```powershell
cd apps/api
vercel project create saas-gestion-api
vercel link --yes --project saas-gestion-api
vercel project update saas-gestion-api --framework fastapi --yes
```

Variables de producción (mínimas):

```text
APP_ENV=production
APP_DEBUG=false
DATABASE_URL=postgresql+asyncpg://...?ssl=require
DATABASE_URL_SYNC=postgresql+psycopg://...?sslmode=require
JWT_SECRET=<64+ caracteres aleatorios>
API_CORS_ORIGINS=["https://saas-gestion-web.vercel.app"]
COOKIE_SECURE=true
COOKIE_SAMESITE=none
AI_PROVIDER=deterministic
WHATSAPP_ENCRYPTION_KEY=<32 bytes base64>
WHATSAPP_VERIFY_TOKEN=<token aleatorio>
PLATFORM_ADMIN_EMAILS=["fundador@tu-dominio.com"]
RATE_LIMIT_ENABLED=true
```

Comandos:

```powershell
vercel env add APP_ENV production
# repetir con cada variable
vercel --prod --yes
```

La URL de producción queda como:

```text
https://saas-gestion-api.vercel.app
```

Probar:

```text
GET https://saas-gestion-api.vercel.app/api/v1/health/live
GET https://saas-gestion-api.vercel.app/api/v1/health/ready
```

`ready` debe devolver 200 si Neon está accesible.

## 4. Desplegar el frontend en Vercel

```powershell
cd apps/web
vercel link --yes --project saas-gestion-web
vercel env rm NEXT_PUBLIC_API_URL production --yes
"https://saas-gestion-api.vercel.app" | vercel env add NEXT_PUBLIC_API_URL production
vercel --prod --yes
```

La URL del frontend es:

```text
https://saas-gestion-web.vercel.app
```

## 5. Ajustar CORS y cookies

El frontend y la API están en dominios distintos (`*.vercel.app`). Por eso:

- `API_CORS_ORIGINS` debe incluir exactamente el origen del frontend.
- La cookie de refresh debe ser `SameSite=None; Secure`.
- `COOKIE_SECURE=true` y `COOKIE_SAMESITE=none`.

Si se usa un dominio propio para ambos (por ejemplo `app.midominio.com` y
`api.midominio.com`), se puede volver a `SameSite=Lax` si son same-site.

## 6. Verificación

1. Abrir la URL del frontend.
2. Iniciar sesión con el usuario demo.
3. Recargar la página y confirmar que el refresh de sesión funciona.
4. Crear cliente, solicitud, orden, presupuesto y turno.
5. Verificar el link público del presupuesto.
6. Revisar `/api/v1/health/ready` y los logs del proyecto en Vercel.

## Demo local con túnel (alternativa)

Si se quiere mostrar el frontend de Vercel contra una API local:

```powershell
.local\bin\cloudflared.exe tunnel --url http://127.0.0.1:8000 --no-autoupdate --protocol http2
```

Luego configurar `NEXT_PUBLIC_API_URL` con la URL `https://*.trycloudflare.com`,
reiniciar la API con `COOKIE_SECURE=true`, `COOKIE_SAMESITE=none` y el origen del
frontend en `API_CORS_ORIGINS`, y desplegar el frontend.

La URL del túnel rápido cambia al reiniciarlo y no tiene uptime garantizado. La
demo oficial usa la API desplegada en Vercel, no este túnel.

## Limitaciones del plan gratuito

- Neon Free: límites de almacenamiento, conexiones y ventana de restauración.
- Vercel Hobby: cold starts, límites de ejecución y ancho de banda.
- El rate limiting en memoria es por instancia.
- Para producción real: dominio propio, backups verificados, monitoreo, rate
  limiting compartido y revisión legal.

## Variables de entorno de referencia

### API

```text
APP_ENV=production
APP_DEBUG=false
DATABASE_URL=postgresql+asyncpg://...?ssl=require
DATABASE_URL_SYNC=postgresql+psycopg://...?sslmode=require
JWT_SECRET=...
JWT_ALGORITHM=HS256
JWT_ACCESS_TTL_MINUTES=15
JWT_REFRESH_TTL_DAYS=30
API_CORS_ORIGINS=["https://<frontend>.vercel.app"]
COOKIE_SECURE=true
COOKIE_SAMESITE=none
AI_PROVIDER=deterministic
AI_MONTHLY_TOKEN_LIMIT=200000
WHATSAPP_ENCRYPTION_KEY=<clave-aleatoria>
WHATSAPP_API_VERSION=v23.0
WHATSAPP_VERIFY_TOKEN=<token-de-verificacion>
PLATFORM_ADMIN_EMAILS=["fundador@tu-dominio.com"]
RATE_LIMIT_ENABLED=true
RATE_LIMIT_AUTH_PER_MINUTE=10
RATE_LIMIT_PUBLIC_PER_MINUTE=30
```

### Web

```text
NEXT_PUBLIC_API_URL=https://<api>.vercel.app
```
