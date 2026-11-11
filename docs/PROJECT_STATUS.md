# Estado del proyecto

**Última actualización:** 2026-11-10
**Fase:** Hito 2 completo + PWA, app móvil Android DOVEXO, portal del cliente,
dashboard operativo, automatizaciones, IA con Groq, suscripciones, panel global,
WhatsApp y preparación para pilotos reales.

## Resumen

La aplicación corre de punta a punta: registro, login, refresh de sesión,
creación de empresa, aislamiento por tenant, clientes, solicitudes, órdenes de
trabajo, presupuestos con PDF y aprobación pública, agenda, asignación de
técnicos, pagos, dashboard operativo, PWA para técnicos, app móvil Android
DOVEXO para técnicos y clientes, portal del cliente, invitaciones de equipo,
automatizaciones con notificaciones, asistente de IA, planes y suscripciones,
panel global del SaaS y configuración de WhatsApp Cloud API.

El frontend y la API están desplegados en Vercel. La base PostgreSQL está en
Neon (plan Free, región `gru1`). La demo ya no depende de una máquina local ni
de un túnel. La empresa es **ARVOKTA** y el producto **DOVEXO**; el dominio
propio está pendiente.

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
  `notifications`, `ai_usage_logs`, `plans`, `subscriptions`, `whatsapp_configs`,
  `whatsapp_messages`, `customer_access_tokens`, `device_tokens`,
  `email_deliveries`, `invitations` y `portal_settings` en `tenants`.
- [x] Migraciones: `84e62c6788cb`, `ba3b1d3acd4d`, `50e8c050aada`,
  `de0e021aa0ca`, `51fc582e7593`, `5ffb8399d836`, `c0cc7ae032ee`,
  `76aba18b0e16`, `a1b2c3d4e5f6`, `b2c3d4e5f6a7` y `c3d4e5f6a7b8` (aplicadas en
  Neon).
- [x] Auth: registro, login, refresh rotativo, logout, `/me`.
- [x] Argon2id, JWT de acceso, cookies `HttpOnly`.
- [x] Multi-tenancy por `X-Tenant-ID` validado contra membresía.
- [x] Clientes, solicitudes, órdenes, transiciones y auditoría.
- [x] Presupuestos con `Decimal`, ítems históricos, PDF y token público.
- [x] Revocación del enlace público de presupuesto y rate limit en aprobación.
- [x] Límite de órdenes por mes del plan aplicado en creación y conversión.
- [x] Agenda, conflictos, reprogramación y asignación de técnicos.
- [x] Pagos manuales, parciales, anulación y recálculo de estado.
- [x] Dashboard summary y dashboard operativo (`/dashboard/operations`):
  turnos de hoy, órdenes atrasadas, sin técnico, presupuestos por vencer y
  trabajos finalizados con saldo.
- [x] PWA de técnicos: órdenes asignadas, transiciones, notas, materiales y
  fotos con validación de tipo/tamaño.
- [x] Auth móvil para técnicos: login, refresh rotativo y logout sin cookies.
- [x] Invitaciones de equipo con token hasheado, expiración, reenvío, revocación
  y aceptación; límites de usuarios/técnicos con lock.
- [x] Email transaccional con proveedor `console` y Resend opcional; registro de
  envíos e idempotencia. Sin dominio verificado no hay entrega productiva.
- [x] Portal del cliente: acceso seguro generado desde la ficha del cliente,
  envío por email o enlace copiable, token hasheado, revocación, resumen,
  solicitudes, órdenes, turnos, presupuestos, pagos y aprobación/rechazo.
- [x] `dev_token` deshabilitado en producción.
- [x] Revocación de sesión de portal por versión: revocar o regenerar el acceso
  invalida los JWT de portal ya emitidos.
- [x] Consumo atómico del token de portal (un solo uso ante verificaciones
  concurrentes).
- [x] Escape HTML de nombres y enlaces en emails transaccionales.
- [x] Reenvío de invitación con idempotencia por token; invitaciones vencidas
  liberan cupo.
- [x] Validación de `Origin` al aceptar invitaciones y `Referrer-Policy:
  no-referrer` en el portal.
