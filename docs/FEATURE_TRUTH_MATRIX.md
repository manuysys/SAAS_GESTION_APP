# Matriz de veracidad de funcionalidades

**Fecha:** 2026-11-09
**Alcance:** inventario de funcionalidades de Arreglo (nombre provisional, ver [`BRAND.md`](BRAND.md)) contrastado contra el código del repositorio y la versión desplegada en https://saas-gestion-web.vercel.app.
**Regla:** una funcionalidad sólo figura como "Implementada y probada" si hay código en el repo **y** un test automatizado que lo cubra. Una pantalla sin test ni endpoint no cuenta como implementada.

## Método y límites de esta matriz

| Qué se hizo | Qué NO se hizo |
|---|---|
| Lectura de rutas FastAPI (`apps/api/app/api/routes/*.py`), servicios, repositorios y modelos. | No se ejecutó `pytest` ni `pnpm test` en esta sesión. La cifra de 83 pytest y 70 vitest viene de [`PROJECT_STATUS.md`](PROJECT_STATUS.md) y no fue reverificada. |
| Búsqueda de nombres de tests (`def test_...`) como evidencia de cobertura. | No se navegó la demo con sesión iniciada. No se hizo login con las credenciales públicas. |
| Lectura de componentes de landing y dashboard. | No hay capturas ni verificación visual en los viewports de [`MEJORAS_Y_PROGRESO.txt`](../MEJORAS_Y_PROGRESO.txt) §4. |
| Fetch del HTML visible de la landing desplegada. | No se midieron Core Web Vitals. |

**Actualización 2026-11-10:** se ejecutaron `pytest` (99 pruebas), `ruff`,
`basedpyright`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (95 pruebas) y
`pnpm build`. También se probaron contra producción el login móvil, el refresh,
el logout, el portal demo, los listados del portal y `GET /dashboard/operations`.

## Convenciones de estado

| Estado | Significado |
|---|---|
| **Implementada y probada** | Código + endpoint o UI + test automatizado que lo ejercita. |
| **Parcial** | Existe parte del flujo, o no hay test, o hay un límite conocido que afecta lo que se promete. |
| **Solo UI** | Pantalla o copy sin lógica de backend equivalente. |
| **Simulada** | Responde algo que no ocurrió realmente (por ejemplo, un envío que no sale). |
| **Planificada** | Documentada, sin código. |
| **Rota** | Existe pero falla o se contradice. Ninguna encontrada en esta revisión por lectura estática. |

## Actualización 2026-11-10: app móvil y portal

| ID | Funcionalidad | Estado | Evidencia | Limitaciones | Prioridad |
|---|---|---|---|---|---|
| F75 | App Android de técnicos (Expo/React Native) | Implementada, verificada con typecheck y bundle | `apps/mobile/app/tech/*`; `pnpm exec tsc --noEmit`; `expo export --platform android` | No instalada todavía en un dispositivo físico. APK release firmado con debug. | P0 |
| F76 | App Android de clientes (portal) | Implementada, verificada contra la API real | `apps/mobile/app/customer/*`; login demo, resumen, órdenes, turnos, presupuestos y pagos probados contra producción | Sin entrega real de magic link; usa `dev_token` en la demo. | P0 |
| F77 | Auth móvil de técnicos | Implementada y probada | `/auth/mobile/login`, `/refresh` y `/logout`; `tests/test_mobile_auth.py` (4 tests); refresh y logout probados en producción | Sin 2FA ni recuperación de contraseña. | P0 |
| F78 | Portal del cliente en la API | Implementada y probada | `/portal/{slug}/*`; `tests/test_portal.py`; login demo y listados probados en producción | Magic link sin email/WhatsApp; rate limit agregado en las rutas de auth. | P0 |
| F79 | Push con Expo | Parcial | `services/push_service.py`; `tests/test_push.py` con mock; registro de dispositivo | Sin `eas projectId` el token no se obtiene; no probado en dispositivo. | P1 |
| F80 | Cola offline del técnico | Implementada, sin test automatizado | `src/lib/offline.ts`; notas, materiales y fotos con `client_request_id` | Las fotos se guardan en almacenamiento local de la app. | P0 |
| F81 | Dashboard operativo | Implementada y probada | `GET /dashboard/operations`; `tests/test_dashboard.py` (6 tests); UI en `/dashboard` | Límite de 10 ítems por lista; saldo por orden basado en presupuestos aprobados y pagos. | P0 |
| F82 | Dataset único de la landing | Implementada y probada | `lib/marketing/demo-data.ts`; `demo-data.test.ts` (27 tests) | Sigue siendo ilustrativo, no datos en vivo. | P1 |
| F83 | Rate limiting en auth del portal | Implementada | `routes/portal.py` llama a `security_service.check_rate_limit` | Sin test específico de 429 en portal. | P1 |
| **No encontrada** | No hay rastro en el repo. |

