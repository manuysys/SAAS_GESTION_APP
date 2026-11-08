# Estado del proyecto

**Última actualización:** 2026-11-08
**Fase:** Hito 2 completo — versión funcional en local

## Resumen

La aplicación corre de punta a punta en local: registro, login, refresh de
sesión, creación de empresa, aislamiento por tenant, clientes, solicitudes,
órdenes de trabajo, presupuestos con PDF y aprobación pública, agenda,
asignación de técnicos, pagos y dashboard operativo. El frontend Next.js
consume la API FastAPI contra PostgreSQL 17.

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
  `quote_items`, `quote_events`, `appointments`, `payments`.
- [x] Migraciones `84e62c6788cb_initial_schema`,
  `ba3b1d3acd4d_add_service_requests_and_work_orders`,
  `50e8c050aada_add_quotes_and_quote_items` y
  `de0e021aa0ca_add_appointments_and_payments`.
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
- [x] Agenda: turnos, detección de conflictos, reprogramación y cancelación.
- [x] Asignación de técnicos a órdenes y turnos.
- [x] Pagos manuales, parciales, anulación y recálculo de `payment_status`.
- [x] Dashboard summary con métricas y saldo pendiente.
- [x] Reglas de transición por estado y permisos especiales para técnicos.
- [x] Roles iniciales y dependencia `require_roles`.
- [x] Health checks `/api/v1/health/live` y `/ready`.
- [x] 37 pruebas pytest: health, auth, clientes, solicitudes, órdenes,
  presupuestos, PDF, token público, vencimiento, overflow, agenda, pagos,
  dashboard y aislamiento entre tenants.

### Frontend

- [x] Next.js 16.4.5 + React 19 + TypeScript estricto + Tailwind 4.
- [x] Landing page en español.
- [x] Registro, login y cierre de sesión.
- [x] Contexto de autenticación con refresh automático y selector de empresa.
- [x] Dashboard con métricas reales de clientes, solicitudes, órdenes,
  presupuestos, pagos y turnos del día.
- [x] Listado, búsqueda, alta y archivado de clientes.
- [x] Listado y alta de solicitudes, con conversión a orden.
- [x] Listado de órdenes y detalle con transiciones, historial y asignación de
  técnico.
- [x] Presupuestos: listado, alta con ítems dinámicos, detalle, envío,
  aprobación, rechazo, PDF y link público.
- [x] Página pública `/q/[token]` con aprobación o rechazo sin login.
- [x] Agenda diaria con filtro por fecha, alta y cancelación de turnos.
- [x] Pagos: listado, alta, total registrado y anulación.
- [x] Navegación por rol: técnicos y viewers no ven módulos financieros.
- [x] Cliente API tipado, TanStack Query, React Hook Form + Zod.
- [x] Vitest con 22 pruebas (utilidades, totales, dinero y agenda).

### Verificación ejecutada

```text
scripts/verify.ps1  -> Todo OK
ruff check          -> All checks passed
ruff format --check -> 72 files already formatted
basedpyright        -> 0 errors, 0 warnings
pytest              -> 37 passed
pnpm lint           -> sin errores
pnpm typecheck      -> sin errores
pnpm test           -> 22 passed
pnpm build          -> 13 rutas generadas
```

También se probó el flujo completo en navegador: registro → dashboard →
clientes → solicitud → conversión a orden → programada → en ejecución →
finalizada, presupuesto → envío → link público → aprobación, agenda con turno
y técnico asignado, pago registrado y dashboard con saldo pendiente.

## Pendiente

- [x] Primer push a GitHub (`main`).
- [x] Solicitudes y conversión a orden.
- [x] Órdenes de trabajo, estados y auditoría.
- [x] Presupuestos, PDF y aprobación.
- [x] Agenda y asignación de técnicos.
- [x] Pagos registrados y saldos.
- [x] Dashboard operativo completo.
- [ ] PWA para técnicos.
- [ ] Automatizaciones e IA.
- [ ] WhatsApp oficial.
- [ ] Suscripciones y panel global del SaaS.
- [ ] Investigación competitiva verificada y entrevistas.

## Próximo paso concreto

1. PWA para técnicos con sus órdenes, fotos y cierre de trabajo.
2. Motor de automatizaciones y notificaciones.
3. Asistente de IA con herramientas controladas.
4. WhatsApp oficial y suscripciones.

## Limitaciones conocidas

- `gh` no completó su login porque el token existente no tiene `read:org`.
  `git push` funciona con la credencial de Windows; para usar `gh` con todas
  sus funciones hay que autorizar un token con ese scope.
- Docker no operativo (sin WSL/Hyper-V); se usa PostgreSQL portable.
- Ollama disponible pero limitado por hardware.
- No hay credenciales de WhatsApp, pagos ni proveedores de IA.
