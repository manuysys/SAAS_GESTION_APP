# Auditoría de seguridad

**Fecha:** 2026-11-09
**Alcance:** API FastAPI (`apps/api`), frontend Next.js (`apps/web`), demo desplegada y documentación de seguridad del repo.
**Referencias:** [`SECURITY.md`](SECURITY.md), [`TENANT_SECURITY.md`](TENANT_SECURITY.md), [`DECISIONS.md`](DECISIONS.md) y [`MEJORAS_Y_PROGRESO.txt`](../MEJORAS_Y_PROGRESO.txt) §11.

## Método y límites

- Lectura estática de middlewares, dependencias, servicios y rutas. Revisión de nombres de tests como evidencia de cobertura.
- **No se ejecutaron los tests.** No se hizo pentest, fuzzing ni escaneo de dependencias.
- **No se inició sesión** en la demo. No se probó en vivo ningún endpoint autenticado, salvo `GET /api/v1/health/ready`, que respondió `{"status":"ready"}`.
- No se revisó la configuración de producción real (variables de entorno en Vercel). Sólo lo que el código valida al arrancar.

Severidad: **Alta** (puede exponer datos entre tenants, cuentas o cobros), **Media** (abuso o fuga limitada), **Baja** (higiene o defensa en profundidad).

## Resumen

El núcleo de autenticación y autorización está bien encaminado y tiene tests: Argon2id, JWT de acceso, refresh rotativo con revocación de familia, cookies `HttpOnly`, validación de `Origin`, lockout, rate limit con fallback, aislamiento por tenant en casi todos los módulos y documentación OpenAPI oculta en producción.

Los puntos débiles son:

1. **Enlace público de presupuesto**: el token es un bearer de texto plano, sin expiración por defecto, sin revocación, sin log de accesos y sin rate limit en las operaciones de aprobación y rechazo.
2. **Demo pública** con credenciales visibles en la landing y una cuenta de plataforma en la misma base.
3. **Ausencias**: RLS, 2FA, recuperación de contraseña y verificación de email.
4. **Validación de archivos** basada en el tipo que declara el cliente, no en la firma binaria.
5. **Límites de plan sin enforcement**: un tercero puede generar costo ilimitado (IA y almacenamiento) sin que el sistema lo corte.

## 1. Controles implementados