Prioridad: P0 (confianza o seguridad, bloquea), P1 (experiencia central), P2 (automatización), P3 (inteligencia y comercial avanzado). Ver [`PRIORITIZED_BACKLOG.md`](PRIORITIZED_BACKLOG.md).

---

## 1. Acceso y seguridad de cuenta

| ID | Funcionalidad | Estado | Evidencia | Limitaciones | Prioridad |
|---|---|---|---|---|---|
| F01 | Registro de empresa y usuario | Implementada y probada | `POST /api/v1/auth/register`; `test_auth.py::test_register_login_me_and_refresh`; `test_auth.py::test_duplicate_email_is_rejected` | Sin verificación de email (`email_verified_at` existe en el modelo, sin flujo). | P1 |
| F02 | Login, `/me`, logout | Implementada y probada | `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`; `test_auth.py`; `test_security.py::test_logout_with_invalid_origin_is_forbidden` | — | — |
| F03 | Refresh token rotativo con detección de reuso | Implementada y probada | `POST /auth/refresh`; `test_security.py::test_refresh_token_reuse_revokes_family` | Refresh opaco hasheado en DB (`token_hash`). | — |
| F04 | Lockout de login (5 fallos en 15 min) | Implementada y probada | `auth_attempts`; `test_security.py::test_login_lockout_after_five_failures` | Por email/IP; sin desbloqueo manual. | — |
| F05 | Rate limiting | Parcial | `core/middleware.py::rate_limit_middleware`; `security_service.check_rate_limit`; test `test_login_rate_limit_returns_429` | Sólo cubre `POST` de login/register/refresh y `GET /public/quotes/*`. **No cubre** `POST .../approve` ni `.../reject` públicos. Fallback en memoria por instancia. | P0 |
| F06 | Recuperación de contraseña por email | No encontrada | Sin endpoints ni modelo de token de reset. | Planificada en [`SECURITY.md`](SECURITY.md). | P1 |
| F07 | Verificación de email | Planificada | Sólo campo `email_verified_at` en [`DATA_MODEL.md`](DATA_MODEL.md). | Sin flujo ni envío. | P1 |
| F08 | Autenticación de dos factores (2FA) | No encontrada | Sin rastro en `apps/api`. | — | P2 |
| F09 | Validación de `Origin` en endpoints con cookie | Implementada y probada | `api/deps.py::validate_cookie_origin`; test `test_refresh_with_invalid_origin_is_forbidden` | Si no hay `Origin` ni `Referer`, la request pasa. | — |
| F10 | Docs OpenAPI ocultas en producción | Implementada y probada | `main.py` (`docs_url=None` si `app_env=production`); `test_security.py::test_production_settings_hide_docs_and_validate_config` | — | — |

## 2. Multi-tenant y roles

