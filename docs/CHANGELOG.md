# Changelog

## 2026-11-10 — App móvil Android, portal del cliente y dashboard operativo

- App Expo / React Native (SDK 58) para Android en `apps/mobile`, con dos
  experiencias: técnico y cliente. No es un wrapper web.
- Técnico: login, trabajos asignados con filtros, detalle, transiciones,
  llamada al cliente, dirección, notas, materiales, fotos, cola offline con
  idempotencia y registro de push.
- Cliente: login por email o teléfono con magic link (token de desarrollo en la
  demo), resumen, solicitud de servicio, órdenes, turnos, presupuestos con
  aprobación/rechazo, pagos y detalle con ítems.
- Backend: `POST /auth/mobile/login|refresh|logout`, `/notifications/devices`,
  `/portal/{slug}/*`, direcciones de cliente, `portal_settings`, push con Expo y
  `client_request_id` en notas, materiales y adjuntos.
- Migración `76aba18b0e16` aplicada en Neon: `customer_access_tokens`,
  `device_tokens`, direcciones, `portal_settings` y constraints de idempotencia.
- Trial de suscripción alineado a 14 días.
- Dashboard operativo: `GET /dashboard/operations` con turnos de hoy, órdenes
  atrasadas, sin técnico, presupuestos por vencer y trabajos finalizados con
  saldo; nueva UI de centro de operaciones.
- Landing P0: dataset único `demo-data.ts`, IDs y estados coherentes, 27 tests de
  integridad, copy honesto sobre IA/offline/WhatsApp/trial y FAQ ampliado.
- Nueve documentos de auditoría, matriz de verdad, benchmark y backlog
  priorizado en `docs/`.
- Android SDK local, scripts de entorno, CI móvil y guía de build.
- APK release arm64 generado en GitHub Actions y publicado como release
  `mobile-apk-3` (30.8 MB, firma de debug).
- Límite de órdenes por mes del plan aplicado en creación y conversión de
  solicitudes.
- Revocación del enlace público de presupuestos y rate limit también en
  aprobación/rechazo.
- 99 pruebas pytest y 95 pruebas de frontend.

## 2026-11-09 — Landing Arreglo, Groq y design system

- Marca provisional **Arreglo** centralizada en `apps/web/src/lib/brand.ts`.
- Landing v2 oscura: hero full-bleed ink, Three.js isométrico lazy, scanlines,
  tarjetas flotantes, contadores animados, marquee y CTA final con grilla.
- GSAP ScrollTrigger con recorrido fijado, Lenis smooth scroll, tilt 3D y Motion
  para microinteracciones; fallback SVG y `prefers-reduced-motion`.
- Landing nueva con hero, recorrido, bento de funciones, product tour, precios,
  FAQ, CTA, páginas de privacidad/términos, sitemap, robots y OG image.
- Design system inicial: Button, Card, Badge, Input, PageHeader, EmptyState,
  Skeleton, StatCard, Dialog, Tabs, Tooltip y DropdownMenu.
- Panel: sidebar ink, command palette (`⌘K`), notificaciones en popover,
  dashboard con hero oscuro, anillos de salud operativa y actividad reciente.
- Clientes, órdenes (tablero + tabla), presupuestos, pagos, agenda y solicitudes
  renovados con métricas, badges y menos superficies blancas.
- PWA técnico: filtros por estado, cards y shell renovados.
- Presupuesto público: nueva identidad, confirmación de rechazo con Dialog y
  barra de decisión sticky.
- Login/registro con identidad Arreglo y cuenta demo visible.
- **Groq** configurado como proveedor de IA externo
  (`openai/gpt-oss-120b`), con fallback determinista ante cuota agotada.
- `APIKEYS.txt` movido a `.local` y agregado a `.gitignore`.
- Documentación: `docs/BRAND.md`, `docs/PRODUCTION_CHECKLIST.md` y ADR-015.
- Seguridad P0: rate limiting compartido en PostgreSQL, lockout, revocación de
  familia de refresh tokens, audit log, validación de Origin, request ID,
  TrustedHost y docs ocultos en producción.
- Migración `c0cc7ae032ee` con `rate_limit_buckets`, `auth_attempts` y
  `audit_logs`.
- CI de seguridad con `pip-audit` y `pnpm audit`, Dependabot y workflow de
  backup diario de Neon.
- 83 pruebas pytest y 70 pruebas de frontend.

## 2026-11-08 — Despliegue 24/7 en Vercel + Neon

- PostgreSQL administrado en Neon (plan Free, región `gru1`).
- API FastAPI desplegada en Vercel con runtime Python 3.12 y preset FastAPI.
- Migraciones Alembic aplicadas contra Neon.
- Frontend Vercel apuntando a la API persistente.
- Cookies cross-site `SameSite=None; Secure` verificadas con refresh de sesión.
- Demo pública sin túnel ni dependencia de la máquina local.
- Datos demo cargados en Neon: clientes, solicitudes, órdenes, presupuestos,
  turno, pago, suscripción, automatización y notificación.
- `requirements.txt`, `.python-version` y `vercel.json` para el deploy de la API.

## 2026-11-08 — PWA, automatizaciones, IA, suscripciones y WhatsApp

- PWA para técnicos: `/tech`, detalle, transiciones, notas, materiales y fotos.
- Modelos `work_order_materials` y `work_order_attachments` con migración
  `51fc582e7593`.
- Automatizaciones: `automation_rules`, `automation_executions`, eventos de
  dominio, condiciones, acciones, idempotencia e historial.
