# Auditoría de producto — 2026-11-09

**Producto:** Arreglo (nombre provisional, ver [`BRAND.md`](BRAND.md)).
**Versión auditada:** repositorio local en `main` (estado de [`PROJECT_STATUS.md`](PROJECT_STATUS.md) del 2026-11-08) y landing desplegada en https://saas-gestion-web.vercel.app.
**Pedido:** [`MEJORAS_Y_PROGRESO.txt`](../MEJORAS_Y_PROGRESO.txt) §18 (entregables de auditoría). Los documentos derivados están listados en la sección 9.

## 0. Límites de esta auditoría

Esta auditoría es **estática y parcial**. Conviene leerla con estas limitaciones:

| Sí se hizo | No se hizo |
|---|---|
| Lectura de rutas, servicios, repositorios, modelos, migraciones, middlewares, tests (por nombre) y componentes. | Ejecución de `pytest`, `pnpm test`, `pnpm build` ni `scripts/verify.ps1`. |
| Fetch del HTML visible de la landing y del health check de la API. | Navegación autenticada en la demo. No se usaron las credenciales. |
| Contraste del código con la matriz de [`FEATURE_TRUTH_MATRIX.md`](FEATURE_TRUTH_MATRIX.md). | Capturas, revisión visual en los viewports de MEJORAS §4, Lighthouse, axe. |
| Lectura de la documentación del repo. | Lectura completa de `CONTEXTO_GUIA_PROYECTO.md` (documento maestro, grande). Las referencias a su sección 16 son las de `AGENTS.md`. |
| | Pentest, escaneo de dependencias, prueba de restauración de backups. |

Todo hallazgo que depende de algo no verificado está marcado como tal en el documento correspondiente.

## 1. Resumen ejecutivo

**Qué existe.** Arreglo es una aplicación funcional de punta a punta: registro de empresa, clientes, solicitudes, órdenes, presupuestos con PDF y aprobación pública, agenda con conflictos, pagos parciales, PWA para técnicos, automatizaciones con notificaciones, asistente determinista, planes y suscripciones en modo prueba, panel de plataforma y configuración de WhatsApp Cloud API. El núcleo de autenticación, autorización por rol y aislamiento por tenant está respaldado por tests. Los tests de la API están en `apps/api/tests/` (82 funciones de test detectadas por nombre; no ejecutadas).

**Qué no está listo para uso real por un negocio.**

1. **Confianza comercial.** La landing mezcla datos de ejemplo que se contradicen (OT-0141 duplicado, OT-0142 con tres significados, un presupuesto "aprobado" que aparece "enviado"). Varias promesas no están implementadas: límites de planes, modo offline, "funciona en iPhone" sin prueba, "en vivo".
2. **Seguridad del enlace público.** El token de presupuesto está en texto plano, no vence por defecto, no se puede revocar y el POST de aprobación no tiene rate limit.
3. **Demo pública sin control.** Las credenciales están en la landing y en el login, la cuenta de plataforma figura en la documentación, y no hay reset ni modo de solo lectura.
4. **Dashboard de conteos.** No responde "qué tengo que hacer hoy": no hay atrasos, órdenes sin técnico, ni saldo por orden.
5. **Pendientes de seguridad estructurales:** RLS, 2FA, recuperación de contraseña, verificación de email, CSP del frontend.
6. **Mercado sin validar.** 0 de 10 entrevistas con clientes. El rango de precios de la investigación competitiva no está validado.

**Recomendación.** Antes de cualquier función nueva, cerrar los P0 de [`PRIORITIZED_BACKLOG.md`](PRIORITIZED_BACKLOG.md). Son once tareas. Las dos más urgentes son la demo (`P0-07`) y el enlace público (`P0-08`, `P0-10`), porque son exposición real.

## 2. Stack real

Según el repositorio. Las versiones son las declaradas en [`PROJECT_STATUS.md`](PROJECT_STATUS.md) y no se verificaron contra `package.json` ni `pyproject.toml` en esta revisión.

