# Presupuestos

## Objetivo

Permitir que una empresa prepare un presupuesto con conceptos, lo envíe al
cliente mediante un enlace seguro, registre la aprobación o el rechazo y genere
un PDF. El presupuesto puede asociarse a una orden de trabajo.

## Modelo de datos

### quotes

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | Aislamiento |
| customer_id | UUID | Cliente del presupuesto |
| work_order_id | UUID? | Orden asociada, opcional |
| number | VARCHAR(24) | `QT-YYYY-0001`, único por tenant |
| status | VARCHAR(20) | draft, sent, approved, rejected, expired |
| currency | VARCHAR(3) | ARS |
| subtotal | NUMERIC(14,2) | Suma de líneas netas |
| discount_total | NUMERIC(14,2) | Suma de descuentos |
| tax_total | NUMERIC(14,2) | Suma de impuestos |
| total | NUMERIC(14,2) | Total final |
| notes | TEXT? | Observaciones |
| valid_until | TIMESTAMPTZ? | Vencimiento |
| sent_at / approved_at / rejected_at | TIMESTAMPTZ? | Hitos |
| public_token | VARCHAR(64) | Token URL-safe único |

### quote_items

Copia histórica de cada concepto:

- `description`
- `quantity` `NUMERIC(12,3)`
- `unit_price` `NUMERIC(14,2)`
- `discount_rate` `NUMERIC(5,2)` (porcentaje)
- `tax_rate` `NUMERIC(5,2)` (porcentaje)
- `line_total` `NUMERIC(14,2)`
- `sort_order`

No referencia al catálogo vivo. Si el catálogo cambia, el presupuesto no cambia.

### quote_events

Auditoría: `created`, `sent`, `approved`, `rejected`, `expired`. Guarda actor,
payload y timestamp.

## Cálculo

Para cada línea:

```text
base       = quantity * unit_price
discount   = base * discount_rate / 100
net        = base - discount
tax        = net * tax_rate / 100
line_total = net + tax
```

Totales:

```text
subtotal       = sum(base)
discount_total = sum(discount)
tax_total      = sum(tax)
total          = subtotal - discount_total + tax_total
```

Todos los importes se redondean a dos decimales con
`Decimal.quantize(Decimal("0.01"), ROUND_HALF_UP)`. Nunca `float`.

## Estados

```text
draft ──send──> sent ──approve──> approved
                  │
                  ├──reject───> rejected
                  └──expire───> expired
```

- Solo `draft` se puede editar.
- Solo `sent` se puede aprobar o rechazar.
- Un presupuesto aprobado o rechazado no se modifica; para cambiarlo se crea
  otro presupuesto.
- Al enviar/aprobar/rechazar, si hay `work_order_id`, se actualiza
  `work_orders.commercial_status`.

## Enlace público

- Cada presupuesto tiene un `public_token` aleatorio de 32 bytes URL-safe.
- `GET /api/v1/public/quotes/{token}` devuelve empresa, cliente, número,
  estado, ítems y totales. No expone IDs internos.
- `POST /api/v1/public/quotes/{token}/approve` y `/reject` registran la decisión.
- El token es un bearer secreto: no se indexa, no se comparte en lugares
  públicos y se puede rotar en el futuro.
- El endpoint público no requiere autenticación ni `X-Tenant-ID`.

## PDF

- Generado con `reportlab`.
- Incluye empresa, cliente, número, fecha, ítems, subtotal, descuentos,
  impuestos, total y notas.
- Se sirve autenticado en `GET /api/v1/quotes/{id}/pdf`.
- El PDF es una representación; la fuente de verdad es el registro en base.

## Permisos

| Rol | Acceso |
|---|---|
| owner / admin / dispatcher | Crear, editar borrador, enviar, aprobar, rechazar, PDF |
| viewer | Sin acceso (no debe ver el token público) |
| technician | Sin acceso a información financiera |

## API interna

- `GET /api/v1/quotes`
- `POST /api/v1/quotes`
- `GET /api/v1/quotes/{id}`
- `PATCH /api/v1/quotes/{id}`
- `POST /api/v1/quotes/{id}/send`
- `POST /api/v1/quotes/{id}/approve`
- `POST /api/v1/quotes/{id}/reject`
- `GET /api/v1/quotes/{id}/pdf`
- `GET /api/v1/quotes/{id}/events`

## Frontend

- `/quotes`: listado y alta con ítems dinámicos.
- `/quotes/[id]`: detalle, envío, aprobación, PDF y link público.
- `/q/[token]`: página pública de aprobación o rechazo.

## Pruebas mínimas

- Cálculo exacto de totales con descuentos e impuestos.
- Envío y aprobación pública.
- Rechazo público.
- Transición inválida (aprobar un draft) → 409.
- Vencimiento: no se aprueba un presupuesto vencido.
- `viewer` no puede listar presupuestos ni obtener el token público.
- Orden asociada debe pertenecer al mismo cliente.
- Importes fuera de `NUMERIC(14,2)` → 422.
- `PATCH items=[]` → 422.
- Aislamiento entre tenants → 404 en lectura, PDF y eventos.
- PDF con cabecera `%PDF`.
- Token inválido → 404.
- Actualización del estado comercial de la orden asociada sin regresión desde
  `approved`.