| ID | Funcionalidad | Estado | Evidencia | Limitaciones | Prioridad |
|---|---|---|---|---|---|
| F11 | Aislamiento por `X-Tenant-ID` validado contra membresía | Implementada y probada | `api/deps.py::get_current_membership` (404 si no hay membresía); tests `test_*_isolation_between_tenants` en customers, quotes, appointments, automations, payments, dashboard, ai, work_orders | Sin RLS de PostgreSQL. Sin FK compuestas `(tenant_id, id)` verificadas en esta revisión. | P2 |
| F12 | RBAC por rol con `require_roles` | Implementada y probada | `api/deps.py::require_roles`; `test_quotes.py::test_viewer_cannot_read_quotes`; `test_technician.py`; `test_payments.py::test_technician_cannot_access_payments` | Matriz de permisos dispersa en cada router (no centralizada). | P2 |
| F13 | Panel global de plataforma (`/admin`) | Implementada y probada | `api/routes/admin.py`; `test_billing.py::test_admin_endpoints_require_platform_admin`; `(app)/admin/page.tsx` | Sin UI para administrar platform admins (ver [`KNOWN_ISSUES.md`](KNOWN_ISSUES.md)). | P3 |

## 3. Clientes y solicitudes

| ID | Funcionalidad | Estado | Evidencia | Limitaciones | Prioridad |
|---|---|---|---|---|---|
| F14 | Clientes: alta, lectura, edición, baja | Implementada y probada | `api/routes/customers.py` (GET/POST/PATCH/DELETE); `test_customers.py::test_customer_crud` | `DELETE` es borrado lógico (`deleted_at`, `customer_service.py:93`). Búsqueda y filtros en UI sin test identificado. | P1 |
| F15 | Búsqueda de clientes con avatares y estados | Parcial | `(app)/customers/page.tsx` | Sin test de UI ni verificación visual. | P1 |
| F16 | Importación de clientes desde CSV/Excel | No encontrada | Sin endpoint ni UI. Mencionada en [`COMPETITIVE_ANALYSIS.md`](COMPETITIVE_ANALYSIS.md) §4.6 como oportunidad. | — | P2 |
| F17 | Solicitudes: alta, lectura, edición, conversión a orden | Implementada y probada | `api/routes/service_requests.py`; `test_work_orders.py::test_request_conversion_and_transitions`; error `Service request already converted` | Prioridad y origen existen; sin reglas de revisión automáticas. | P1 |

## 4. Órdenes de trabajo

| ID | Funcionalidad | Estado | Evidencia | Limitaciones | Prioridad |
|---|---|---|---|---|---|
| F18 | Órdenes: alta, edición, transiciones, historial | Implementada y probada | `api/routes/work_orders.py` (incl. `POST /{id}/transition`, `GET /{id}/events`); `test_work_orders.py`; `work_order_events` append-only | Transiciones válidas en servicio; cobertura de transiciones inválidas no verificada en detalle. | — |
| F19 | Tablero de órdenes por estado y tabla | Parcial | `(app)/orders/page.tsx`; `lib/order-status.ts` con test | Sin test visual. Sin filtro documentado de "sin técnico" ni "atrasadas". | P1 |
| F20 | Órdenes atrasadas (definición y alerta) | No encontrada | Sin campo de vencimiento usado en el dashboard. | Requiere definir "atrasada" (ver [`DASHBOARD_AUDIT.md`](DASHBOARD_AUDIT.md)). | P1 |
| F21 | Materiales por orden | Implementada y probada | `work_order_materials`; `test_technician.py::test_technician_note_material_and_attachment` | Vía PWA técnico; no hay carga de materiales desde oficina verificada. | P2 |
| F22 | Adjuntos de orden (fotos) | Parcial | `work_order_attachments` (BYTEA); validación en `technician_pwa_service.py` | Validación por `mime_type` **declarado por el cliente**, no por firma binaria. Máximo 5 MB, `image/jpeg|png|webp`. Ver [`SECURITY_AUDIT.md`](SECURITY_AUDIT.md). | P1 |

## 5. Presupuestos

