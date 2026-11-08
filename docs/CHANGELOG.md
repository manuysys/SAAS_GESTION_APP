# Changelog

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
