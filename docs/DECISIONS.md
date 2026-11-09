# Decisiones técnicas (ADR)

Registro breve de decisiones. Cada entrada indica contexto, decisión y
consecuencias. Si una decisión se reemplaza, marcar la anterior como obsoleta.

## ADR-001 — Monorepo con `apps/web` y `apps/api`

**Fecha:** 2026-11-07
**Estado:** aceptada

**Contexto:** frontend y backend evolucionan juntos y comparten contrato OpenAPI.

**Decisión:** un solo repositorio con `apps/web` (Next.js) y `apps/api`
(FastAPI), más `docs/`, `scripts/`, `infra/` y `.opencode/`.

**Consecuencias:** despliegues independientes, versionado coordinado, un solo
lugar para documentación y agentes.

## ADR-002 — Next.js + FastAPI + PostgreSQL

**Fecha:** 2026-11-07
**Estado:** aceptada

**Contexto:** el fundador domina Python, FastAPI, Next.js y React; el producto
necesita API robusta, tipado y ecosistema maduro.

**Decisión:** Next.js (App Router, TypeScript estricto, Tailwind) para web;
FastAPI + Pydantic + SQLAlchemy + Alembic para API; PostgreSQL como base
relacional.

**Consecuencias:** dos runtimes, contrato OpenAPI como fuente de verdad,
generación de cliente TypeScript.

## ADR-003 — Autenticación self-hosted

**Fecha:** 2026-11-07
**Estado:** aceptada

**Contexto:** se evaluó Supabase Auth. El fundador priorizó control y evitar
dependencia de un proveedor.

**Decisión:** autenticación propia en FastAPI: Argon2id para contraseñas, JWT de
acceso de corta duración, refresh token rotativo, cookies `HttpOnly`, rate
limiting y auditoría.

**Consecuencias:** más trabajo inicial y responsabilidad de seguridad, pero
control total y posibilidad de migrar a un proveedor externo mediante un
adaptador.

## ADR-004 — PostgreSQL portable para desarrollo local

**Fecha:** 2026-11-07
**Estado:** aceptada

**Contexto:** Docker Desktop está instalado pero sin WSL/Hyper-V operativo. El
contexto exige no depender de Docker.

**Decisión:** usar binarios portables de PostgreSQL 17.11 en `.local/postgres`,
con `initdb` en `.local/pgdata`, puerto 55432 y scripts de inicio/parada.

**Consecuencias:** entorno reproducible sin admin ni Docker; en producción se
usará un PostgreSQL administrado o contenedor, con la misma versión mayor.

## ADR-005 — Dinero con `Decimal` y `NUMERIC`

**Fecha:** 2026-11-07
**Estado:** aceptada

**Decisión:** todos los importes se representan con `Decimal` en Python y
`NUMERIC(14,2)` en PostgreSQL. Nunca `float`.

**Consecuencias:** cálculos exactos; el frontend formatea con
`Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' })`.

## ADR-006 — Multi-tenancy por `tenant_id` + validación en backend

**Fecha:** 2026-11-07
**Estado:** aceptada

**Decisión:** cada entidad de negocio tiene `tenant_id`; todos los repositorios y
endpoints lo aplican desde la sesión autenticada. Se evaluará RLS como defensa
en profundidad.

**Consecuencias:** pruebas de aislamiento obligatorias; nunca confiar en el
`tenant_id` enviado por el cliente.

## ADR-007 — OpenCode con subagentes especializados

**Fecha:** 2026-11-07
**Estado:** aceptada

**Decisión:** usar agentes `backend`, `frontend`, `database`, `security`, `qa`,
`research`, `docs`, `reviewer` y `devops`, con permisos acotados por carpeta y
modelos según la tarea.

**Consecuencias:** trabajo paralelo con archivos disjuntos; revisión cruzada;
mayor consumo de tokens, controlado por modelos económicos en tareas mecánicas.

## ADR-008 — Presupuestos con ítems históricos y aprobación pública

**Fecha:** 2026-11-08
**Estado:** aceptada

**Contexto:** el presupuesto debe conservar precios y conceptos aunque cambie
el catálogo, y el cliente debe poder aprobarlo sin crear una cuenta.

**Decisión:**

- `quotes` guarda totales calculados con `Decimal`/`Numeric(14,2)`.
- `quote_items` guarda una copia histórica de descripción, cantidad, precio,
  descuento, impuesto y total de línea.
- El número es `QT-YYYY-0001`, único por tenant.
- Cada presupuesto tiene un `public_token` URL-safe aleatorio.
- Los endpoints públicos `/api/v1/public/quotes/{token}` no requieren auth y
  solo exponen los datos del presupuesto, sin IDs internos.