| Control | Estado | Evidencia | Observación |
|---|---|---|---|
| Contraseñas con Argon2id | Implementado | `app/core/security.py` (`PasswordHasher`) | Los parámetros de costo no se inspeccionaron en esta revisión. Verificar que estén calibrados (SECURITY.md lo pide). |
| Access token JWT de corta duración | Implementado | `core/security.py::create_access_token`; `jwt_access_ttl_minutes` | Verificar el valor de producción. |
| Refresh token opaco, hasheado, rotativo | Implementado | `auth_service.py` (`hash_refresh_token`, `token_hash`); `tenant.py:84` | — |
| Detección de reuso de refresh y revocación de familia | Implementado y probado | `test_security.py::test_refresh_token_reuse_revokes_family` | — |
| Cookie `HttpOnly` | Implementado | `routes/auth.py:29` (`httponly=True`) | Confirmar `Secure` y `SameSite` en producción (`COOKIE_SECURE`, `SameSite=None` cross-site según `SECURITY.md`). |
| Validación de `Origin` / `Referer` en refresh y logout | Implementado y probado | `api/deps.py::validate_cookie_origin`; `test_refresh_with_invalid_origin_is_forbidden`, `test_logout_with_invalid_origin_is_forbidden` | Si no hay `Origin` ni `Referer`, la request pasa (política documentada en el código). Es aceptable para clientes no-browser, pero deja sin validar las requests sin esas cabeceras. Ver S-18. |
| Lockout de login (5 fallos en 15 min, por email/IP) | Implementado y probado | `auth_attempts`; `test_login_lockout_after_five_failures` | Sin desbloqueo manual ni notificación al titular. |
| Rate limit en login, register y refresh | Implementado y probado | `core/middleware.py::rate_limit_middleware` (`_AUTH_PATHS`); `test_login_rate_limit_returns_429` | Ver S-12 (fallback en memoria). |
| Rate limit en `GET /public/quotes/*` | Implementado | `core/middleware.py` (`_PUBLIC_QUOTE_PREFIX`, sólo `GET`) | Ver S-04: POST no cubierto. |
| Rate limit en DB con UPSERT atómico | Implementado | `services/security_service.py::check_rate_limit`; tabla `rate_limit_buckets` | Por instancia, sin Redis. |
| Aislamiento por tenant con membresía | Implementado y probado | `api/deps.py::get_current_membership` (404 si no hay membresía) | Ver S-07 (sin RLS). |
| RBAC con `require_roles` | Implementado y probado | `api/deps.py::require_roles`; tests por rol | Permisos dispersos por router. |
| Panel de plataforma con rol separado | Implementado y probado | `api/deps.py::require_platform_admin`; `test_admin_endpoints_require_platform_admin` | Acceso por flag en DB **o** por lista de emails en configuración (`PLATFORM_ADMIN_EMAILS`). Dos caminos para el mismo privilegio. |
| Docs OpenAPI ocultas en producción | Implementado y probado | `main.py` (`docs_url=None`); `test_production_settings_hide_docs_and_validate_config` | — |
| Validación de configuración de producción al arranque | Implementado y probado | `test_production_validator_rejects_localhost_cors` | — |
| `TrustedHostMiddleware` | Implementado | `main.py`; `settings.allowed_hosts` | Verificar la lista en producción. |
| CORS restringido | Implementado y probado | `main.py`; `api_cors_origins`; `test_production_validator_rejects_localhost_cors` | `allow_credentials=True` con lista explícita. Correcto. |
| Cabeceras de seguridad | Implementado y probado | `core/middleware.py::security_headers_middleware`; `test_security_headers_present` | `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`. HSTS sólo con `COOKIE_SECURE`. |
| Auditoría de registro y login | Implementado y probado | `test_audit_log_created_on_register_and_login`; `test_audit_log_tenant_isolation` | Cobertura por módulo parcial (ver sección 3). |
| Historial inmutable de órdenes y presupuestos | Implementado | `work_order_events`, `quote_events` (append-only por diseño) | "Append-only" es intención del modelo; no verifiqué que no existan rutas de borrado. |
| Cifrado de secretos de WhatsApp | Implementado y probado | `core/crypto.py` (Fernet); `test_put_config_encrypts_and_get_hides_secrets` | Depende de `WHATSAPP_ENCRYPTION_KEY` en producción. |
| Firma HMAC del webhook de WhatsApp | Implementado y probado | `test_post_webhook_invalid_signature_returns_403` | — |
| Idempotencia del webhook | Implementado y probado | `test_post_webhook_valid_signature_saves_and_dedup` | — |
| Validación de tipo y tamaño de fotos | Implementado y probado | `technician_pwa_service.py` (`_ALLOWED_MIME_TYPES`, `_MAX_ATTACHMENT_BYTES = 5 MB`); `test_attachment_validation` | Ver S-05: el tipo es el declarado por el cliente. |
| Request ID | Implementado | `core/middleware.py::request_id_middleware` | — |
| Cabecera `Content-Security-Policy` en el frontend | **No implementado** | Declarado pendiente en `SECURITY.md`. | Ver S-11. |

## 2. Hallazgos y pendientes

