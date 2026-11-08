# Arquitectura

## Vista general

```text
┌─────────────────────────────┐
│  apps/web — Next.js         │
│  App Router, RSC, Tailwind  │
│  Cliente OpenAPI generado   │
└──────────────┬──────────────┘
               │ HTTPS / JSON
┌──────────────▼──────────────┐
│  apps/api — FastAPI         │
│  Routers → Services → Repos │
│  Auth, RBAC, tenant scope   │
└───────┬───────────┬─────────┘
        │           │
┌───────▼──────┐ ┌──▼─────────────────┐
│ PostgreSQL   │ │ Storage S3-compat. │
│ 17           │ │ (local en dev)     │
└──────────────┘ └────────────────────┘
        │
┌───────▼─────────────────────────────┐
│ Motor de eventos / automatizaciones │
│ Outbox → workers → integraciones    │
└─────────────────────────────────────┘
```

## Backend

Capas:

- `app/api/` — routers HTTP, dependencias, validación de entrada/salida.
- `app/core/` — configuración, seguridad, logging, errores, rate limiting.
- `app/models/` — SQLAlchemy 2 (declarative, tipado).
- `app/schemas/` — Pydantic v2 (request/response).
- `app/services/` — reglas de negocio y transacciones.
- `app/repositories/` — acceso a datos con `tenant_id` obligatorio.
- `app/workers/` — tareas asíncronas y outbox.
- `migrations/` — Alembic.
- `tests/` — unitarias, integración, permisos y aislamiento.

Reglas:

- Los routers no acceden directamente a la base.
- Los servicios reciben el contexto de tenant y usuario.
- Los repositorios nunca aceptan un `tenant_id` proveniente del body.
- Las transacciones se cierran en la capa de servicio.
- Errores de dominio con códigos estables.

## Frontend

- App Router con layouts por área: `(auth)`, `(app)`, `(technician)`.
- Server Components para datos iniciales; Client Components para interactividad.
- Cliente API generado desde OpenAPI; hooks de TanStack Query.
- Formularios con React Hook Form + Zod.
- Tablas con TanStack Table; Kanban con dnd-kit.
- Fechas con date-fns locale `es`; moneda con `Intl.NumberFormat('es-AR')`.
- Componentes accesibles (Radix/shadcn) y diseño responsive.

## Autenticación

- Registro con email verificado (token de un solo uso).
- Contraseñas con Argon2id.
- Access token JWT de 15 minutos; refresh token rotativo de 30 días.
- Refresh token hasheado en base; detección de reutilización.
- Cookies `HttpOnly`, `Secure` en producción, `SameSite=Lax`.
- CSRF: token double-submit para mutaciones si se usan cookies.
- Rate limiting en login, registro, recuperación y refresh.

## Multi-tenancy

- `tenants` y `memberships` (usuario ↔ tenant ↔ rol).
- `tenant_id` en todas las entidades de negocio.
- Repositorios con filtro obligatorio por tenant.
- Pruebas que intentan acceder a recursos de otro tenant y esperan 404/403.
- RLS de PostgreSQL como defensa en profundidad cuando el esquema se estabilice.

## Archivos

- Adaptador `StorageBackend` con implementaciones `LocalStorage` y `S3Storage`.
- Validación de MIME, extensión y tamaño.
- Nombres aleatorios; nunca confiar en el nombre original.
- URLs firmadas de corta duración para descarga.

## IA

- Interfaz `AIProvider` con implementaciones `OllamaProvider` y `OpenAICompatibleProvider`.
- Herramientas del agente con validación de argumentos y tenant.
- Niveles: consulta, preparación, ejecución autorizada, aprobación humana.
- Registro de tokens, costo, modelo, tenant y funcionalidad.
- Nunca SQL libre ni acceso irrestricto a datos.

## Automatizaciones

- Eventos de dominio emitidos por servicios.
- Patrón Transactional Outbox para no perder eventos.
- Worker persistente con reintentos e idempotencia.
- Reglas: trigger, condiciones, acciones, estado, historial.
- n8n solo como orquestador externo opcional.

## Presupuestos

- Entidades `quotes`, `quote_items`, `quote_events`; totales en `Decimal`/`NUMERIC(14,2)`.
- Número `QT-YYYY-0001` único por tenant; token público URL-safe para aprobación externa.
- Estados `draft → sent → approved/rejected`; solo `draft` es editable.
- Envío/aprobación/rechazo actualiza `work_orders.commercial_status`.
- PDF generado con `reportlab` y servido autenticado.
- Endpoints públicos en `/api/v1/public/quotes/{token}` sin autenticación ni IDs internos.

## Observabilidad

- Logs estructurados JSON con `request_id`, `tenant_id`, `user_id`.
- Health checks `/health/live` y `/health/ready`.
- Métricas de latencia, errores y uso de IA.
- Sentry (o equivalente) cuando exista despliegue.

## Despliegue

- Frontend: Vercel o similar.
- API: contenedor en Railway/Fly.io/Render.
- PostgreSQL: Supabase, Neon o instancia administrada.
- Storage: S3-compatible.
- CI: GitHub Actions con PostgreSQL de servicio.
