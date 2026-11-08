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