- Estados: `draft → sent → approved/rejected`; no se aprueba un borrador.
- Al enviar/aprobar/rechazar se actualiza `work_orders.commercial_status`.
- El PDF se genera con `reportlab` y se sirve autenticado.

**Consecuencias:** el enlace público es un bearer secreto; no debe compartirse
públicamente. El PDF no reemplaza la aprobación registrada en el sistema.

## ADR-009 — Automatizaciones in-process con eventos de dominio

**Fecha:** 2026-11-08
**Estado:** aceptada

**Contexto:** el MVP necesita reaccionar a eventos de negocio sin introducir
Kafka, Redis ni un worker separado.

**Decisión:** emitir eventos dentro de la transacción del servicio de negocio y
ejecutar reglas activas en un savepoint. Cada ejecución tiene
`idempotency_key = rule_id:event_id`, estado y error. Las acciones iniciales son
`notify` y `notify_user`; `send_whatsapp` queda `skipped` hasta configurar la
integración. No hay outbox ni reintentos programados todavía.

**Consecuencias:** simple y transaccional; si el proceso se cae, no hay
reintento automático. Para producción con volumen se evaluará outbox + worker.

## ADR-010 — IA desacoplada con proveedor determinista por defecto

**Fecha:** 2026-11-08
**Estado:** aceptada

**Contexto:** no hay API key de un proveedor externo y el producto no debe
depender de un vendedor.

**Decisión:** interfaz `AIProvider` con tres implementaciones:
`DeterministicProvider` (local, sin red, responde intenciones frecuentes con
datos reales), `OpenAICompatibleProvider` y `OllamaProvider`. El proveedor se
elige con `AI_PROVIDER`. Se registran tokens y costo estimado por tenant. La IA
no ejecuta acciones ni recibe SQL libre; solo recibe un snapshot del negocio.

**Consecuencias:** la demo funciona sin claves y sin simular un LLM. Las
respuestas deterministas son limitadas y se informa claramente el modo.

## ADR-011 — Suscripciones con precio histórico y panel global

**Fecha:** 2026-11-08
**Estado:** aceptada

**Decisión:** `plans` guarda el precio de lista; `subscriptions` guarda
`price_snapshot` para no alterar contratos existentes. El registro crea una
suscripción `trialing` al plan Starter si existe. El panel global requiere
`is_platform_admin` o un email en `PLATFORM_ADMIN_EMAILS` y muestra métricas
agregadas, no datos de clientes.

**Consecuencias:** el enforcement de límites es parcial; los cobros reales con
Mercado Pago quedan para una etapa posterior.

## ADR-012 — WhatsApp Cloud API oficial con secretos cifrados

**Fecha:** 2026-11-08
**Estado:** aceptada

**Decisión:** usar la API oficial de WhatsApp Business. Los tokens y secretos
por tenant se cifran con Fernet usando `WHATSAPP_ENCRYPTION_KEY`. El webhook
valida `X-Hub-Signature-256` con HMAC SHA-256 y es idempotente por
`wa_message_id`. No se automatiza WhatsApp Web ni se simulan envíos.

**Consecuencias:** sin credenciales de Meta no se puede probar end-to-end. La
plataforma sigue funcionando si WhatsApp no está configurado.

## ADR-013 — Rate limiting en memoria para una instancia

**Fecha:** 2026-11-08
**Estado:** aceptada

**Decisión:** limitar login, registro, refresh y enlaces públicos con una
ventana deslizante en memoria. Se configura por variables de entorno y se
desactiva en pruebas.

**Consecuencias:** suficiente para desarrollo y una sola instancia. En
producción con varias instancias hace falta Redis/Upstash o el rate limiting del
proveedor.

## ADR-014 — Frontend y API en Vercel, PostgreSQL en Neon

**Fecha:** 2026-11-08
**Estado:** aceptada

**Contexto:** la demo dependía de una máquina local y un túnel rápido de
Cloudflare, sin uptime ni URL estable.

**Decisión:** desplegar el frontend Next.js y la API FastAPI como proyectos
separados de Vercel. La API usa el preset FastAPI zero-config, `app/main.py`
como entrypoint, Python 3.12 y `requirements.txt`. PostgreSQL se provisiona con
el marketplace de Neon (plan Free, región `gru1`) y las migraciones se ejecutan
con la conexión directa. En producción la API usa `NullPool` y asyncpg con
`ssl=require`.

**Consecuencias:** la demo queda disponible sin depender de una PC. Los planes
gratuitos tienen límites, cold starts y una ventana de restauración acotada. Para
producción se necesita un plan pago, dominio propio, backups verificados y rate
limiting compartido.
