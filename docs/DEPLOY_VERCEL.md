# Despliegue en Vercel + Neon

## Arquitectura

```text
Vercel (Next.js)  ──HTTPS──>  Vercel (FastAPI serverless)  ──SSL──>  Neon PostgreSQL
```

- Frontend: proyecto Vercel con root `apps/web`.
- Backend: proyecto Vercel con root `apps/api` y `api/index.py` usando Mangum.
- Base de datos: Neon (PostgreSQL administrado) o cualquier PostgreSQL con SSL.

No usar SQLite en Vercel: el filesystem es efímero y de solo lectura.

## 1. Crear la base en Neon

1. Crear un proyecto en https://neon.tech.
2. Copiar dos cadenas de conexión:
   - **Directa** (sin `-pooler`) para migraciones.
   - **Pooled** o directa para la API.
3. Para migraciones, usar la directa con `sslmode=require`:

```text
postgresql://usuario:password@ep-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

4. Para la API, usar el driver asyncpg y SSL:

```text
postgresql+asyncpg://usuario:password@ep-xxxx.us-east-2.aws.neon.tech/neondb?ssl=require
```

Si se usa el pooler de Neon en modo transaction, agregar
`statement_cache_size=0` a los `connect_args` o usar la conexión directa.

## 2. Aplicar migraciones

Desde la máquina local:

```powershell
$env:DATABASE_URL_SYNC="postgresql+psycopg://usuario:password@host/db?sslmode=require"
cd apps/api
uv run alembic upgrade head
```

Verificar que las tablas existan antes de desplegar la API.

## 3. Desplegar la API en Vercel

```powershell
cd apps/api
vercel login
vercel link
```

Crear las variables de producción:

```text
APP_ENV=production
APP_DEBUG=false
DATABASE_URL=postgresql+asyncpg://...?ssl=require
JWT_SECRET=<secreto-de-32+ bytes>
API_CORS_ORIGINS=["https://<tu-frontend>.vercel.app"]
COOKIE_SECURE=true
COOKIE_SAMESITE=none
```

Comandos:

```powershell
vercel env add APP_ENV production
vercel env add APP_DEBUG production
vercel env add DATABASE_URL production
vercel env add JWT_SECRET production
vercel env add API_CORS_ORIGINS production
vercel env add COOKIE_SECURE production
vercel env add COOKIE_SAMESITE production
vercel --prod
```

Anotar la URL resultante, por ejemplo:

```text
https://saas-gestion-api.vercel.app
```

Probar:

```text
https://saas-gestion-api.vercel.app/api/v1/health/live
```

## 4. Desplegar el frontend en Vercel

```powershell
cd apps/web
vercel link
vercel env add NEXT_PUBLIC_API_URL production
# valor: https://saas-gestion-api.vercel.app
vercel --prod
```

La URL del frontend será algo como:

```text
https://saas-gestion-web.vercel.app
```

## 5. Ajustar CORS y cookies

El frontend y la API quedan en dominios distintos (`*.vercel.app`). Por eso:

- `API_CORS_ORIGINS` debe incluir exactamente el origen del frontend.
- La cookie de refresh debe ser `SameSite=None; Secure`.
- `COOKIE_SECURE=true` y `COOKIE_SAMESITE=none`.

Si se usa un dominio propio para ambos (por ejemplo `app.midominio.com` y
`api.midominio.com`), se puede volver a `SameSite=Lax` si son same-site.

## 6. Verificación

1. Abrir la URL del frontend.
2. Registrarse y crear una empresa.
3. Crear cliente, solicitud, orden, presupuesto y turno.
4. Verificar el link público del presupuesto.
5. Revisar logs de la función en Vercel si hay errores 500.

## Limitaciones del plan gratuito

- La función serverless puede tener cold starts.
- Neon free tier tiene límites de almacenamiento y conexiones.
- Vercel tiene límites de ejecución y ancho de banda.
- Para producción real: backups, monitoreo, rate limiting y dominio propio.

## Variables de entorno de referencia

### API

```text
APP_ENV=production
APP_DEBUG=false
DATABASE_URL=postgresql+asyncpg://...
JWT_SECRET=...
JWT_ALGORITHM=HS256
JWT_ACCESS_TTL_MINUTES=15
JWT_REFRESH_TTL_DAYS=30
API_CORS_ORIGINS=["https://<frontend>.vercel.app"]
COOKIE_SECURE=true
COOKIE_SAMESITE=none
```

### Web

```text
NEXT_PUBLIC_API_URL=https://<api>.vercel.app
```