| Capa | Tecnología | Ubicación |
|---|---|---|
| Frontend web | Next.js 16 (App Router), React 19, TypeScript estricto, Tailwind 4, TanStack Query, React Hook Form + Zod, Three.js (lazy), GSAP, Lenis, Motion | `apps/web/` |
| Backend | FastAPI, Pydantic v2, SQLAlchemy 2 async, Alembic, asyncpg, argon2-cffi, cryptography (Fernet), reportlab (PDF), structlog | `apps/api/` |
| Base de datos | PostgreSQL 17 (local portable en `127.0.0.1:55432`; demo en Neon `gru1`) | `.local/`, Neon |
| Despliegue | Vercel (dos proyectos: web y API); Python 3.12 | `apps/api/vercel.json`, `apps/web/vercel.json` |
| Automatización | Motor propio in-process (sin worker) | `services/automation_service.py` |
| IA | Interfaz `AIProvider`: determinista, OpenAI-compatible (Groq en producción según PROJECT_STATUS), Ollama | `services/ai_providers.py` |
| WhatsApp | Cloud API oficial, cifrado Fernet, webhook con HMAC | `services/whatsapp_service.py` |
| Móvil nativa | **Scaffold Expo sin integrar** (`EditScreenInfo`, `two.tsx`, `modal.tsx`) | `apps/mobile/` |
| CI | GitHub Actions para backend y frontend | `infra/` / `.github/` (no revisado en detalle) |

Nota: `apps/mobile` tiene su propio `AGENTS.md` con reglas de Expo. No es parte de la plataforma en uso. Ver `P2-10`.

## 3. Arquitectura real

```text
Navegador (Next.js en Vercel)
  ├─ Landing pública (/)                       estática con Three.js lazy
  ├─ App (/dashboard, /customers, /orders, …)  client components, TanStack Query
  ├─ PWA técnico (/tech)                       service worker + offline.html
  └─ Enlace público (/q/[token])               sin login
          │  HTTPS, Bearer (access) + cookie HttpOnly (refresh)
          │  Header X-Tenant-ID (validado contra membresía)
          ▼
API FastAPI (Vercel, Python 3.12)
  Middlewares: request_id → rate_limit (auth + GET público) → security_headers
  CORS con lista explícita · TrustedHostMiddleware · docs ocultas en producción
  Routers /api/v1/*  →  services/*  →  repositories/*  →  SQLAlchemy async
          │
          ▼
PostgreSQL (Neon en demo)
  Tenants, usuarios, membresías, clientes, solicitudes, órdenes, presupuestos,
  turnos, pagos, automatizaciones, notificaciones, IA, planes, suscripciones,
  WhatsApp, auditoría, rate limit, tokens de refresh.
```

**Patrones clave**

- Multi-tenant por fila: `tenant_id` derivado de la membresía, no del cuerpo (`api/deps.py`).
- Dinero en `Decimal` y `NUMERIC(14,2)`.
- Historial append-only en `work_order_events` y `quote_events`.
- Automatizaciones dentro de la transacción del evento (ADR-009). Sin reintentos programados.
- IA de sólo lectura por diseño (ADR-010).

**Diferencias con la documentación**

| Tema | Documentación | Código |
|---|---|---|
| Migraciones | `PROJECT_STATUS.md` lista seis (`84e62c6788cb`, `ba3b1d3acd4d`, `50e8c050aada`, `de0e021aa0ca`, `51fc582e7593`, `5ffb8399d836`). | Hay **siete** archivos de migración: se suma `c0cc7ae032ee_add_security_rate_limit_auth_attempt_.py`, que el estado no menciona. Además hay un `.pyc` huérfano de `e8a935a2cf25` sin fuente. Verificar con `alembic heads` y `alembic history` antes de cualquier migración nueva. |
| Límites de planes | Landing y `DATA_MODEL.md` describen límites. | Las claves en DB (`max_users`, `max_orders_per_month`) no tienen referencias en `app/`. Ver F64. |
| Tests | `PROJECT_STATUS.md` declara 83 pytest. | `grep` de `def test_` y `async def test_` devuelve **82**. Puede deberse a parametrizaciones o a una diferencia de conteo. Verificar con `pytest --collect-only`. |
| Trial | Landing: "14 días, en implementación". `SAAS_BILLING.md`: "14 días". | Consistente en 14 días. No hay fecha de fin en el código. Ver `LANDING_AUDIT.md` §5. |

## 4. Rutas

### 4.1. Frontend (`apps/web/src/app`)

