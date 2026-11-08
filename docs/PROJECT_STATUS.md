# Estado del proyecto

**Última actualización:** 2026-11-08
**Fase:** Hito 2 — Gestión comercial (presupuestos funcionando)

## Resumen

La aplicación corre de punta a punta en local: registro, login, refresh de
sesión, creación de empresa, aislamiento por tenant, clientes, solicitudes,
órdenes de trabajo y presupuestos con PDF y aprobación pública. El frontend
Next.js consume la API FastAPI contra PostgreSQL 17.

## Hecho y verificado

### Entorno

- [x] Repositorio Git inicializado con remoto `origin`.
- [x] `AGENTS.md`, documentación base y `.env.example`.
- [x] OpenCode: 10 agentes, 8 skills, 8 comandos, Context7 MCP conectado.
- [x] Node 24.22.2 vía `fnm`, Python 3.12.13 vía `uv`.
- [x] PostgreSQL 17.11 portable en `127.0.0.1:55432` con bases `saas_gestion_dev` y `saas_gestion_test`.
- [x] `gh` instalado. El push funciona con la credencial de Windows; `gh`
  requiere un token con `read:org` para completar su login.

### Backend

- [x] FastAPI + SQLAlchemy 2 async + Pydantic v2 + Alembic.
- [x] Modelos: `tenants`, `users`, `memberships`, `refresh_tokens`, `customers`,
  `service_requests`, `work_orders`, `work_order_events`, `quotes`,
  `quote_items`, `quote_events`.
- [x] Migraciones `84e62c6788cb_initial_schema`,
  `ba3b1d3acd4d_add_service_requests_and_work_orders` y
  `50e8c050aada_add_quotes_and_quote_items`.
- [x] `POST /api/v1/auth/register`, `/login`, `/refresh`, `/logout`, `GET /me`.
- [x] Argon2id para contraseñas; JWT de acceso; refresh rotativo con hash en base.
- [x] Cookies `HttpOnly` para refresh token.
- [x] `GET/POST/PATCH/DELETE /api/v1/customers` con `X-Tenant-ID` validado contra membresía.
- [x] `GET/POST/PATCH /api/v1/service-requests` y conversión a orden.
- [x] `GET/POST/PATCH /api/v1/work-orders`, transiciones y eventos.
- [x] Presupuestos: alta, edición en borrador, envío, aprobación, rechazo,
  PDF y enlace público.
- [x] Cálculos con `Decimal`/`Numeric`, ítems históricos y numeración
  `QT-YYYY-0001`.
- [x] Endpoints públicos por token sin autenticación.
- [x] Decisiones concurrentes serializadas con bloqueo de fila.
- [x] Vencimiento de presupuestos, límites de importes y protección contra
  regresión del estado comercial de la orden.
- [x] `viewer` sin acceso a presupuestos para no exponer el token público.
- [x] Reglas de transición por estado y permisos especiales para técnicos.
- [x] Roles iniciales y dependencia `require_roles`.
- [x] Health checks `/api/v1/health/live` y `/ready`.
- [x] 23 pruebas pytest: health, auth, clientes, solicitudes, órdenes,
  presupuestos, PDF, token público, vencimiento, overflow y aislamiento entre
  tenants.

### Frontend

- [x] Next.js 16.4.5 + React 19 + TypeScript estricto + Tailwind 4.
- [x] Landing page en español.
- [x] Registro, login y cierre de sesión.
- [x] Contexto de autenticación con refresh automático y selector de empresa.
- [x] Dashboard con métricas reales de clientes, solicitudes, órdenes y
  presupuestos.
- [x] Listado, búsqueda, alta y archivado de clientes.
- [x] Listado y alta de solicitudes, con conversión a orden.
- [x] Listado de órdenes y detalle con transiciones de estado e historial.
- [x] Presupuestos: listado, alta con ítems dinámicos, detalle, envío,
  aprobación, rechazo, PDF y link público.
- [x] Página pública `/q/[token]` con aprobación o rechazo sin login.
- [x] Cliente API tipado, TanStack Query, React Hook Form + Zod.
- [x] Vitest con 9 pruebas (utilidades y totales de presupuesto).

### Verificación ejecutada

```text
scripts/verify.ps1  -> Todo OK
ruff check          -> All checks passed
ruff format --check -> 52 files already formatted
basedpyright        -> 0 errors, 0 warnings
pytest              -> 23 passed
pnpm lint           -> sin errores
pnpm typecheck      -> sin errores
pnpm test           -> 9 passed
pnpm build          -> 11 rutas generadas
```

También se probó el flujo completo en navegador: registro → dashboard →
clientes → solicitud → conversión a orden → programada → en ejecución →
finalizada, y presupuesto → envío → link público → aprobación → estado
actualizado, con historial y PDF.

## Pendiente

- [x] Primer push a GitHub (`main`).
- [x] Solicitudes y conversión a orden.
- [x] Órdenes de trabajo, estados y auditoría.
- [x] Presupuestos, PDF y aprobación.
- [ ] Agenda y asignación de técnicos.
- [ ] Pagos registrados y saldos.
- [ ] PWA para técnicos.
- [ ] Automatizaciones e IA.
- [ ] Investigación competitiva verificada y entrevistas.

## Próximo paso concreto

1. Incorporar agenda y asignación de técnicos con detección de conflictos.
2. Agregar pagos registrados y saldos pendientes.
3. Implementar el dashboard operativo completo.

## Limitaciones conocidas

- `gh` no completó su login porque el token existente no tiene `read:org`.
  `git push` funciona con la credencial de Windows; para usar `gh` con todas
  sus funciones hay que autorizar un token con ese scope.
- Docker no operativo (sin WSL/Hyper-V); se usa PostgreSQL portable.
- Ollama disponible pero limitado por hardware.
- No hay credenciales de WhatsApp, pagos ni proveedores de IA.
