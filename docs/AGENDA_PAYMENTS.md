# Agenda, asignación y pagos

## Agenda

### Modelo `appointments`

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | Aislamiento |
| work_order_id | UUID | Orden asociada |
| technician_id | UUID | Usuario técnico |
| starts_at | TIMESTAMPTZ | Inicio |
| ends_at | TIMESTAMPTZ | Fin |
| status | VARCHAR(20) | scheduled, completed, cancelled, no_show |
| notes | TEXT? | Observaciones |

### Reglas

- El técnico debe ser miembro activo del tenant.
- No se permiten solapamientos para el mismo técnico:
  `starts_at < nuevo_ends_at AND ends_at > nuevo_starts_at`, excluyendo
  turnos cancelados y el propio turno al reprogramar.
- Al crear un turno se actualiza la orden:
  - `assigned_user_id = technician_id`
  - `scheduled_at = starts_at`
  - `operational_status = "scheduled"` si estaba en `new` o `scheduled`.
- No se agenda una orden `finished` o `cancelled`.
- Cancelar un turno cambia su estado a `cancelled`; no borra el registro.
- El técnico solo ve sus propios turnos y no puede crearlos ni editarlos.

### Endpoints

- `GET /api/v1/appointments?start=&end=&technician_id=`
- `POST /api/v1/appointments`
- `PATCH /api/v1/appointments/{id}`
- `POST /api/v1/appointments/{id}/cancel`

## Asignación de técnicos

- `GET /api/v1/technicians` devuelve miembros activos con rol `technician`.
- La asignación se guarda en `work_orders.assigned_user_id` mediante
  `PATCH /api/v1/work-orders/{id}` o al crear un turno.

## Pagos

### Modelo `payments`

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | Aislamiento |
| work_order_id | UUID | Orden cobrada |
| quote_id | UUID? | Presupuesto asociado, opcional |
| amount | NUMERIC(14,2) | Importe |
| currency | VARCHAR(3) | ARS |
| method | VARCHAR(30) | cash, transfer, card, mercadopago, other |
| status | VARCHAR(20) | registered, voided |
| paid_at | TIMESTAMPTZ | Fecha de pago |
| reference | VARCHAR(120)? | Referencia externa |
| notes | TEXT? | Observaciones |

### Reglas

- Un pago registrado manualmente no equivale a una transacción bancaria
  verificada.
- El importe debe ser mayor a cero.
- La orden debe pertenecer al tenant.
- `work_orders.payment_status` se recalcula:
  - `paid` si pagos registrados >= presupuestos aprobados.
  - `partial` si hay pagos pero no cubren el total, o si no hay presupuesto
    aprobado y existe al menos un pago.
  - `pending` si no hay pagos.
- Anular un pago lo marca `voided` y recalcula el estado de la orden; no se
  borra el registro.

### Endpoints

- `GET /api/v1/payments?work_order_id=`
- `POST /api/v1/payments`
- `POST /api/v1/payments/{id}/void`

## Dashboard

`GET /api/v1/dashboard/summary` devuelve:

- `customers_total`
- `service_requests_total`
- `service_requests_new`
- `work_orders_total`
- `work_orders_open` (`new`, `scheduled`, `in_progress`, `waiting`)
- `quotes_total`
- `quotes_pending` (`sent`)
- `payments_total` (pagos `registered`)
- `pending_balance` = `max(0, presupuestos aprobados - pagos registrados)`
- `appointments_today` (día civil en `America/Argentina/Buenos_Aires`)

## Permisos

| Módulo | owner/admin/dispatcher | technician | viewer |
|---|---|---|---|
| Agenda | Crear, editar, cancelar | Ver solo sus turnos | Ver |
| Técnicos | Ver | Ver | Ver |
| Pagos | Ver, registrar, anular | Sin acceso | Sin acceso |
| Dashboard | Ver | Sin acceso | Sin acceso |

## Pruebas mínimas

- Crear turno y asignar técnico a la orden.
- Conflicto de horario para el mismo técnico → 409.
- Cancelar turno.
- Técnico solo ve sus turnos.
- Pago parcial y pago total actualizan `payment_status`.
- Anular pago recalcula el estado.
- Aislamiento entre tenants en turnos y pagos.
- Summary con conteos y saldo pendiente correctos.