| Ruta | Tipo | Estado | Evidencia |
|---|---|---|---|
| `/` | Pública | Implementada, con afirmaciones a corregir | `page.tsx`, `components/marketing/*` |
| `/login`, `/register` | Pública | Implementada; login muestra credenciales demo | `(auth)/*` |
| `/privacy`, `/terms` | Pública | Borradores | `privacy/page.tsx`, `terms/page.tsx` |
| `/q/[token]` | Pública (token) | Implementada | `q/[token]/page.tsx` |
| `/dashboard` | App (owner, admin, dispatcher) | Parcial: conteos | `(app)/dashboard/page.tsx` |
| `/customers` | App | Implementada | `(app)/customers/page.tsx` |
| `/requests` | App | Implementada | `(app)/requests/page.tsx` |
| `/orders`, `/orders/[id]` | App | Implementada | `(app)/orders/*` |
| `/quotes`, `/quotes/[id]` | App | Implementada | `(app)/quotes/*` |
| `/agenda` | App | Implementada | `(app)/agenda/page.tsx` |
| `/payments` | App | Implementada | `(app)/payments/page.tsx` |
| `/assistant` | App | Implementada (determinista) | `(app)/assistant/page.tsx` |
| `/automations` | App (owner, admin) | Implementada | `(app)/automations/page.tsx` |
| `/notifications` | App | Implementada | `(app)/notifications/page.tsx` |
| `/settings/billing` | App (owner) | Implementada, sin cobro | `(app)/settings/billing/page.tsx` |
| `/settings/whatsapp` | App | Esqueleto sin credenciales | `(app)/settings/whatsapp/page.tsx` |
| `/admin` | Plataforma | Implementada, sin gestión de admins | `(app)/admin/page.tsx` |
| `/tech`, `/tech/orders/[id]` | Técnico (PWA) | Implementada; sin prueba en dispositivos | `tech/*` |
| `sitemap.ts`, `robots.ts`, `opengraph-image.tsx`, `not-found.tsx`, `error.tsx` | Sistema | Presentes | `src/app/` |

### 4.2. API (`apps/api/app/api/routes`)

| Prefijo | Endpoints | Roles (lectura / escritura) |
|---|---|---|
| `/health` | `GET /live`, `GET /ready` | Público |
| `/auth` | `POST /register`, `POST /login`, `POST /refresh`, `POST /logout`, `GET /me` | Público; refresh y logout validan `Origin` |
| `/tenants` | `GET`, `POST` | Autenticado |
| `/customers` | `GET`, `POST`, `GET /{id}`, `PATCH /{id}`, `DELETE /{id}` (lógico) | Lectura: todos los roles. Escritura: owner, admin, dispatcher. Borrado: owner, admin |
| `/service-requests` | `GET`, `POST`, `GET /{id}`, `PATCH /{id}`, conversión | Lectura: todos los roles (incluye técnico y viewer, según `READ_ROLES`). Escritura: owner, admin, dispatcher |
| `/work-orders` | `GET`, `POST`, `GET /{id}`, `PATCH /{id}`, `POST /{id}/transition`, `GET /{id}/events` | Escritura: owner, admin, dispatcher (verificar por endpoint) |
| `/quotes` | `GET`, `POST`, `GET /{id}`, `PATCH /{id}`, `POST /{id}/send`, `/approve`, `/reject`, `GET /{id}/pdf`, `GET /{id}/events` | Lectura: owner, admin, dispatcher. Escritura: owner, admin, dispatcher |
| `/public/quotes` | `GET /{token}`, `POST /{token}/approve`, `POST /{token}/reject` | Público por token. Sólo GET con rate limit |
| `/appointments` | `GET`, `POST`, `GET /{id}`, `PATCH /{id}`, `POST /{id}/cancel` | Lectura: todos. Escritura: owner, admin, dispatcher |
| `/payments` | `GET`, `POST`, `POST /{id}/void` | Owner, admin, dispatcher |
| `/technicians` | `GET` | Owner, admin, dispatcher |
| `/technician` | `GET /work-orders`, `GET /{id}`, `POST /{id}/transition`, `POST /{id}/notes`, `GET`/`POST` materiales, `GET`/`POST` adjuntos, `GET /{id}/attachments/{aid}` | Sólo técnico, sobre sus órdenes |
| `/dashboard` | `GET /summary` | Owner, admin, dispatcher |
| `/billing` | `GET /plans`, `GET /subscription`, `POST /subscription/change` | Owner (cambio) |
| `/admin` | `GET /tenants`, `GET /metrics`, `POST /tenants/{id}/subscription` | Platform admin |
| `/automations` | CRUD, `POST /{id}/toggle`, `GET /executions` | Owner, admin |
| `/notifications` | `GET`, `POST /{id}/read`, `POST /read-all` | Según rol y usuario |
| `/ai` | `GET /status`, `POST /chat`, `GET /usage` | Autenticado, con cuota |
| `/whatsapp` | `GET`/`PUT /config`, `GET /messages`, `POST /send` | Owner, admin (verificar) |
| `/whatsapp` (webhook) | `GET`, `POST` con firma HMAC | Público con firma |

