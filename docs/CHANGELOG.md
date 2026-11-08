# Changelog

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