- [x] Rate limiting con `X-Real-IP` y último hop de `X-Forwarded-For`.
- [x] Direcciones de cliente expuestas al técnico.
- [x] Push con Expo para asignación y cambio de estado, sin revertir la
  operación si falla el envío.
- [x] Idempotencia móvil con `client_request_id` en notas, materiales y fotos.
- [x] Trial de suscripción de 14 días.
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
- [x] 127 pruebas pytest.

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
- [x] Dashboard con métricas reales y centro de operaciones accionable.
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
- [x] Landing con dataset único de demo (`demo-data.ts`), IDs y estados
  coherentes, 27 tests de integridad y copy honesto.
- [x] Identidad DOVEXO/ARVOKTA en landing, login, panel, PWA y páginas legales.
- [x] Sección Equipo con invitaciones, reenvío, revocación y aceptación pública.
- [x] Detalle de cliente con acceso al portal: enviar por email o copiar enlace.
- [x] Vitest con 130 pruebas.

### App móvil

- [x] Expo SDK 58 + React Native 0.88 + Expo Router + TypeScript estricto.
- [x] Android primero, package `com.arreglo.mobile`, scheme `arreglo`.
- [x] Experiencia de técnico: login, trabajos, filtros, detalle, transiciones,
  llamada, dirección, notas, materiales, fotos, historial y logout.
- [x] Experiencia de cliente: login por email o teléfono, demo, resumen,
  solicitud, órdenes, turnos, presupuestos, pagos y detalle con ítems.
- [x] Cola offline persistente para notas, materiales y fotos con idempotencia.
- [x] Registro de push con Expo, tolerante a fallos.
- [x] Tokens en `expo-secure-store`; refresh rotativo persistido.
- [x] `pnpm exec tsc --noEmit`, `expo export --platform android` y
  `expo-doctor` 20/20.
- [x] APK release arm64 generado en GitHub Actions (release `mobile-apk-5`,
  30.8 MB, identidad DOVEXO).
- [x] AAB firmado con keystore de release generado y verificado en GitHub
  Actions (artifact `dovexo-android-aab`, 36 MB).
- [ ] APK instalado y probado en un dispositivo físico.
- [ ] AAB subido a Google Play y prueba interna.

### Verificación ejecutada

```text
ruff check          -> All checks passed
ruff format --check -> 143 files already formatted
basedpyright        -> 0 errors, 0 warnings, 0 notes
pytest              -> 127 passed
pnpm lint           -> sin errores
pnpm typecheck      -> sin errores
pnpm test           -> 130 passed
pnpm build          -> 27 rutas generadas
expo-doctor         -> 20/20 checks passed
scripts/verify.ps1  -> Todo OK
Android APK         -> mobile-apk-5 (DOVEXO, debug)
Android AAB         -> artifact dovexo-android-aab (release, 36 MB)
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
POST /api/v1/auth/mobile/login (técnico)                    -> 200, 1 tenant technician
POST /api/v1/auth/mobile/refresh                            -> 200, token rotado
POST /api/v1/auth/mobile/logout                             -> 204
GET  /api/v1/portal/servicios-demo                          -> 200, demo_available=true
POST /api/v1/portal/servicios-demo/auth/demo                -> 200, Carlos Gomez
GET  /api/v1/portal/servicios-demo/summary                  -> 200
GET  /api/v1/portal/servicios-demo/orders|quotes|appointments|payments -> 200
GET  /api/v1/dashboard/operations (demo)                    -> 200
GET  /api/v1/team (demo)                                    -> 200, 2 miembros
POST /api/v1/team/invitations (demo)                        -> 201, email_status=console
POST /api/v1/customers/{id}/portal-access (demo)            -> 200, email_status=not_sent
POST /api/v1/portal/servicios-demo/auth/verify              -> 200, Carlos Gomez
GET  /api/v1/portal/servicios-demo/me (JWT portal)          -> 200, Carlos Gomez
POST /api/v1/customers/{id}/portal-access/revoke (demo)     -> 204
GET  /api/v1/portal/servicios-demo/me (mismo JWT)           -> 401, sesión revocada
GET  https://saas-gestion-web.vercel.app/portal/servicios-demo -> 200, meta referrer no-referrer
POST /api/v1/portal/servicios-demo/auth/request             -> 200, dev_token ausente
```

