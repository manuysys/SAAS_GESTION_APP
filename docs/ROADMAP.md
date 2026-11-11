# Roadmap

## Hito 0 — Fundamentos

- [x] Lectura del contexto maestro.
- [x] Auditoría del entorno.
- [x] Repositorio y documentación base.
- [x] Toolchain local (Node 24, Python 3.12, PostgreSQL 17 portable).
- [x] OpenCode: MCP, agentes, skills y comandos.
- [x] Investigación competitiva con fuentes oficiales (2026-11-08).
- [ ] Entrevistas a potenciales clientes (5–10).
- [ ] Decisión de segmento inicial.
- [ ] Identidad provisional (sin nombre comercial definitivo).

## Hito 1 — Núcleo operativo

- [x] Registro, login, refresh y logout.
- [x] Creación de empresa y membresías.
- [x] Multi-tenancy y roles (owner, admin, dispatcher, technician, viewer).
- [x] Clientes y direcciones.
- [x] Solicitudes de servicio.
- [x] Órdenes de trabajo, estados y transiciones.
- [x] Historial de eventos y auditoría.
- [x] Pruebas de aislamiento multi-tenant.

## Hito 2 — Gestión comercial

- [x] Presupuestos con conceptos, impuestos y versiones.
- [x] PDF y enlace seguro de aprobación.
- [x] Agenda y visitas.
- [x] Asignación de técnicos y detección de conflictos.
- [x] Pagos registrados y saldos.
- [x] Dashboard operativo.

## Hito 3 — Experiencia móvil

- [x] PWA responsive para técnicos.
- [x] Órdenes asignadas, detalle y cambio de estado.
- [x] Fotografías, observaciones y materiales.
- [x] Cierre de trabajo.
- [ ] Solicitud de reprogramación desde la PWA.

## Hito 4 — Automatizaciones

- [x] Eventos de dominio.
- [x] Motor de reglas, condiciones y acciones.
- [x] Idempotencia e historial de ejecuciones.
- [x] Notificaciones in-app.
- [ ] Recordatorios y seguimiento programado de presupuestos.
- [ ] Outbox transaccional con worker.

## Hito 5 — Comunicación

- [x] WhatsApp Business Platform: configuración, webhook, firma y mensajes.
- [x] Webhooks con verificación de firma.
- [ ] Plantillas aprobadas y consentimiento.
- [ ] Envío end-to-end con credenciales reales.
- [ ] Correo electrónico transaccional.

## Hito 6 — Inteligencia artificial

- [x] Asistente administrativo con consultas reales.
- [x] Proveedor determinista, OpenAI-compatible y Ollama.
- [x] Cuotas, medición de tokens y costos.
- [ ] Herramientas controladas con confirmación humana.
- [ ] Borradores de presupuestos y solicitudes.

## Hito 7 — Comercialización

- [x] Planes, límites y suscripciones con precio histórico.
- [x] Panel global del proveedor SaaS.
- [ ] Enforcement completo de límites por plan.
- [ ] Cobros con Mercado Pago y webhooks.
- [ ] Onboarding guiado.
- [ ] Landing page, soporte y primeros clientes pagos.

## Hito 8 — Expansión

- [ ] Talleres de reparación.
- [ ] Inventario y mantenimiento preventivo.
- [ ] Rutas, GPS y firma digital.
- [ ] Integraciones y reportes avanzados.

## Hito 9 — Pilot-ready

Objetivo: tres empresas piloto (mismo rubro) usan el producto sin que el
fundador toque la base de datos. Criterios completos en
[`PILOT_READINESS.md`](PILOT_READINESS.md).

**Email (Resend)**

- [x] Módulo de email único con proveedor `console` y `resend`.
- [x] Tabla `email_deliveries` con idempotencia por clave.
- [x] Plantillas HTML y texto plano.
- [ ] Dominio DOVEXO verificado con SPF, DKIM y DMARC. *Bloqueado: dominio y cuenta Resend.*
- [ ] Envío real de prueba controlada. *Bloqueado: `RESEND_API_KEY`.*

**Invitaciones de técnicos**

- [x] Tabla `invitations` con hash SHA-256 del token.
- [x] Endpoints de equipo y de aceptación pública (`TEAM_API.md`).
- [x] Pantalla Equipo con estados activo, pendiente, vencida y revocada.
- [x] Límites `max_users` y `max_technicians` con lock.

**Acceso al portal del cliente**

- [x] Generación de acceso desde la ficha del cliente, con enlace copiable.
- [x] Expiración, revocación y uso único.
- [x] `dev_token` fuera de producción.

**Importador**

- [ ] Importación de clientes desde CSV.
- [ ] Importación de clientes desde XLSX.
- [ ] Vista previa, errores descargables y detección de duplicados.
- [ ] Importación de órdenes asociadas a clientes existentes.

**Onboarding**

- [ ] Asistente de cuatro pasos (empresa, servicios y horarios, equipo, primeros datos).
- [ ] Progreso guardado y reanudable.
- [ ] Checklist de inicio en el dashboard.

**Demo**

- [ ] Seed versionado y reproducible del tenant demo.
- [ ] Reset que toca solo el tenant demo.
- [ ] Demo de solo lectura o reset programado.

**Android**

- [x] Perfil release y keystore fuera de Git.
- [x] Renombre a `com.dovexo.mobile` antes de la primera subida.
- [x] AAB firmado y verificado en GitHub Actions.
- [ ] AAB subido a Google Play y prueba interna. *Bloqueado: Play Console.*
- [ ] Prueba en al menos un Android físico. *Bloqueado: dispositivo.*

**Backups y monitoreo**

- [x] Workflow de backup diario configurado en el repositorio (`.github/workflows/backup.yml`). Su ejecución y resultado no están verificados en este documento.
- [ ] Almacenamiento externo independiente y cifrado. *Bloqueado: proveedor a elegir.*
- [ ] Restauración probada en staging, con fecha registrada.
- [ ] Alertas de fallos críticos (backend, base, emails, jobs).
