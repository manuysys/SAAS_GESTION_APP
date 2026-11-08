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
