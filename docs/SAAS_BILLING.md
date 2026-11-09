# SaaS Billing y planes

## Objetivo

Cobrar suscripciones mensuales en ARS, aplicar límites por plan y operar un
panel global del proveedor SaaS sin acceder indiscriminadamente a los datos de
cada empresa.

## Planes

| Plan | Perfil | Límites iniciales |
|---|---|---|
| Starter | Técnico independiente | 1 usuario, 1 técnico, 100 órdenes/mes |
| Professional | Empresa con varios técnicos | 5 usuarios, 5 técnicos, 1.000 órdenes/mes |
| Business | Empresa más grande | 20 usuarios, 20 técnicos, 10.000 órdenes/mes |

Los límites se guardan como `entitlements` en JSONB y se pueden cambiar sin
tocar código.

## Modelo

### plans

`id`, `code`, `name`, `price_ars`, `billing_period`, `limits` JSONB, `active`,
`created_at`, `updated_at`.

### subscriptions

`id`, `tenant_id`, `plan_id`, `status` (trialing, active, past_due, cancelled),
`started_at`, `current_period_end`, `price_snapshot`, `created_at`, `updated_at`.

### invoices (etapa posterior)

`id`, `tenant_id`, `subscription_id`, `amount`, `currency`, `status`,
`provider`, `external_id`, `paid_at`, `created_at`.

## Reglas

- El precio contratado se guarda en la suscripción.
- Un cambio de precio no modifica contratos anteriores sin política explícita.
- Los límites se validan en backend.
- El panel global ve métricas agregadas; el acceso a datos de un tenant requiere
  justificación, autorización y auditoría.
- No implementar cobros reales sin probar el proveedor.

## Proveedores de cobro

- Mercado Pago (suscripciones, webhooks, reintentos).
- Alternativas locales e internacionales a evaluar.

## API

- `GET /api/v1/plans`
- `GET /api/v1/subscription`
- `POST /api/v1/subscription/change`
- `GET /api/v1/admin/tenants`
- `GET /api/v1/admin/metrics`
- `POST /api/v1/admin/tenants/{id}/subscription`

## Frontend

- `/settings/billing`: plan actual, uso, límites y cambio de plan.
- `/admin`: empresas, planes, consumo, estado y métricas globales.

## Pruebas

- Plan asignado aplica límites.
- Tenant no puede ver datos de otro.
- Panel global no expone datos sensibles sin auditoría.
- Cambio de plan respeta precio contratado.

## Mercado Pago — suscripciones (diseño)

Se usará la API de **suscripciones con plan asociado** (`preapproval_plan` +
`preapproval`). El plan de Mercado Pago representa Starter/Professional/Business;
la suscripción representa al tenant.

Flujo:

1. El owner elige un plan en `/settings/billing`.
2. El backend crea o reutiliza un `preapproval_plan` por plan y crea una
   `preapproval` con `back_url` al frontend.
3. El usuario autoriza el cobro en Mercado Pago.
4. El webhook firmado actualiza la suscripción local (`authorized`, `paused`,
   `cancelled`, `pending`) de forma idempotente.
5. Se registra una factura interna por cada cobro y se extiende
   `current_period_end`.

Free trial: `preapproval_plan.free_trial` con `frequency` y `frequency_type`.
Se adopta **14 días** para alinear la prueba con el onboarding. Al finalizar, si
no hay autorización, la suscripción pasa a `past_due` y luego a `cancelled` con
período de gracia de 3 días.

Tablas previstas: `billing_customers`, `billing_invoices`,
`billing_webhook_events` (idempotencia) y columnas nuevas en `subscriptions`
(`provider`, `external_id`, `preapproval_plan_id`, `next_payment_date`,
`trial_ends_at`).

Credenciales necesarias: `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`, `MP_CLIENT_ID`,
`MP_CLIENT_SECRET`, `MP_WEBHOOK_SECRET`. El alias/CBU no se usa para la API.
Probar primero con usuarios de prueba (sandbox) y tarjetas de test.