Total aproximado: alrededor de 80 endpoints (conteo manual sobre los decoradores `@router`). El detalle exacto de roles por endpoint está en los routers y no se verificó uno por uno.

## 5. Módulos y estado

Estado resumido. El detalle de cada funcionalidad, con evidencia y limitaciones, está en [`FEATURE_TRUTH_MATRIX.md`](FEATURE_TRUTH_MATRIX.md).

| Módulo | Estado | Comentario |
|---|---|---|
| Autenticación y sesiones | Implementada y probada | Argon2id, refresh rotativo con reuso, lockout, Origin. Falta recuperación y verificación. |
| Multi-tenant y RBAC | Implementada y probada | Sin RLS. Cobertura de aislamiento en la mayoría de los módulos. |
| Clientes | Implementada y probada | Búsqueda sin test de UI. |
| Solicitudes | Implementada y probada | Conversión a orden probada. |
| Órdenes | Implementada y probada | Tablero sin filtros operativos. |
| Presupuestos y aprobación pública | Implementada y probada | Token en claro, sin vencimiento por defecto, sin revocación. |
| Agenda | Implementada y probada | Vista de día; sin vista semanal. |
| Pagos | Implementada y probada | Saldo calculado a nivel empresa. |
| PWA técnico | Parcial | Probada por tests de API; sin prueba en dispositivos; sin offline con sincronización. |
| Automatizaciones y notificaciones | Implementada y probada | Sin worker ni reintentos. `send_whatsapp` queda `skipped`. |
| Asistente de IA | Implementada | Determinista probado; externo con mocks; cuota con test. |
| Planes y suscripciones | Parcial | Trial sin fin, sin cobro, sin enforcement de límites. |
| Panel de plataforma | Implementada | Sin UI para administrar admins. |
| WhatsApp | Parcial | Configuración cifrada y webhook probados con mocks. Sin credenciales ni estados de entrega. |
| Dashboard | Parcial | Ver [`DASHBOARD_AUDIT.md`](DASHBOARD_AUDIT.md). |
| Landing | Implementada con inconsistencias | Ver [`LANDING_AUDIT.md`](LANDING_AUDIT.md). |
| Demo | Parcial, riesgosa | Ver [`DEMO_ENVIRONMENT.md`](DEMO_ENVIRONMENT.md). |
| Importación, exportación, reportes, portal cliente, reservas, RLS, 2FA, correo | No encontradas o planificadas | Ver matriz. |
| App móvil nativa | Scaffold sin integrar | `apps/mobile`. |

## 6. Riesgos

Ordenados por impacto. Cada uno tiene identificador en la auditoría correspondiente.

| # | Riesgo | Severidad | Fuente | Tarea |
|---|---|---|---|---|
| 1 | Demo pública con credenciales expuestas y cuenta de plataforma documentada. | Alta | S-06, S-16, D-02 | `P0-07` |
| 2 | Enlaces públicos de presupuesto sin vencimiento por defecto, sin revocación, token en claro. | Alta | S-01, S-02, S-03 | `P0-10`, `P1-14` |
| 3 | Límites de plan sin enforcement y promesas de la landing sobre ellos. Riesgo de costo y de confianza. | Alta | F64, S-13 | `P0-05`, `P1-01` |
| 4 | Afirmaciones de la landing no verificadas o falsas (datos ilustrativos contradictorios, offline, iPhone). | Alta | `LANDING_AUDIT.md` | `P0-02` a `P0-04` |
| 5 | Backups y restauración de Neon no verificados. | Alta | S-14 | `P1-17` |
| 6 | Declaraciones legales en borrador; Ley 25.326 pendiente. | Alta (legal) | S-15 | `P0-09` |
| 7 | Saldo a nivel empresa: puede esconder déficits por orden. | Media | F37 | `P1-02` |
| 8 | Dashboard sin métricas operativas: el dueño no ve lo urgente. | Media | `DASHBOARD_AUDIT.md` | `P0-06`, `P1-04` |
| 9 | Ausencia de recuperación de contraseña y de verificación de email. | Media | S-09, S-10 | `P1-08` |
| 10 | Validación de archivos por tipo declarado. | Media | S-05 | `P1-09` |
| 11 | Sin RLS: un filtro omitido expone datos. | Media (defensa en profundidad) | S-07 | `P2-05` |
| 12 | Afirmaciones erróneas en documentación interna (entrevistas "validadas", dominios). | Media | B-01 a B-03 | `P0-11` |
| 13 | Sin 2FA para cuentas con acceso a finanzas. | Media | S-08 | `P2-06` |
| 14 | PWA del técnico sin prueba en Android e iOS y con nombre de otra marca. | Media | F43 | `P1-12` |
| 15 | Contraste y accesibilidad sin medir. | Media | `UX_IMPROVEMENTS.md` §11 | `P1-10` |
| 16 | Migraciones: documentación de la cadena no coincide con el repo. | Baja (si hay un solo entorno) | §3 | Verificar con `alembic heads` |
| 17 | Mercado sin validar: 0 entrevistas. | Alta (comercial) | `CUSTOMER_RESEARCH.md` | `P1-18` |