| ID | Funcionalidad | Estado | Evidencia | Limitaciones | Prioridad |
|---|---|---|---|---|---|
| F23 | Presupuestos: alta, edición, envío, aprobación/rechazo interno | Implementada y probada | `api/routes/quotes.py`; `test_quotes.py` (13 tests, incluye totales exactos, overflow, vencido, transición inválida) | — | — |
| F24 | Totales en `Decimal` con ítems históricos | Implementada y probada | `test_quotes.py::test_create_quote_calculates_totals_exactly`; [`DECISIONS.md`](DECISIONS.md) ADR-008 | — | — |
| F25 | PDF de presupuesto | Implementada y probada | `GET /quotes/{id}/pdf`; `test_quotes.py::test_quote_pdf_returns_pdf_content` | — | — |
| F26 | Aprobación pública por enlace `/q/[token]` | Implementada y probada | `api/routes/public_quotes.py`; `test_quotes.py::test_send_public_get_approve_and_work_order_status`; `test_expired_quote_cannot_be_approved`; `test_invalid_public_token_returns_404` | Token guardado **en texto plano** (`quotes.public_token`). `valid_until` es opcional: sin fecha, el enlace no vence. Sin revocación ni registro de accesos. Sin rate limit en POST. | P0 |
| F27 | Seguimiento de presupuestos (recordatorios, vencimientos) | Planificada | Sólo el conteo `quotes_pending` en dashboard. | Requiere worker programado (ver ADR-009). | P2 |
| F28 | Historial de eventos del presupuesto | Implementada y probada | `GET /quotes/{id}/events`; `quote_events` append-only | — | — |

## 6. Agenda y técnicos

| ID | Funcionalidad | Estado | Evidencia | Limitaciones | Prioridad |
|---|---|---|---|---|---|
| F29 | Turnos: alta, edición, cancelación | Implementada y probada | `api/routes/appointments.py`; `test_appointments.py` (6 tests) | — | — |
| F30 | Detección de conflictos de horario (409) | Implementada y probada | `test_appointments.py::test_create_appointment_conflict_returns_409` | Sin alerta de solapamiento en dashboard. | P1 |
| F31 | Reprogramación | Parcial | `PATCH /appointments/{id}` | Sin UI de drag and drop verificada. | P2 |
| F32 | Asignación de técnico a la orden | Implementada y probada | `test_appointments.py::test_create_appointment_assigns_work_order`; `(app)/orders/[id]` con `technician-assignment.tsx` | Sin vista de carga semanal real (la del hero es ilustrativa). | P1 |
| F33 | Lista de técnicos | Implementada y probada | `GET /technicians` (roles owner/admin/dispatcher) | Sin datos de disponibilidad (`technician_profiles.availability` está en modelo, sin uso verificado). | P2 |
| F34 | Agenda visual por día (timeline) | Parcial | `(app)/agenda/page.tsx`, `lib/agenda.ts` con test | Sin verificación visual en esta revisión. | P1 |

## 7. Pagos

| ID | Funcionalidad | Estado | Evidencia | Limitaciones | Prioridad |
|---|---|---|---|---|---|
| F35 | Registrar pagos totales y parciales | Implementada y probada | `api/routes/payments.py`; `test_payments.py::test_create_payment_recalculates_partial_status`, `test_payment_paid_status` | — | — |
| F36 | Anular pago y recalcular estado | Implementada y probada | `POST /payments/{id}/void`; `test_void_payment_recalculates_status` | — | — |
| F37 | Saldo pendiente | Parcial | `dashboard_service.py`: `max(0, sum(quotes.approved) - sum(payments.registered))` | **Calculado a nivel empresa**, no por orden. No distingue presupuestos aprobados sin orden de pagos sin presupuesto. Ver [`DASHBOARD_AUDIT.md`](DASHBOARD_AUDIT.md). | P1 |
| F38 | Cobro en línea (Mercado Pago u otro) | Planificada | Sin integración en el repo. Mencionado en `KNOWN_ISSUES.md`. | Se trata como pagos de clientes finales, no de la suscripción. | P3 |