| ID | Hallazgo | Severidad | Evidencia | Acción recomendada | Backlog |
|---|---|---|---|---|---|
| **S-01** | El `public_token` de presupuesto se guarda **en texto plano** (`String(64)`, unique). Una lectura de la base da acceso a todos los enlaces vivos. | Alta | `models/quote.py:63-64`; `repositories/quotes.py:182-183` | Guardar un hash SHA-256 del token y comparar por hash. Migración que invalide los tokens existentes o los rehashee. | `P1-14` |
| **S-02** | `valid_until` es opcional. Un presupuesto sin fecha **no vence** nunca. Un enlace filtrado sirve indefinidamente. | Alta | `models/quote.py:59` (nullable); `quote_service.py:65-70` (sólo valida si existe) | Expiración por defecto (por ejemplo, 30 días desde el envío, configurable) y bloqueo de aprobación una vez vencido. | `P0-10` |
| **S-03** | No hay **revocación** del enlace público ni registro de accesos. No se puede invalidar un enlace enviado por error ni saber quién lo abrió. | Media | No hay endpoint de revocación ni tabla de accesos. MEJORAS §11.2 lo pide. | Endpoint `POST /quotes/{id}/revoke-link` (con auditoría) y tabla de accesos con IP y fecha. | `P0-10`, `P2-11` |
| **S-04** | `POST /public/quotes/{token}/approve` y `/reject` **no tienen rate limit**. El middleware cubre sólo `GET`. Un atacante puede probar tokens por fuerza bruta a ritmo ilimitado (la entropía del token lo hace impracticable, pero no hay defensa en profundidad). | Media | `core/middleware.py:70` (`method == "GET"`) | Extender el scope `public-quote` a `POST` con el mismo límite. | `P0-08` |
| **S-05** | La validación de fotos usa `mime_type` **declarado por el cliente**. Un archivo que no sea imagen puede subirse marcado como `image/jpeg`. | Media | `technician_pwa_service.py:195` (`if mime_type not in _ALLOWED_MIME_TYPES`) | Verificar firma binaria (magic bytes) de JPEG, PNG y WebP. Generar nombre aleatorio y no servir el `Content-Type` del cliente. | `P1-09` |
| **S-06** | **Demo pública con credenciales visibles** en la landing y en el login. La cuenta de administradora de plataforma (`founder@`) figura en [`DEMO.md`](DEMO.md) con su contraseña. Si la base de la demo es la misma que la de producción, es un riesgo directo. | Alta | `hero.tsx:58-69`; `login/page.tsx:84-91`; `DEMO.md` líneas 33–42 | Retirar la cuenta founder de la base pública. Rotar credenciales. Separar la demo. | `P0-07` |
| **S-07** | **Sin RLS de PostgreSQL.** El aislamiento depende sólo de los filtros de la aplicación. Un filtro omitido en un repositorio nuevo expone datos. | Media (defensa en profundidad) | `grep` de `ROW LEVEL SECURITY` sin resultados. [`TENANT_SECURITY.md`](TENANT_SECURITY.md) lo deja como objetivo. | Evaluar RLS con `app.tenant_id` por sesión. Mientras tanto, un test que recorra todos los repositorios. | `P2-05` |
| **S-08** | **Sin 2FA.** | Media | No hay rastro en `apps/api`. | Planificar TOTP para owner y admin. | `P2-06` |
| **S-09** | **Sin recuperación de contraseña.** Un usuario que pierde el acceso no tiene camino de recuperación más que intervención manual. | Media | No hay endpoints ni tokens de reset. | Token de un solo uso, expiración corta, rate limit, auditoría. | `P1-08` |
| **S-10** | **Sin verificación de email.** Cualquiera puede registrar una empresa con un email ajeno. | Media | `email_verified_at` existe en el modelo, sin flujo. | Verificación al registro antes de operar sobre datos reales. | `P1-08` |
| **S-11** | **Sin CSP en el frontend.** Riesgo de XSS si alguna vez se usa `dangerouslySetInnerHTML` o se incorpora un script de terceros. Hoy no se encontró su uso en esta revisión (no hice búsqueda exhaustiva). | Media | `SECURITY.md` la declara pendiente. | CSP con nonce o hash en `next.config`/middleware. | `P1-15` |
| **S-12** | **Rate limit con fallback en memoria por instancia.** Con varias instancias, el límite real se multiplica. | Baja (hoy una instancia) | `security_service.py:102-106`; [`KNOWN_ISSUES.md`](KNOWN_ISSUES.md) | Aceptable en la demo. Para producción, Redis/Upstash o el WAF del proveedor. | `P2-05` (evaluación) |
| **S-13** | **Límites de plan sin enforcement.** Un tenant puede crear órdenes, usuarios y técnicos sin límite, y consumir IA hasta el límite de cuota que sí existe. Es un riesgo de costo, no de confidencialidad. | Media | `plans.limits` sin uso en `app/` (ver F64) | Enforcement centralizado (entitlements) y respuesta 402 o 403 con mensaje claro. | `P0-05`, `P1-01` |
| **S-14** | **Backups y restauración no verificados** en Neon. | Alta (continuidad) | `PROJECT_STATUS.md` (pendiente); `OPERATIONS.md` (retención de 14 días). | Restaurar en un proyecto aislado y documentar el tiempo. | `P1-17` |
| **S-15** | **Cumplimiento (Ley 25.326)**: política y términos son borradores. Región de alojamiento y retención pendientes. | Alta (legal) | `MEJORAS_Y_PROGRESO.txt` §11.4–11.5; `privacy/page.tsx`, `terms/page.tsx` | Revisión profesional antes de comercializar. No modificar declaraciones para que parezcan cumplidas (MEJORAS §11.4). | `P0-09` |
| **S-16** | **Credenciales en el repositorio.** `README.md`, `DEMO.md`, `MOBILE_API.md` y `PROJECT_STATUS.md` contienen emails y contraseñas de demo. Si el repo es público, la demo es pública por partida doble. | Media | Búsqueda de `saasgestion.com` en docs | Verificar la visibilidad del repo. Sacar contraseñas de la documentación. | `P0-07` |
| **S-17** | **Campos de `PublicQuoteResponse` sin verificar.** La regla dice que el enlace público no debe exponer IDs internos. En `schemas/quote.py:75` aparece `public_token: str` en un esquema que no identifiqué como público. | Media (a confirmar) | `schemas/quote.py` | Revisar el esquema público y añadir un test que compare el JSON contra una lista blanca de campos. | `P0-08` |
| **S-18** | **Requests sin `Origin` ni `Referer` pasan la validación.** Es la política documentada, pero conviene un test explícito y una cookie `SameSite=Lax` o `Strict` consistente. | Baja | `api/deps.py:23-25` | Documentar la política y agregar test. | `P1-15` |
| **S-19** | **Dos caminos de privilegio de plataforma** (flag en DB y lista de emails en config). | Baja | `api/deps.py::_is_platform_admin` | Usar sólo el flag en DB y administrarlo por script auditado. | `P2-12` |
| **S-20** | **Cuenta de demo con datos que pueden modificarse** (clientes, pagos, anulaciones). Un visitante puede dejar la demo en un estado que confunda a otros. | Media | [`DEMO_ENVIRONMENT.md`](DEMO_ENVIRONMENT.md) | Reset programado y modo de sólo lectura. | `P0-07` |

