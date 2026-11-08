# SaaS Gestión

Plataforma SaaS B2B de gestión, automatización e inteligencia para empresas de
servicios técnicos: CRM, solicitudes, órdenes de trabajo, presupuestos, agenda,
pagos, comunicaciones y automatizaciones en un solo lugar.

> **Estado:** entorno en preparación. Todavía no hay aplicación ejecutable.
> La fuente de verdad del avance es [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md).

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js (App Router), React, TypeScript estricto, Tailwind CSS, shadcn/ui |
| Backend | Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2, Alembic |
| Base de datos | PostgreSQL 17 |
| Autenticación | Self-hosted: Argon2id + JWT + refresh rotativo |
| Archivos | Adaptador local en desarrollo; S3-compatible en producción |
| IA | Interfaz desacoplada; Ollama en desarrollo, proveedores externos en producción |
| Automatizaciones | Motor propio basado en eventos; n8n solo como orquestador auxiliar |
| WhatsApp | API oficial de WhatsApp Business Platform (etapa posterior) |

## Requisitos

- Windows 10/11 con PowerShell 5.1 o superior.
- Git.
- Node.js 24 LTS (gestionado con `fnm`).
- pnpm 12+.
- Python 3.12 (gestionado con `uv`).
- PostgreSQL 17 (binarios portables locales; no requiere Docker).
- Opcional: Ollama para pruebas de IA locales.

## Inicio rápido

```powershell
# 1. Dependencias de Node
fnm use
pnpm install

# 2. Backend
cd apps/api
uv sync

# 3. Base de datos local
cd ../..
.\scripts\db-start.ps1
cd apps/api
uv run alembic upgrade head

# 4. Desarrollo
cd ../..
.\scripts\dev.ps1
```

La aplicación web queda en `http://localhost:3000` y la API en
`http://localhost:8000`, con documentación OpenAPI en `/docs`.

## Estructura

```text
apps/
  web/          Frontend Next.js
  api/          Backend FastAPI
docs/           Producto, arquitectura, seguridad y operación
scripts/        Automatización local
infra/          Despliegue y CI
.opencode/      Agentes, skills, comandos y MCP del proyecto
.local/         Entorno local no versionado
```

## Documentación

- [Contexto maestro](CONTEXTO_GUIA_PROYECTO.md)
- [Estado del proyecto](docs/PROJECT_STATUS.md)
- [Decisiones](docs/DECISIONS.md)
- [Roadmap](docs/ROADMAP.md)
- [Arquitectura](docs/ARCHITECTURE.md)
- [Modelo de datos](docs/DATA_MODEL.md)
- [Seguridad](docs/SECURITY.md)
- [Seguridad multi-tenant](docs/TENANT_SECURITY.md)
- [Despliegue](docs/DEPLOYMENT.md)

## Convenciones

- Dinero con `Decimal`/`NUMERIC`, nunca `float`.
- Fechas en UTC; presentación en `America/Argentina/Buenos_Aires`.
- UI y documentación en español argentino.
- Multi-tenant desde el primer commit.
- No subir secretos ni `.env` reales.

## Licencia

Proyecto privado. Todos los derechos reservados.