## 8. Técnicos: PWA

| ID | Funcionalidad | Estado | Evidencia | Limitaciones | Prioridad |
|---|---|---|---|---|---|
| F39 | Órdenes asignadas al técnico (lista y detalle) | Implementada y probada | `api/routes/technician.py`; `test_technician.py::test_technician_only_sees_assigned_orders` | — | — |
| F40 | Transiciones de estado desde el celular | Implementada y probada | `test_technician.py::test_technician_transitions` | — | — |
| F41 | Notas, materiales y fotos | Implementada y probada | `test_technician.py::test_technician_note_material_and_attachment`; `test_attachment_validation` | Fotos en BYTEA, sin S3. | P2 |
| F42 | Filtros por estado en la PWA | Implementada | `CHANGELOG`/`PROJECT_STATUS` declaran la función; `components/tech/tech-shell.tsx`. | Sin test visual. | P2 |
| F43 | Manifest, service worker y pantalla offline | Parcial | `public/manifest.webmanifest`, `public/sw.js`, `public/offline.html` | El `name` del manifest es "SaaS Gestión · Técnicos", no Arreglo. No probado en Android ni iOS reales. | P1 |
| F44 | Modo offline con sincronización de datos | No encontrada | Sin cola local ni sincronización en el repo. | El tour de la landing dice "los datos se actualizan al volver": no hay mecanismo que lo haga. Ver [`LANDING_AUDIT.md`](LANDING_AUDIT.md). | P1 |
| F45 | Aplicación nativa (`apps/mobile`) | Planificada | `apps/mobile` es un scaffold Expo con plantilla (`EditScreenInfo.tsx`, `two.tsx`, `modal.tsx`) sin conexión a la API. | No es una app usable. Debe marcarse como no integrada o eliminarse (ver backlog). | P3 |

## 9. Comunicaciones y automatizaciones

| ID | Funcionalidad | Estado | Evidencia | Limitaciones | Prioridad |
|---|---|---|---|---|---|
| F46 | Reglas de automatización (evento, condición, acción) | Implementada y probada | `api/routes/automations.py` (CRUD, toggle, ejecuciones); `test_automations.py` (7 tests) | Sin worker ni reintentos (ADR-009). | — |
| F47 | Acción `notify` y `notify_user` | Implementada y probada | `test_automations.py::test_work_order_transition_creates_notification_and_execution` | — | — |
| F48 | Acción `send_whatsapp` | Simulada | Estado `skipped` hasta configurar WhatsApp. `test_automations.py::test_send_whatsapp_action_is_skipped`. | Debe mostrarse como "no enviado" en UI. Verificar que la UI lo diga. | P2 |
| F49 | Notificaciones in-app (lectura individual y masiva) | Implementada y probada | `api/routes/notifications.py`; `test_automations.py::test_read_and_read_all_notifications`; `test_technician_only_sees_own_notifications` | — | — |
| F50 | Email transaccional | No encontrada | Sin proveedor ni plantillas. | Listado en `KNOWN_ISSUES.md`. | P2 |
| F51 | Configuración de WhatsApp Cloud API con secretos cifrados | Implementada y probada | `api/routes/whatsapp.py` (`GET/PUT /config`); `test_whatsapp.py::test_put_config_encrypts_and_get_hides_secrets`; `core/crypto.py` (Fernet) | Sin credenciales reales de Meta. | — |
| F52 | Webhook de WhatsApp con firma HMAC e idempotencia | Implementada y probada | `api/routes/whatsapp_webhook.py`; `test_whatsapp.py::test_post_webhook_invalid_signature_returns_403`; `test_post_webhook_valid_signature_saves_and_dedup` | — | — |
| F53 | Envío de WhatsApp | Parcial | `POST /whatsapp/send`; `test_send_with_mocked_provider_saves_outbound_sent` (proveedor mockeado); `test_send_without_config_returns_503` | **Nunca probado contra la API real de Meta.** "Enviado" significa aceptado por el API, no entregado. | P2 |
| F54 | Estados de WhatsApp: pendiente, enviado, entregado, leído, fallido | No encontrada | No se identificó manejo de statuses de entrega en el webhook durante esta revisión (revisar `whatsapp_webhook.py` y `whatsapp_service.py` antes de afirmar lo contrario). | MEJORAS §12 lo exige. | P2 |

