# Motor de automatizaciones

## Objetivo

Ejecutar reglas deterministas ante eventos del negocio, con historial,
reintentos e idempotencia. n8n puede orquestar integraciones externas, pero el
motor propio es la fuente de verdad.

## Eventos

- `quote_sent`
- `quote_approved`
- `quote_rejected`
- `work_order_status_changed`
- `appointment_created`
- `payment_registered`

## Modelo

### automation_rules

| Campo | Tipo |
|---|---|
| id | UUID |
| tenant_id | UUID |
| name | VARCHAR(160) |
| event_type | VARCHAR(40) |
| conditions | JSONB |
| action_type | VARCHAR(40) |
| action_config | JSONB |
| active | BOOLEAN |
| created_at / updated_at | TIMESTAMPTZ |

### automation_executions

| Campo | Tipo |
|---|---|
| id | UUID |
| tenant_id | UUID |
| rule_id | UUID |
| event_type | VARCHAR(40) |
| status | VARCHAR(20) — pending, success, failed, skipped |
| payload | JSONB |
| error | TEXT? |
| attempts | INT |
| idempotency_key | VARCHAR(120) |
| created_at / executed_at | TIMESTAMPTZ |

### notifications

| Campo | Tipo |
|---|---|
| id | UUID |
| tenant_id | UUID |
| user_id | UUID? |
| title | VARCHAR(160) |
| message | TEXT |
| type | VARCHAR(40) |
| read_at | TIMESTAMPTZ? |
| created_at | TIMESTAMPTZ |

## Acciones iniciales

- `notify`: crear notificación in-app para owner/admin/dispatcher.
- `notify_user`: notificar a un usuario específico.
- `send_whatsapp`: encolar mensaje; si no está configurado, marcar `skipped`.
- `create_task`: crear una tarea/nota interna.

## Reglas de ejecución

1. El evento se emite dentro de la transacción de negocio.
2. Se buscan reglas activas del tenant para ese evento.
3. Se evalúan condiciones simples (prioridad, estado, monto).
4. Se crea una ejecución con idempotency key.
5. Se ejecuta la acción.
6. Se registra éxito/error y se reintenta con backoff.
7. Nunca se ejecuta dos veces la misma acción para el mismo evento.

## API

- `GET/POST /api/v1/automations`
- `PATCH /api/v1/automations/{id}`
- `POST /api/v1/automations/{id}/toggle`
- `GET /api/v1/automations/executions`
- `GET /api/v1/notifications`
- `POST /api/v1/notifications/{id}/read`
- `POST /api/v1/notifications/read-all`
- `POST /api/v1/automations/run` (cron protegido por secreto)

## Frontend

- `/automations`: listado, alta, activar/desactivar, historial de ejecuciones.
- Campana de notificaciones en el layout.
- Sin información financiera para técnicos.

## Pruebas

- Regla creada + evento disparado = ejecución y notificación.
- Regla inactiva no ejecuta.
- Evento de otro tenant no ejecuta.
- Reintento no duplica notificación.