El refresh de sesión cross-site se verificó recargando el dashboard después del
login. El asistente devolvió `QT-2026-0002` con datos reales de Neon. Las
migraciones `b2c3d4e5f6a7` y `c3d4e5f6a7b8` quedaron aplicadas en Neon y la API
se redesplegó el 2026-11-11.

## Demo pública

- Frontend: https://saas-gestion-web.vercel.app
- API: https://saas-gestion-api.vercel.app
- Base de datos: Neon PostgreSQL (`gru1`, plan Free).
- Admin demo: `demo@saasgestion.com` / `Demo12345!`.
- Técnico demo: `tecnico@saasgestion.com` / `Tecnico12345!`.
- Cliente demo del portal: empresa `servicios-demo`, `carlos@example.com`.
- APK Android de prueba: https://github.com/manuysys/SAAS_GESTION_APP/releases/tag/mobile-apk-3

Ver `docs/DEMO.md`. La demo ya no depende de esta máquina. Limitación: el plan
Free de Neon y el plan Hobby de Vercel tienen límites de uso y cold starts.

## Pendiente

- [ ] Instalar el APK en un Android real y recorrer técnico, cliente, fotos y
  offline.
- [ ] Publicar en Google Play con keystore de release, ficha, privacidad y data
  safety.
- [ ] Entregar magic links del portal por email o WhatsApp.
- [ ] WhatsApp end-to-end con número y credenciales de Meta.
- [ ] Cobros reales con Mercado Pago y webhooks.
- [ ] Enforcement completo de límites por plan en todos los endpoints.
- [ ] Recordatorios automáticos programados (cron/worker).
- [ ] Reset y modo de solo lectura de la demo.
- [ ] Entrevistas a clientes.
- [ ] Dominio propio, política de privacidad y revisión legal.
- [ ] Backups verificados y plan de restauración de Neon.

## Próximo paso concreto

1. Probar el APK `mobile-apk-5` en un dispositivo Android real y corregir lo que
   falle.
2. Subir el AAB firmado a Google Play Console y crear la prueba interna.
3. Comprar y verificar un dominio; configurar Resend y `EMAIL_FROM` para enviar
   invitaciones y accesos reales.
4. Implementar importador CSV/XLSX, onboarding y reset de demo.
5. Configurar backups verificados y monitoreo de errores.

## Limitaciones conocidas

- Neon Free y Vercel Hobby tienen límites de almacenamiento, conexiones y
  ejecución; no son un entorno productivo con SLA.
- Sin credenciales de Meta ni Mercado Pago. Groq está configurado en producción
  con fallback determinista.
- El rate limiting usa PostgreSQL con fallback en memoria; para varias instancias
  conviene Redis/Upstash o el WAF del proveedor.
- Las fotos de técnicos se guardan como `BYTEA` en PostgreSQL; migrar a S3 en
  producción.
- El asistente responde con Groq y cae a intenciones deterministas si se agota
  la cuota; el modo determinista no es un LLM.
- `send_whatsapp` en automatizaciones queda `skipped` hasta configurar WhatsApp.
- La suscripción se crea en modo `trialing` de 14 días, pero todavía no se cobra.
- Los cold starts de Vercel pueden agregar latencia a la primera request.
- Falta RLS, 2FA y recuperación de contraseña con email.
- El APK `mobile-apk-5` usa firma de debug; el AAB firmado con release existe
  como artifact, pero todavía no se subió a Play.
- Resend está implementado, pero sin dominio verificado el proveedor productivo
  no puede entregar. En producción se usa `console` y el enlace se copia a mano.
- `dev_token` está deshabilitado en producción; el login demo del portal sigue
  disponible solo para `servicios-demo`.
- Push requiere `eas projectId` y un development build; no se probó en
  dispositivo.
- El importador, el onboarding y el reset de demo todavía no existen.