## 10. Asistente de IA

| ID | Funcionalidad | Estado | Evidencia | Limitaciones | Prioridad |
|---|---|---|---|---|---|
| F55 | Asistente determinista con datos reales | Implementada y probada | `api/routes/ai.py`; `test_ai.py` (7 tests, incluye `test_chat_pending_quotes_returns_real_quote_number`, aislamiento y `test_chat_fallback_is_honest`) | Responde intenciones predefinidas, no es un LLM (como dice la landing). | — |
| F56 | Proveedor externo (Groq / OpenAI-compatible) | Parcial | `services/ai_providers.py`; tests con mock (`test_chat_external_failure_returns_502`, `test_chat_external_not_configured_returns_503`) | Según `PROJECT_STATUS.md`, Groq está configurado en producción. No verificado en esta sesión. | P2 |
| F57 | Ollama local | Parcial | Implementado en `ai_providers.py`. | No probado con modelo real en producción. | P3 |
| F58 | Cuotas de IA y respuesta 429 | Implementada y probada | `test_ai.py::test_chat_quota_exhausted_returns_429` | El límite visible en planes (`ai_monthly_tokens`) no se encontró referenciado en `app/` durante esta revisión; el mecanismo exacto no quedó verificado. | P1 |
| F59 | Registro de consumo de IA (`ai_usage_logs`) | Parcial | `GET /ai/usage`; modelo `ai_usage_log.py` | Sin test específico identificado. | P2 |
| F60 | El asistente no ejecuta acciones ni SQL | Implementada (por diseño) | ADR-010; endpoint sólo de lectura. | Afirmación consistente con el código revisado; no hay test que lo garantice explícitamente. | P2 |

## 11. Planes, suscripciones y límites

| ID | Funcionalidad | Estado | Evidencia | Limitaciones | Prioridad |
|---|---|---|---|---|---|
| F61 | Catálogo de planes en DB (Starter, Professional, Business) | Implementada y probada | Migración `5ffb8399d836` (precios 29.900 / 59.900 / 99.900); `GET /billing/plans`; `test_billing.py::test_list_plans_returns_three` | Los precios de la landing salen de `lib/brand.ts`, otra fuente. Dos fuentes de verdad. | P0 |
| F62 | Suscripción automática al registro en `trialing` | Implementada y probada | `billing_service.create_trial_subscription`; `test_billing.py::test_register_creates_trial_subscription` | No tiene fecha de fin de prueba ni cobro. | P0 |
| F63 | Cambio de plan por el owner | Implementada y probada | `POST /billing/subscription/change`; `test_change_subscription_updates_price_snapshot`; `test_technician_cannot_change_plan` | Sin cobro. | — |
| F64 | Enforcement de límites de usuarios, técnicos y órdenes por plan | Parcial | `services/plan_limits_service.py`; `tests/test_billing.py::test_order_limit_is_enforced` | Órdenes por mes aplicado en creación y conversión. Usuarios/técnicos siguen sin endpoint de alta, así que no se pueden aplicar todavía. | P0 |
| F65 | Cobro recurrente de la suscripción (Mercado Pago) | Planificada | [`SAAS_BILLING.md`](SAAS_BILLING.md) y `KNOWN_ISSUES.md`. | Sin credenciales ni webhooks. | P3 |

## 12. Landing, demo y legal

