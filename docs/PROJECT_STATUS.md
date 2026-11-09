# Estado del proyecto

**Última actualización:** 2026-11-08
**Fase:** Hito 2 completo + PWA, automatizaciones, IA determinista, suscripciones,
panel global y esqueleto de WhatsApp. Demo pública temporal.

## Resumen

La aplicación corre de punta a punta en local y el frontend está publicado en
Vercel: registro, login, refresh de sesión, creación de empresa, aislamiento por
tenant, clientes, solicitudes, órdenes de trabajo, presupuestos con PDF y
aprobación pública, agenda, asignación de técnicos, pagos, dashboard operativo,
PWA para técnicos, automatizaciones con notificaciones, asistente de IA
determinista, planes y suscripciones, panel global del SaaS y configuración de
WhatsApp Cloud API.

La API corre en la máquina local y se expone por un túnel temporal de
Cloudflare. La base PostgreSQL es local. **No es un entorno de producción.**

## Hecho y verificado

### Entorno

- [x] Repositorio Git inicializado con remoto `origin`.
- [x] `AGENTS.md`, documentación base y `.env.example`.
- [x] OpenCode: agentes, skills, comandos y Context7 MCP.
- [x] Node 24 vía `fnm`, Python 3.12 vía `uv`.
- [x] PostgreSQL 17.11 portable en `127.0.0.1:55432`.
- [x] CI en GitHub Actions para backend y frontend.
- [x] Scripts de backup, restore y healthcheck.

### Backend

- [x] FastAPI + SQLAlchemy 2 async + Pydantic v2 + Alembic.
- [x] Modelos: `tenants`, `users`, `memberships`, `refresh_tokens`, `customers`,
  `service_requests`, `work_orders`, `work_order_events`, `work_order_materials`,
  `work_order_attachments`, `quotes`, `quote_items`, `quote_events`,
  `appointments`, `payments`, `automation_rules`, `automation_executions`,
  `notifications`, `ai_usage_logs`, `plans`, `subscriptions`, `whatsapp_configs`
  y `whatsapp_messages`.
- [x] Migraciones: `84e62c6788cb`, `ba3b1d3acd4d`, `50e8c050aada`,
  `de0e021aa0ca`, `51fc582e7593` y `5ffb8399d836`.
- [x] Auth: registro, login, refresh rotativo, logout, `/me`.
- [x] Argon2id, JWT de acceso, cookies `HttpOnly`.
- [x] Multi-tenancy por `X-Tenant-ID` validado contra membresía.
- [x] Clientes, solicitudes, órdenes, transiciones y auditoría.
- [x] Presupuestos con `Decimal`, ítems históricos, PDF y token público.
- [x] Agenda, conflictos, reprogramación y asignación de técnicos.
- [x] Pagos manuales, parciales, anulación y recálculo de estado.
- [x] Dashboard summary.
- [x] PWA de técnicos: órdenes asignadas, transiciones, notas, materiales y
  fotos con validación de tipo/tamaño.
- [x] Automatizaciones: reglas por evento, condiciones, acciones `notify` y
  `notify_user`, ejecuciones idempotentes e historial. `send_whatsapp` queda
  `skipped` hasta configurar credenciales.
- [x] Notificaciones in-app con lectura individual y masiva.
- [x] Asistente de IA: proveedor determinista local por defecto, proveedores
  OpenAI-compatible y Ollama opcionales, cuotas y registro de uso.
- [x] Planes, suscripción con precio histórico, uso y límites.
- [x] Panel global: métricas agregadas, empresas y cambio de suscripción.
- [x] WhatsApp Cloud API: configuración cifrada, webhook con firma HMAC,
  idempotencia y envío de texto. Sin credenciales reales no está probado
  end-to-end.
- [x] Rate limiting en memoria para login/registro/refresh y enlaces públicos.
- [x] Cabeceras de seguridad HTTP.
- [x] Health checks `/api/v1/health/live` y `/ready`.
- [x] 73 pruebas pytest.