## 3. Auditoría: cobertura por módulo

| Módulo | Eventos auditados (verificados por test o por código) | Observación |
|---|---|---|
| Autenticación | Registro, login, logout, reuso de refresh | Verificado por test (`test_audit_log_created_on_register_and_login`). |
| Presupuestos | Creación, envío, aprobación, rechazo (`quote_events`) | Historial propio, no `audit_logs` necesariamente. Verificar que ambos existan. |
| Órdenes | Transiciones (`work_order_events`) | Historial propio. |
| Pagos | Registro y anulación | Verificar en `audit_logs`. MEJORAS §11 y `SECURITY.md` piden auditoría de pagos. |
| Panel de plataforma | Cambios de plan | Declarado en `PROJECT_STATUS.md`. |
| Automatizaciones | Ejecuciones (`automation_executions`) | Historial propio. No es auditoría de cambios de regla. |
| Enlace público | **Ninguno** | Ver S-03. |
| Archivos | **Ninguno verificado** | Subida y descarga no aparecen en esta revisión. |

## 4. Prueba de aislamiento multi-tenant

Tests con dos tenants encontrados por nombre (no ejecutados):

- `test_customers.py::test_customer_isolation_between_tenants`
- `test_quotes.py::test_quote_isolation_between_tenants`
- `test_work_orders.py::test_work_order_isolation_between_tenants`
- `test_appointments.py::test_appointment_isolation_between_tenants`
- `test_payments.py::test_payment_isolation_between_tenants`
- `test_automations.py::test_automation_isolation_between_tenants`
- `test_dashboard.py::test_dashboard_isolation_between_tenants`
- `test_ai.py::test_chat_isolation_between_tenants`
- `test_technician.py::test_technician_isolation_from_other_technician_and_tenant`
- `test_security.py::test_audit_log_tenant_isolation`

