# Estado del proyecto

**Última actualización:** 2026-11-08
**Fase:** Hito 2 completo + PWA, automatizaciones, IA determinista, suscripciones,
panel global, esqueleto de WhatsApp y despliegue público 24/7 en Vercel + Neon.

## Resumen

La aplicación corre de punta a punta: registro, login, refresh de sesión,
creación de empresa, aislamiento por tenant, clientes, solicitudes, órdenes de
trabajo, presupuestos con PDF y aprobación pública, agenda, asignación de
técnicos, pagos, dashboard operativo, PWA para técnicos, automatizaciones con
notificaciones, asistente de IA, planes y suscripciones, panel global del SaaS y
configuración de WhatsApp Cloud API.

El frontend y la API están desplegados en Vercel. La base PostgreSQL está en
Neon (plan Free, región `gru1`). La demo ya no depende de una máquina local ni
de un túnel. La marca provisional es **Arreglo** y la landing pública está en
`/`.

## Hecho y verificado

### Entorno

- [x] Repositorio Git inicializado con remoto `origin`.
- [x] `AGENTS.md`, documentación base y `.env.example`.
- [x] OpenCode: agentes, skills, comandos y Context7 MCP.
- [x] Node 24 vía `fnm`, Python 3.12 vía `uv`.
- [x] PostgreSQL 17.11 portable en `127.0.0.1:55432` para desarrollo local.
- [x] PostgreSQL administrado en Neon para la demo pública.
- [x] API FastAPI desplegada en Vercel con runtime Python 3.12.
- [x] CI en GitHub Actions para backend y frontend.
- [x] Scripts de backup, restore y healthcheck.

### Backend

- [x] FastAPI + SQLAlchemy 2 async + Pydantic v2 + Alembic.
- [x] Modelos: `tenants`, `users`, `memberships`, `refresh_tokens`, `customers`,
  `service_requests`, `work_orders`, `work_order_events`, `work_order_materials`,
  `work_order_attachments`, `quotes`, `quote_items`, `quote_events`,
  `appointments`, `payments`, `automation_rules`, `automation_executions`,
  `notifications`, `ai_usage_logs`, `plans`, `subscriptions`, `whatsapp_configs`
  y `whatsapp_messages`.
- [x] Migraciones: `84e62c6788cb`, `ba3b1d3acd4d`, `50e8c050aada`,
  `de0e021aa0ca`, `51fc582e7593` y `5ffb8399d836`.
- [x] Auth: registro, login, refresh rotativo, logout, `/me`.
- [x] Argon2id, JWT de acceso, cookies `HttpOnly`.
- [x] Multi-tenancy por `X-Tenant-ID` validado contra membresía.
- [x] Clientes, solicitudes, órdenes, transiciones y auditoría.
- [x] Presupuestos con `Decimal`, ítems históricos, PDF y token público.
- [x] Agenda, conflictos, reprogramación y asignación de técnicos.
- [x] Pagos manuales, parciales, anulación y recálculo de estado.
- [x] Dashboard summary.
- [x] PWA de técnicos: órdenes asignadas, transiciones, notas, materiales y
  fotos con validación de tipo/tamaño.
- [x] Automatizaciones: reglas por evento, condiciones, acciones `notify` y
  `notify_user`, ejecuciones idempotentes e historial. `send_whatsapp` queda
  `skipped` hasta configurar credenciales.
- [x] Notificaciones in-app con lectura individual y masiva.
- [x] Asistente de IA: proveedor determinista local, Groq/OpenAI-compatible y
  Ollama opcionales, cuotas y registro de uso.
- [x] Groq configurado en producción con `openai/gpt-oss-120b` y fallback
  determinista si se agota la cuota externa.
- [x] Planes, suscripción con precio histórico, uso y límites.
- [x] Panel global: métricas agregadas, empresas y cambio de suscripción.
- [x] WhatsApp Cloud API: configuración cifrada, webhook con firma HMAC,
  idempotencia y envío de texto. Sin credenciales reales no está probado
  end-to-end.
- [x] Rate limiting compartido en PostgreSQL con fallback en memoria.
- [x] Lockout de login por email/IP y revocación de familia de refresh tokens.
- [x] Auditoría de auth, admin, presupuestos y pagos en `audit_logs`.
- [x] Validación de `Origin` en endpoints con cookie.
- [x] Request ID, logs estructurados y `TrustedHostMiddleware`.
- [x] `/docs`, `/redoc` y `/openapi.json` ocultos en producción.
- [x] Cabeceras de seguridad HTTP.
- [x] Health checks `/api/v1/health/live` y `/ready`.
- [x] 83 pruebas pytest.

### Frontend

- [x] Next.js 16.4.5 + React 19 + TypeScript estricto + Tailwind 4.
- [x] Landing pública de producto con marca provisional **Arreglo**.
- [x] Hero oscuro full-bleed con Three.js isométrico lazy, scanlines, tarjetas
  flotantes y contadores.
- [x] GSAP ScrollTrigger con recorrido fijado, Lenis smooth scroll, marquee,
  tilt 3D y Motion para microinteracciones.
- [x] Design system inicial: Button, Card, Badge, Input, PageHeader, EmptyState,
  Skeleton, StatCard, ProgressRing, Dialog, Tabs, Tooltip y DropdownMenu.
- [x] Panel con command palette (`⌘K`), notificaciones en popover y dashboard
  renovado con hero oscuro, anillos de salud operativa y actividad reciente.