## 7. Lo que está bien

Conviene conservarlo tal como está:

- **Aislamiento y permisos.** `require_roles` y `get_current_membership` centralizan el control. Hay tests de aislamiento en los módulos principales.
- **Dinero.** `Decimal` y `NUMERIC(14,2)` en todo el flujo. Tests de totales exactos y de desbordamiento.
- **Historial.** Eventos append-only en órdenes y presupuestos.
- **Aprobación pública.** Bloqueo con `FOR UPDATE` y verificación de estado (`sent`) antes de aprobar. Test de no regresión de una orden aprobada.
- **Sesiones.** Refresh rotativo con revocación de familia ante reuso. Cookies `HttpOnly`. Validación de `Origin`.
- **Configuración segura.** La API se niega a arrancar en producción con CORS de localhost o JWT débil (test).
- **Transparencia comercial en partes.** La landing aclara que la prueba no cobra y que WhatsApp necesita credenciales.
- **Asistente honesto.** Responde con datos reales del tenant y avisa cuando el proveedor externo falla (`test_chat_fallback_is_honest`).
- **Automatizaciones con idempotencia** por `rule_id:event_id`.
- **Webhook de WhatsApp** con firma HMAC y deduplicación.

## 8. Próximos pasos

Orden recomendado. Los P0 se detallan en [`PRIORITIZED_BACKLOG.md`](PRIORITIZED_BACKLOG.md).

| Paso | Qué | Tareas | Criterio de salida |
|---|---|---|---|
| 1 | Ejecutar verificación real y registrar la línea base. | `P0-01` | Los seis comandos canónicos terminan con código 0. |
| 2 | Cerrar la exposición de la demo. | `P0-07` | Sin credenciales en landing y login; sin cuenta de plataforma en la base pública. |
| 3 | Cerrar el enlace público. | `P0-08`, `P0-10` | Vencimiento por defecto, revocación, rate limit en POST y lista blanca de campos, con tests. |
| 4 | Corregir la landing. | `P0-02`, `P0-03`, `P0-04`, `P0-05` | Dataset compartido y validado; sin "en vivo"; un solo texto de prueba; límites rotulados o aplicados. |
| 5 | Definir métricas y rótulos del dashboard. | `P0-06` | Tooltips con definición exacta; sin rótulos engañosos. |
| 6 | Revisión legal y corrección de docs internas. | `P0-09`, `P0-11` | Declaraciones con evidencia; sin afirmaciones de validación no respaldadas. |
| 7 | Primer bloque de P1 de uso diario. | `P1-02`, `P1-04`, `P1-06`, `P1-05` | Saldo por orden; "atención requerida"; estados vacíos; pantalla de inicio del técnico. |
| 8 | Medición. | `P1-10`, `P1-11`, `P1-17` | Axe, Core Web Vitals y restauración de backup con cifras registradas. |
| 9 | Entrevistas. | `P1-18` | Diez registros reales antes de tomar decisiones de precio o de P3. |

**Decisiones que requieren al responsable del producto** (no se toman en esta auditoría):

1. ¿La demo se separa en otra base (`B` de `DEMO_ENVIRONMENT.md` §6) o se mantiene en la misma con reset (`A`)?
2. ¿`dispatcher` ve finanzas globales o no?
3. ¿Cuál es la fuente de verdad de precios y límites? (`P0-05`).
4. ¿Se elige proveedor de correo y de almacenamiento de archivos? (`P2-03`, `P2-09`).
5. ¿Se retira `apps/mobile` o se integra? (`P2-10`).
6. ¿Se publica el repositorio o se mantiene privado? Afecta la urgencia de `P0-07` (S-16).

