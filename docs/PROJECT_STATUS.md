# Estado del proyecto

**Última actualización:** 2026-11-08
**Fase:** Hito 1 — Núcleo operativo (vertical slice inicial funcionando)

## Resumen

La aplicación ya corre de punta a punta en local: registro, login, refresh de
sesión, creación de empresa, aislamiento por tenant y CRUD de clientes. El
frontend Next.js consume la API FastAPI contra PostgreSQL 17.

## Hecho y verificado

### Entorno

- [x] Repositorio Git inicializado con remoto `origin`.
- [x] `AGENTS.md`, documentación base y `.env.example`.
- [x] OpenCode: 10 agentes, 8 skills, 8 comandos, Context7 MCP conectado.
- [x] Node 24.22.2 vía `fnm`, Python 3.12.13 vía `uv`.
- [x] PostgreSQL 17.11 portable en `127.0.0.1:55432` con bases `saas_gestion_dev` y `saas_gestion_test`.
- [x] `gh` instalado (autenticación pendiente).

### Backend

- [x] FastAPI + SQLAlchemy 2 async + Pydantic v2 + Alembic.
- [x] Modelos: `tenants`, `users`, `memberships`, `refresh_tokens`, `customers`.
- [x] Migración inicial `84e62c6788cb_initial_schema`.
- [x] `POST /api/v1/auth/register`, `/login`, `/refresh`, `/logout`, `GET /me`.
- [x] Argon2id para contraseñas; JWT de acceso; refresh rotativo con hash en base.
- [x] Cookies `HttpOnly` para refresh token.
- [x] `GET/POST/PATCH/DELETE /api/v1/customers` con `X-Tenant-ID` validado contra membresía.
- [x] Roles iniciales y dependencia `require_roles`.
- [x] Health checks `/api/v1/health/live` y `/ready`.
- [x] 8 pruebas pytest: health, auth, CRUD y aislamiento entre tenants.

### Frontend

- [x] Next.js 16.4.5 + React 19 + TypeScript estricto + Tailwind 4.
- [x] Landing page en español.
- [x] Registro, login y cierre de sesión.
- [x] Contexto de autenticación con refresh automático y selector de empresa.
- [x] Dashboard con métricas reales de clientes y placeholders de módulos futuros.
- [x] Listado, búsqueda, alta y archivado de clientes.
- [x] Cliente API tipado, TanStack Query, React Hook Form + Zod.
- [x] Vitest con 2 pruebas de utilidades.

### Verificación ejecutada

```text
scripts/verify.ps1  -> Todo OK
ruff check          -> All checks passed
ruff format --check -> 33 files already formatted
basedpyright        -> 0 errors, 0 warnings
pytest              -> 8 passed
pnpm lint           -> sin errores
pnpm typecheck      -> sin errores
pnpm test           -> 2 passed
pnpm build          -> 8 rutas generadas
```

También se probó el flujo completo en navegador: registro → dashboard →
clientes → alta de cliente, y recarga de sesión con refresh token.

## Pendiente

- [ ] Autenticar GitHub y hacer el primer push.
- [ ] Órdenes de trabajo, estados y auditoría.
- [ ] Solicitudes y conversión a orden.
- [ ] Presupuestos, PDF y aprobación.
- [ ] Agenda y asignación de técnicos.
- [ ] PWA para técnicos.
- [ ] Automatizaciones e IA.
- [ ] Investigación competitiva verificada y entrevistas.

## Próximo paso concreto

1. Autenticar GitHub y pushear `main`.
2. Implementar el módulo de solicitudes + órdenes de trabajo con transiciones
   de estado y eventos de auditoría.
3. Agregar pruebas de aislamiento para órdenes.

## Limitaciones conocidas

- GitHub CLI sin sesión; el push está bloqueado hasta autenticar.
- Docker no operativo (sin WSL/Hyper-V); se usa PostgreSQL portable.
- Ollama disponible pero limitado por hardware.
- No hay credenciales de WhatsApp, pagos ni proveedores de IA.