**Faltantes** según la matriz mínima de [`TENANT_SECURITY.md`](TENANT_SECURITY.md):

| Caso de la matriz | Cubierto por nombre |
|---|---|
| Tenant A lee cliente de B → 404 | Sí. |
| Tenant A modifica orden de B → 404 | Sí (work orders). |
| Tenant A asigna técnico de B → 400/404 | **No identificado.** |
| Tenant A descarga archivo de B → 404 | **No identificado** (adjuntos de orden). |
| Usuario sin membership → 403 | Parcial (404 en `get_current_membership`). La matriz pide 403; la implementación devuelve 404. Documentar la decisión. |
| Técnico accede a finanzas → 403 | Sí (`test_technician_cannot_access_payments`). |
| Webhook de A modifica B → rechazado | Parcial (firma verificada). |
| Automatización de A consulta B → 0 resultados | Sí. |

Recomendación: agregar los dos casos sin cobertura (asignación cruzada y descarga de adjuntos ajenos) como parte de `P1-09`.

## 5. Tokens y enlaces públicos: detalle

Resumen de lo que MEJORAS §11.2 pide y el estado actual:

| Requisito | Estado | Ref |
|---|---|---|
| Tokens aleatorios de alta entropía | Sí | `models/quote.py:25` (`generate_public_token`) |
| Almacenamiento seguro del token | **No** (texto plano) | S-01 |
| Validación | Sí | `quote_service.get_by_public_token` |
| Revocación | **No** | S-03 |
| Expiración configurable | **Parcial** (campo opcional, sin default) | S-02 |
| Rate limiting | **Parcial** (sólo GET) | S-04 |
| Registro de acceso | **No** | S-03 |
| Protección contra modificaciones no autorizadas | Sí, por estado (`sent`) y bloqueo (`SELECT ... FOR UPDATE` con `lock=True`) | `quote_service.py:421-429` |
| Historial de aprobación | Sí | `quote_events` |
| Evitar aceptar dos veces | Sí | `quote_service.py:429` (`if quote.status != "sent"`) y test `test_public_reject_does_not_regress_approved_order` |
| Registrar versión, estado anterior y nuevo, identificador de evento y evidencia técnica | **Parcial** | `quote_events` guarda `payload` JSONB; no verifiqué que incluya versión e IP |

## 6. Plan de respuesta

Orden sugerido para cerrar primero los hallazgos de severidad alta:

1. **S-06 / S-16 / S-20**: retirar la cuenta founder de la base pública, rotar credenciales y sacar contraseñas de la documentación. Ver [`DEMO_ENVIRONMENT.md`](DEMO_ENVIRONMENT.md).
2. **S-02**: expiración por defecto de enlaces públicos.
3. **S-04 / S-17**: rate limit en POST y lista blanca de campos públicos, con test.
4. **S-01**: hash del token con migración.
5. **S-14**: verificación de restauración.
6. **S-15**: revisión legal antes de comercializar.

No se propone cambiar contraseñas ni datos en producción sin autorización, según `MEJORAS_Y_PROGRESO.txt` §19.

## 7. Qué no se verificó

- Ejecución de la suite de tests y de `scripts/verify.ps1`.
- Configuración real de producción (variables, `COOKIE_SECURE`, `SameSite`, `ALLOWED_HOSTS`).
- Escaneo de dependencias (`pip-audit`, `pnpm audit`).
- Pruebas de intrusión, fuerza bruta real o análisis dinámico.
- Contenido completo de `privacy` y `terms`.
- Visibilidad pública del repositorio.
</content>