| ID | Funcionalidad | Estado | Evidencia | Limitaciones | Prioridad |
|---|---|---|---|---|---|
| F66 | Landing pública | Implementada (con afirmaciones a corregir) | Desplegada: `https://saas-gestion-web.vercel.app/` responde contenido de landing. Código: `app/page.tsx`, `components/marketing/*`. | IDs de ejemplo inconsistentes, mockups con datos contradictorios. Ver [`LANDING_AUDIT.md`](LANDING_AUDIT.md). | P0 |
| F67 | Cuenta demo pública | Parcial | Desplegada. Credenciales en landing (`hero.tsx`) y login (`login/page.tsx`). Backend responde `GET /api/v1/health/ready` = `{"status":"ready"}`. | Sin reset, sin modo sólo lectura, sin script de siembra en el repo. Ver [`DEMO_ENVIRONMENT.md`](DEMO_ENVIRONMENT.md). | P0 |
| F68 | Dashboard con métricas | Parcial | `GET /dashboard/summary`; `test_dashboard.py` (3 tests); `(app)/dashboard/page.tsx` | Métricas de conteo; sin atrasos, sin sin-técnico, sin presupuestos vencidos. Ver [`DASHBOARD_AUDIT.md`](DASHBOARD_AUDIT.md). | P1 |
| F69 | Páginas legales `/privacy` y `/terms` | Parcial | `app/privacy/page.tsx`, `app/terms/page.tsx`. | Son borradores según [`MEJORAS_Y_PROGRESO.txt`](../MEJORAS_Y_PROGRESO.txt) §11.5. No revisé su contenido completo en esta sesión. | P0 |
| F70 | Cabeceras de seguridad HTTP | Implementada y probada | `core/middleware.py::security_headers_middleware`; `test_security.py::test_security_headers_present` | CSP del frontend pendiente (ver `SECURITY.md`). | P1 |

## 13. Infraestructura y operación

| ID | Funcionalidad | Estado | Evidencia | Limitaciones | Prioridad |
|---|---|---|---|---|---|
| F71 | Health checks `live` y `ready` | Implementada y probada | `api/routes/health.py`; `test_health.py` (2 tests) | — | — |
| F72 | Request ID y logs estructurados | Implementada | `core/middleware.py::request_id_middleware`; `core/logging.py` | Sin monitoreo de errores externo verificado. | P2 |
| F73 | Backups y restauración | Parcial | `scripts/backup.ps1`, `scripts/restore.ps1`; retención de 14 días en `OPERATIONS.md` | Restauración de Neon no verificada (ver `PROJECT_STATUS.md`). | P1 |
| F74 | Auditoría de acciones (`audit_logs`) | Parcial | `test_security.py::test_audit_log_created_on_register_and_login`, `test_audit_log_tenant_isolation`; `work_order_events` y `quote_events` | Cobertura de auditoría por módulo no completa; no verificada cada acción de [`SECURITY.md`](SECURITY.md). | P1 |

## 14. Funcionalidades prometidas en la landing o en docs que no existen en el repo

| Afirmación | Dónde aparece | Estado real |
|---|---|---|
| "Funciona en Android y iPhone" (PWA) | FAQ de la landing | No verificado en dispositivos (F43). |
| "Los datos se actualizan al volver" (offline) | Tour de la landing | No implementado (F44). |
| "Una prueba de 14 días" | Hero, pricing, FAQ, términos | En implementación; sin fecha de fin (F62). |
| "100 órdenes por mes" y similares | Tarjetas de planes | Órdenes por mes aplicado; usuarios/técnicos todavía no (F64). |
| "Aprobado desde el link público" con datos de ejemplo | Mockup del hero | Ilustrativo; la contradicción está en [`LANDING_AUDIT.md`](LANDING_AUDIT.md). |
| Mecanismos de SistemaLoop, Lumex, Jobber | [`MEJORAS_Y_PROGRESO.txt`](../MEJORAS_Y_PROGRESO.txt) §9 | No aplican al producto: son referencias de mercado, no funciones. Sin investigación en [`COMPETITIVE_ANALYSIS.md`](COMPETITIVE_ANALYSIS.md). |
</content>