### Frontend

- [x] Next.js 16.4.5 + React 19 + TypeScript estricto + Tailwind 4.
- [x] Landing, registro, login y cierre de sesión.
- [x] Contexto de autenticación con refresh automático y selector de empresa.
- [x] Dashboard con métricas reales.
- [x] Clientes, solicitudes, órdenes y detalle con historial.
- [x] Presupuestos, PDF y página pública `/q/[token]`.
- [x] Agenda, pagos y asignación de técnicos.
- [x] PWA `/tech` y `/tech/orders/[id]` con manifest, service worker y offline.
- [x] Automatizaciones y notificaciones con campana y contador.
- [x] Asistente `/assistant` con preguntas rápidas y estado honesto del proveedor.
- [x] Facturación `/settings/billing` con plan, uso y cambio de plan.
- [x] Panel global `/admin` para platform admins.
- [x] WhatsApp `/settings/whatsapp` con configuración, mensajes y envío.
- [x] Navegación por rol; técnicos usan su propio shell.
- [x] Cliente API tipado, TanStack Query, React Hook Form + Zod.
- [x] Vitest con 61 pruebas.

### Verificación ejecutada

```text
ruff check          -> All checks passed
ruff format --check -> 116 files already formatted
basedpyright        -> 0 errors, 0 warnings, 0 notes
pytest              -> 73 passed
pnpm lint           -> sin errores
pnpm typecheck      -> sin errores
pnpm test           -> 61 passed
pnpm build          -> 21 rutas generadas
```

Flujo probado en navegador contra Vercel + túnel: registro, clientes, solicitud,
orden, presupuesto, aprobación pública, agenda, pago y dashboard. También se
verificó que la aprobación pública dispara una automatización y crea una
notificación in-app.

## Demo pública

- Frontend: https://saas-gestion-web.vercel.app
- API temporal: https://sims-instrumental-capture-enlarge.trycloudflare.com
- Admin demo: `demo@saasgestion.com` / `Demo12345!`.
- Técnico demo: `tecnico@saasgestion.com` / `Tecnico12345!`.

Ver `docs/DEMO.md`. La demo depende de que esta máquina y el túnel sigan activos.

## Pendiente

- [ ] PostgreSQL administrado y API desplegada 24/7 (Neon bloqueado por
      aceptación de términos; alternativa: Supabase o connection string).
- [ ] WhatsApp end-to-end con número y credenciales de Meta.
- [ ] Cobros reales con Mercado Pago y webhooks.
- [ ] Proveedor de IA externo con API key (o Ollama local en producción).
- [ ] Enforcement completo de límites por plan en todos los endpoints.
- [ ] Recordatorios automáticos programados (cron/worker).
- [ ] Correo electrónico transaccional.
- [ ] Entrevistas a clientes.
- [ ] Dominio propio, política de privacidad y revisión legal.

## Próximo paso concreto

1. Provisionar PostgreSQL administrado y desplegar la API con un proveedor que
   soporte FastAPI (Render, Fly.io, Railway o similar).
2. Configurar `NEXT_PUBLIC_API_URL` definitiva y CORS del dominio final.
3. Probar WhatsApp y Mercado Pago con credenciales reales en sandbox.
4. Implementar enforcement de límites y recordatorios programados.

## Limitaciones conocidas

- La demo pública usa un túnel y una base local; no tiene garantía de uptime.
- Neon no se pudo provisionar porque la CLI exige aceptar términos en el
  navegador.
- Sin credenciales de Meta, Mercado Pago ni proveedores de IA externos.
- El rate limiting es en memoria y por instancia; no sirve para varias
  instancias sin un backend compartido.
- Las fotos de técnicos se guardan como `BYTEA` en PostgreSQL; migrar a S3 en
  producción.
- El asistente determinista responde intenciones predefinidas; no es un LLM.
- `send_whatsapp` en automatizaciones queda `skipped` hasta configurar WhatsApp.
- La suscripción se crea en modo `trialing`, pero todavía no se cobra.
