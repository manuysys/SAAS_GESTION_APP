# SaaS Gestión

Plataforma SaaS B2B de gestión, automatización e inteligencia para empresas de
servicios técnicos: CRM, solicitudes, órdenes de trabajo, presupuestos, agenda,
pagos, comunicaciones y automatizaciones en un solo lugar.

> **Estado:** vertical slice funcionando en local: registro, login, empresa,
> multi-tenancy y CRUD de clientes. La fuente de verdad del avance es
> [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md).

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
# 1. Dependencias del frontend
cd apps/web
pnpm install
cd ../..

# 2. Backend
cd apps/api
uv sync
uv run alembic upgrade head
cd ../..

# 3. Base de datos local
.\scripts\db-init.ps1

# 4. Desarrollo (API + web en ventanas separadas)
.\scripts\dev.ps1
```

Verificación completa:

```powershell
.\scripts\verify.ps1
```

La aplicación web queda en `http://localhost:3000` y la API en
`http://localhost:8000`, con documentación OpenAPI en `/docs`.

## Estructura

```text
apps/
  web/          Frontend Next.js 16
  api/          Backend FastAPI (Python 3.12)
docs/           Producto, arquitectura, seguridad y operación
scripts/        Automatización local (PowerShell)
infra/          Despliegue y CI
.opencode/      Agentes, skills, comandos y MCP del proyecto
.local/         PostgreSQL portable y archivos locales (no versionado)
```

## API

Con el servidor levantado:

- Web: `http://localhost:3000`
- API: `http://localhost:8000`
- OpenAPI: `http://localhost:8000/docs`
- Health: `http://localhost:8000/api/v1/health/live`

## Credenciales locales

- PostgreSQL: `127.0.0.1:55432`
- Usuario: `saas`
- Password: `saas_dev_password`
- Bases: `saas_gestion_dev` y `saas_gestion_test`

Estas credenciales son solo para desarrollo local. No usarlas en producción.

## Documentación

- [Contexto maestro](CONTEXTO_GUIA_PROYECTO.md)
- [Estado del proyecto](docs/PROJECT_STATUS.md)
- [Decisiones](docs/DECISIONS.md)
- [Roadmap](docs/ROADMAP.md)
- [Arquitectura](docs/ARCHITECTURE.md)
- [Modelo de datos](docs/DATA_MODEL.md)
- [Seguridad](docs/SECURITY.md)
- [Seguridad multi-tenant](docs/TENANT_SECURITY.md)
- [Presupuestos](docs/QUOTES.md)
- [Agenda y pagos](docs/AGENDA_PAYMENTS.md)
- [Despliegue](docs/DEPLOYMENT.md)
- [Despliegue en Vercel + Neon](docs/DEPLOY_VERCEL.md)

## Convenciones

- Dinero con `Decimal`/`NUMERIC`, nunca `float`.
- Fechas en UTC; presentación en `America/Argentina/Buenos_Aires`.
- UI y documentación en español argentino.
- Multi-tenant desde el primer commit.
- No subir secretos ni `.env` reales.

## Licencia

Proyecto privado. Todos los derechos reservados.