## 9. Documentos generados por esta auditoría

| Documento | Contenido |
|---|---|
| [`PRODUCT_AUDIT_2026-11-09.md`](PRODUCT_AUDIT_2026-11-09.md) | Este documento. |
| [`LANDING_AUDIT.md`](LANDING_AUDIT.md) | Hero, recorrido, funcionalidades, demo, precios, FAQ, consistencia de datos, accesibilidad, performance. |
| [`DASHBOARD_AUDIT.md`](DASHBOARD_AUDIT.md) | Qué responde el dashboard, métricas, roles, propuesta de atención requerida. |
| [`UX_IMPROVEMENTS.md`](UX_IMPROVEMENTS.md) | Mejoras por pantalla con criterios de aceptación. |
| [`FEATURE_TRUTH_MATRIX.md`](FEATURE_TRUTH_MATRIX.md) | Matriz de veracidad: 74 funcionalidades con estado, evidencia y limitaciones. |
| [`COMPETITOR_BENCHMARK.md`](COMPETITOR_BENCHMARK.md) | Comparación con las fuentes de `COMPETITIVE_ANALYSIS.md`, sin datos nuevos. |
| [`SECURITY_AUDIT.md`](SECURITY_AUDIT.md) | Controles implementados, pendientes y hallazgos S-01 a S-20. |
| [`DEMO_ENVIRONMENT.md`](DEMO_ENVIRONMENT.md) | Estado de la demo, riesgos, propuesta de reset y modo de solo lectura. |
| [`PRIORITIZED_BACKLOG.md`](PRIORITIZED_BACKLOG.md) | Backlog P0 a P3 con ID, justificación, dependencias, criterios y pruebas. |

Estos documentos no modifican `PROJECT_STATUS.md`, `CHANGELOG.md` ni `KNOWN_ISSUES.md`. Si el responsable lo decide, esos archivos se actualizan en una tarea aparte.

## 10. Documentos existentes con correcciones pendientes

Estos no se tocaron en esta auditoría (la instrucción fue crear sólo los nuevos):

| Documento | Corrección |
|---|---|
| `docs/COMPETITIVE_ANALYSIS.md` línea 238 | Quitar "validado en entrevistas" (B-01). |
| `MEJORAS_Y_PROGRESO.txt` §9 | Corregir dominios de OrdenSoft y GestiónPro (B-02, B-03). La referencia a `docs/MEJORAS...` no existe: el archivo está en la raíz. |
| `docs/PROJECT_STATUS.md` | Actualizar cantidad de migraciones (7 archivos) y de tests (verificar 82 frente a 83). Agregar el estado de demo y de límites. |
| `docs/DEMO.md`, `README.md`, `docs/MOBILE_API.md` | Quitar contraseñas en texto (S-16). |
| `docs/KNOWN_ISSUES.md` | Agregar: límites sin enforcement, trial sin fin, sin RLS, PWA sin prueba en dispositivos. |
| `docs/SECURITY.md` | El apartado "Controles implementados" no menciona el token de presupuesto en claro ni la falta de expiración. |

## 11. Qué se verificó y qué queda pendiente de verificar

| Afirmación | Verificado por lectura | Verificado por ejecución |
|---|---|---|
| La landing desplegada responde y muestra las secciones descritas. | Sí (fetch). | No (sin navegador). |
| La API desplegada responde `ready`. | Sí (fetch). | — |
| Las rutas, endpoints y roles de la sección 4. | Sí (lectura de routers y deps). | No. |
| Los tests existen con los nombres citados. | Sí (grep). | No (no se ejecutaron). |
| El dashboard muestra las métricas de la sección 1 de `DASHBOARD_AUDIT.md`. | Sí (código). | No (sin sesión). |
| Los hallazgos L-01 a L-09. | Sí (código y HTML desplegado). | — |
| Las contraseñas de la demo funcionan. | No. | No (no se hizo login). |
| El token de presupuesto está en claro. | Sí (modelo y repositorio). | No (sin acceso a la base). |
| Argon2id, cookies HttpOnly y validación de `Origin` funcionan. | Sí (código). | No. |
| Los backups de Neon se pueden restaurar. | No. | No. |
| Compatibilidad PWA en Android e iOS. | No. | No. |
| Performance y Core Web Vitals. | No. | No. |
</content>
