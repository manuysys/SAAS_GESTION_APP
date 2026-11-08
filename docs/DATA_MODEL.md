# Modelo de datos inicial

## Convenciones

- Claves primarias UUID (`uuid_generate_v4()` o `gen_random_uuid()`).
- `created_at`, `updated_at` en `timestamptz` UTC.
- `deleted_at` para borrado lógico cuando corresponda; no borrar en cascada
  indiscriminadamente.
- Dinero: `NUMERIC(14,2)`; cantidades: `NUMERIC(12,3)`.
- Enums de PostgreSQL para estados estables; catálogos para valores configurables.
- `tenant_id` en toda entidad de negocio, con FK e índice compuesto.
- Restricciones únicas por tenant, no globales.

## Entidades núcleo

### tenants
`id`, `name`, `slug`, `status`, `timezone`, `currency`, `created_at`, `updated_at`.

### users
`id`, `email` (único global), `password_hash`, `full_name`, `status`,
`email_verified_at`, `last_login_at`, `created_at`, `updated_at`.

### memberships
`id`, `tenant_id`, `user_id`, `role`, `status`, `created_at`, `updated_at`.
Único `(tenant_id, user_id)`. Roles: `owner`, `admin`, `dispatcher`,
`technician`, `viewer`.

### customer
`id`, `tenant_id`, `name`, `phone`, `email`, `notes`, `tags`, `status`,
`created_at`, `updated_at`, `deleted_at`.

### customer_addresses
`id`, `tenant_id`, `customer_id`, `label`, `line1`, `line2`, `city`,
`province`, `postal_code`, `lat`, `lng`, `is_primary`.

### leads
`id`, `tenant_id`, `customer_id?`, `source`, `name`, `phone`, `message`,
`status`, `created_at`, `updated_at`.

### service_catalog
`id`, `tenant_id`, `name`, `description`, `category`, `unit`, `base_price`,
`tax_rate`, `active`.

### service_requests
`id`, `tenant_id`, `customer_id`, `lead_id?`, `title`, `description`,
`priority`, `source`, `status`, `requested_at`, `created_at`, `updated_at`.

### work_orders
`id`, `tenant_id`, `customer_id`, `service_request_id?`, `code` (único por
tenant), `title`, `description`, `service_type`, `commercial_status`,
`operational_status`, `payment_status`, `priority`, `address_id?`,
`assigned_technician_id?`, `scheduled_at`, `started_at`, `finished_at`,
`created_at`, `updated_at`.

### work_order_events
`id`, `tenant_id`, `work_order_id`, `event_type`, `from_state`, `to_state`,
`actor_user_id`, `payload` (JSONB), `created_at`. Append-only.

### appointments
`id`, `tenant_id`, `work_order_id`, `technician_id`, `starts_at`, `ends_at`,
`status`, `address_id?`, `notes`, `created_at`, `updated_at`.

### technician_profiles
`id`, `tenant_id`, `user_id`, `phone`, `specialties`, `availability` (JSONB),
`status`, `created_at`, `updated_at`.

### quotes
`id`, `tenant_id`, `work_order_id?`, `service_request_id?`, `customer_id`,
`number` (único por tenant), `status`, `currency`, `subtotal`, `discount_total`,
`tax_total`, `total`, `valid_until`, `sent_at`, `approved_at`, `rejected_at`,
`created_at`, `updated_at`.

### quote_items
`id`, `tenant_id`, `quote_id`, `description`, `quantity`, `unit_price`,
`discount_rate`, `tax_rate`, `line_total`, `sort_order`, `snapshot` (JSONB).
Los ítems son copia histórica: no referencian el catálogo vivo.

### payments
`id`, `tenant_id`, `work_order_id`, `quote_id?`, `amount`, `currency`,
`method`, `status`, `paid_at`, `reference`, `notes`, `created_at`.

### attachments
`id`, `tenant_id`, `entity_type`, `entity_id`, `storage_key`, `filename`,
`mime_type`, `size_bytes`, `uploaded_by`, `created_at`.

### communications
`id`, `tenant_id`, `customer_id?`, `work_order_id?`, `channel`, `direction`,
`status`, `template_id?`, `content`, `external_id`, `sent_at`, `created_at`.

### automation_rules / automation_executions
Reglas con trigger, condiciones, acciones, estado y versión. Ejecuciones con
estado, intento, error, timestamps e idempotency key.

### audit_logs
`id`, `tenant_id`, `actor_user_id?`, `action`, `entity_type`, `entity_id`,
`before` (JSONB), `after` (JSONB), `ip`, `user_agent`, `created_at`.

### ai_usage_logs
`id`, `tenant_id`, `user_id?`, `provider`, `model`, `feature`, `input_tokens`,
`output_tokens`, `estimated_cost`, `created_at`.

## Relaciones principales

```text
tenant 1─N membership N─1 user
tenant 1─N customer 1─N customer_address
customer 1─N service_request 1─N work_order
work_order 1─N appointment
work_order 1─N quote 1─N quote_item
work_order 1─N payment
work_order 1─N work_order_event
customer 1─N communication
tenant 1─N automation_rule 1─N automation_execution
```

## Índices mínimos

- `(tenant_id, created_at)` en entidades listables.
- `(tenant_id, status)` en órdenes, solicitudes y presupuestos.
- `(tenant_id, customer_id)` en órdenes, presupuestos y comunicaciones.
- `(tenant_id, scheduled_at)` en visitas.
- `(tenant_id, email)` único parcial en clientes cuando se use email.
- `code` único por tenant en órdenes y presupuestos.

## Aislamiento

Las FK compuestas `(tenant_id, id)` permiten impedir referencias cruzadas entre
tenants. Ejemplo: `work_orders (tenant_id, customer_id)` referencia
`customer (tenant_id, id)`. Se implementará cuando el esquema se estabilice.