- Notificaciones in-app con campana, contador y lectura individual/masiva.
- Asistente de IA con proveedor determinista, OpenAI-compatible y Ollama,
  cuotas, uso y costo estimado.
- Planes, suscripciones con precio histórico, uso y panel global del SaaS.
- WhatsApp Cloud API: configuración cifrada, webhook con firma HMAC, mensajes
  idempotentes y envío de texto.
- Rate limiting en memoria y cabeceras de seguridad.
- Migración `5ffb8399d836` con automatizaciones, notificaciones, IA,
  suscripciones, WhatsApp y `users.is_platform_admin`.
- Frontend: `/automations`, `/notifications`, `/assistant`, `/settings/billing`,
  `/settings/whatsapp` y `/admin`.
- CI, backups, restore y healthcheck.
- Investigación competitiva con fuentes oficiales al 2026-11-08.
- 73 pruebas pytest y 61 pruebas de frontend.

## 2026-11-08 — Despliegue público temporal

- Frontend en Vercel: `https://saas-gestion-web.vercel.app`.
- API local expuesta por túnel de Cloudflare.
- Tenant demo con clientes, solicitudes, órdenes, presupuestos, turno, pago,
  suscripción y automatización.
- Registro y alta de cliente probados desde el dominio público.

## 2026-11-08 — Agenda, técnicos, pagos y dashboard

- Modelos `appointments` y `payments`.
- Migración `de0e021aa0ca_add_appointments_and_payments`.
- Agenda con detección de conflictos, reprogramación y cancelación.
- Asignación de técnicos a órdenes y turnos.
- Pagos manuales, parciales y anulación con recálculo de `payment_status`.
- Endpoint `GET /api/v1/technicians` y `GET /api/v1/dashboard/summary`.
- Frontend: agenda diaria, pagos, asignación de técnico en órdenes y dashboard
  con métricas reales.
- Navegación por rol para ocultar módulos financieros a técnicos y viewers.
- 37 pruebas pytest y 22 pruebas de frontend; flujo completo probado en navegador.

## 2026-11-08 — Presupuestos, PDF y aprobación pública

- Modelos `quotes`, `quote_items` y `quote_events`.
- Migración `50e8c050aada_add_quotes_and_quote_items`.
- Cálculos con `Decimal`/`Numeric`, ítems históricos y numeración `QT-YYYY-0001`.
- Endpoints internos de presupuestos: alta, edición en borrador, envío,
  aprobación, rechazo, eventos y PDF.
- Endpoints públicos por token para consultar, aprobar o rechazar.
- Actualización automática del estado comercial de la orden asociada.
- Frontend: listado, alta con ítems dinámicos, detalle, PDF, link público y
  página pública `/q/[token]`.
- Dashboard con presupuestos pendientes.
- Endurecimiento: `viewer` sin acceso, bloqueo de fila para decisiones
  concurrentes, vencimiento, límites de importes y validación cliente–orden.
- 23 pruebas pytest y 9 pruebas de frontend; flujo completo probado en navegador.

## 2026-11-08 — Solicitudes y órdenes de trabajo

- Modelos `service_requests`, `work_orders` y `work_order_events`.
- Migración `ba3b1d3acd4d_add_service_requests_and_work_orders`.
- Endpoints de solicitudes: listado, alta, edición y conversión a orden.
- Endpoints de órdenes: listado, alta, edición, transición de estado y eventos.
- Reglas de transición y permisos especiales para técnicos.
- Frontend: listado/alta de solicitudes, conversión a orden, listado de órdenes
  y detalle con transiciones e historial.
- Dashboard con métricas de clientes, solicitudes y órdenes.
- 11 pruebas pytest y flujo completo probado en navegador.

## 2026-11-08 — Vertical slice inicial

- Backend FastAPI con autenticación self-hosted (Argon2id + JWT + refresh rotativo).
- Multi-tenancy por `X-Tenant-ID` validado contra membresías.
- CRUD de clientes con aislamiento entre tenants.
- Migración inicial Alembic con `tenants`, `users`, `memberships`,
  `refresh_tokens` y `customers`.
- 8 pruebas pytest (health, auth, clientes, aislamiento).
- Frontend Next.js 16 con landing, registro, login, dashboard y clientes.
- Contexto de autenticación con refresh automático y selector de empresa.
- Vitest, ESLint, TypeScript estricto y build de producción.
- `scripts/verify.ps1` pasa completo.
- Prueba manual en navegador del flujo registro → dashboard → alta de cliente.
- Primer push a `https://github.com/manuysys/SAAS_GESTION_APP` (`main`).

## 2026-11-07 — Preparación del entorno

- Lectura completa del contexto maestro.
- Auditoría del entorno local.
- Inicialización del repositorio Git y remoto `origin`.
- `AGENTS.md` con instrucciones permanentes.
- Documentación base: producto, PRD, arquitectura, modelo de datos, seguridad,
  multi-tenancy, roadmap, despliegue y estado.
- Instalación de GitHub CLI y `fnm` con Node 24 LTS.
- Instalación de Python 3.12 vía `uv`.
- Descarga y configuración de PostgreSQL 17.11 portable.
- Configuración de OpenCode: MCP, agentes, skills y comandos.
- Scripts de base de datos y verificación.

## 2026-11-06 — Origen

- Creación del repositorio vacío `SAAS_GESTION_APP`.
- Incorporación del documento de contexto del proyecto.