- [x] Clientes con búsqueda, avatares, estados y confirmación de archivado.
- [x] Órdenes con vista de tablero por estado y vista de tabla.
- [x] Presupuestos con métricas, filtros por estado y tabla renovada.
- [x] Pagos con métricas de total, cantidad y ticket promedio.
- [x] Agenda con cabecera de día, timeline y estados.
- [x] Solicitudes con métricas, prioridad, origen y conversión a orden.
- [x] Registro, login y cierre de sesión con identidad Arreglo.
- [x] Contexto de autenticación con refresh automático y selector de empresa.
- [x] Dashboard con métricas reales.
- [x] Clientes, solicitudes, órdenes y detalle con historial.
- [x] Presupuestos, PDF y página pública `/q/[token]` rediseñada.
- [x] Agenda, pagos y asignación de técnicos.
- [x] PWA `/tech` y `/tech/orders/[id]` con manifest, service worker y offline.
- [x] Filtros por estado en la PWA del técnico.
- [x] Automatizaciones y notificaciones con campana y contador.
- [x] Asistente `/assistant` con preguntas rápidas y estado honesto del proveedor.
- [x] Facturación `/settings/billing` con plan, uso y cambio de plan.
- [x] Panel global `/admin` para platform admins.
- [x] WhatsApp `/settings/whatsapp` con configuración, mensajes y envío.
- [x] Navegación por rol; técnicos usan su propio shell.
- [x] Cliente API tipado, TanStack Query, React Hook Form + Zod.
- [x] Vitest con 70 pruebas.

### Verificación ejecutada

```text
ruff check          -> All checks passed
ruff format --check -> 119 files already formatted
basedpyright        -> 0 errors, 0 warnings, 0 notes
pytest              -> 83 passed
pnpm lint           -> sin errores
pnpm typecheck      -> sin errores
pnpm test           -> 70 passed
pnpm build          -> 27 rutas generadas
```

Flujo probado en navegador contra Vercel + Neon: registro, clientes, solicitud,
orden, presupuesto, aprobación pública, agenda, pago y dashboard. También se
verificó que la aprobación pública dispara una automatización y crea una
notificación in-app.

### Verificación del despliegue 24/7

```text
GET https://saas-gestion-api.vercel.app/api/v1/health/live  -> 200
GET https://saas-gestion-api.vercel.app/api/v1/health/ready -> 200
GET https://saas-gestion-api.vercel.app/docs                -> 404
GET https://saas-gestion-api.vercel.app/openapi.json        -> 404
POST /api/v1/auth/login (demo)                              -> 200 + X-Request-ID
GET /api/v1/quotes/{id}/pdf                                 -> 200 application/pdf
GET /api/v1/plans                                           -> 3 planes
GET /api/v1/subscription                                    -> Professional active
GET /api/v1/admin/metrics (fundador)                        -> 200
SELECT count(*) FROM audit_logs                             -> 1
SELECT count(*) FROM rate_limit_buckets                     -> 1
SELECT count(*) FROM auth_attempts                          -> 1
```

El refresh de sesión cross-site se verificó recargando el dashboard después del
login. El asistente determinista devolvió `QT-2026-0002` con datos reales de
Neon.

## Demo pública

- Frontend: https://saas-gestion-web.vercel.app
- API: https://saas-gestion-api.vercel.app
- Base de datos: Neon PostgreSQL (`gru1`, plan Free).
- Admin demo: `demo@saasgestion.com` / `Demo12345!`.
- Técnico demo: `tecnico@saasgestion.com` / `Tecnico12345!`.

Ver `docs/DEMO.md`. La demo ya no depende de esta máquina. Limitación: el plan
Free de Neon y el plan Hobby de Vercel tienen límites de uso y cold starts.

## Pendiente

- [ ] WhatsApp end-to-end con número y credenciales de Meta.
- [ ] Cobros reales con Mercado Pago y webhooks.
- [ ] Proveedor de IA externo con API key (o Ollama local en producción).
- [ ] Enforcement completo de límites por plan en todos los endpoints.
- [ ] Recordatorios automáticos programados (cron/worker).
- [ ] Correo electrónico transaccional.
- [ ] Entrevistas a clientes.
- [ ] Dominio propio, política de privacidad y revisión legal.
- [ ] Backups verificados y plan de restauración de Neon.

## Próximo paso concreto

1. Configurar un dominio propio y HTTPS para el frontend y la API.
2. Probar WhatsApp y Mercado Pago con credenciales reales en sandbox.
3. Implementar enforcement de límites y recordatorios programados.
4. Verificar backups/restauración de Neon y monitoreo de errores.

## Limitaciones conocidas

- Neon Free y Vercel Hobby tienen límites de almacenamiento, conexiones y
  ejecución; no son un entorno productivo con SLA.
- Sin credenciales de Meta, Mercado Pago ni proveedores de IA externos.
- El rate limiting usa PostgreSQL con fallback en memoria; para varias instancias
  conviene Redis/Upstash o el WAF del proveedor.
- Las fotos de técnicos se guardan como `BYTEA` en PostgreSQL; migrar a S3 en
  producción.
- El asistente determinista responde intenciones predefinidas; no es un LLM.
- `send_whatsapp` en automatizaciones queda `skipped` hasta configurar WhatsApp.
- La suscripción se crea en modo `trialing`, pero todavía no se cobra.
- Los cold starts de Vercel pueden agregar latencia a la primera request.
- Falta RLS, 2FA y recuperación de contraseña con email.
