# API para la app móvil y el portal del cliente

**Base:** `https://saas-gestion-api.vercel.app/api/v1`
**App:** Expo / React Native (Android primero).
**Tenant demo:** `servicios-demo`.
**Cliente demo:** `carlos@example.com` (Carlos Gomez).
**Técnico demo:** `tecnico@saasgestion.com` / `Tecnico12345!`.

## Autenticación de técnicos

### `POST /auth/mobile/login`

```json
{ "email": "tecnico@saasgestion.com", "password": "Tecnico12345!" }
```

Respuesta:

```json
{
  "access_token": "...",
  "refresh_token": "...",
  "token_type": "bearer",
  "expires_in": 900,
  "tenants": [{ "id": "...", "name": "Servicios Demo", "slug": "servicios-demo", "role": "technician" }]
}
```

### `POST /auth/mobile/refresh`

```json
{ "refresh_token": "..." }
```

Devuelve el mismo shape con tokens rotados.

### `POST /auth/mobile/logout`

```json
{ "refresh_token": "..." }
```

### Endpoints de técnico existentes

Todos requieren `Authorization: Bearer <access_token>` y `X-Tenant-ID`.

- `GET /technician/work-orders?status=`
- `GET /technician/work-orders/{id}`
- `POST /technician/work-orders/{id}/transition` `{ "to_status": "in_progress", "notes": "..." }`
- `POST /technician/work-orders/{id}/notes` `{ "notes": "...", "client_request_id": "uuid-opcional" }`
- `GET/POST /technician/work-orders/{id}/materials`
  `{ "description": "...", "quantity": "2.5", "unit": "m", "client_request_id": "uuid-opcional" }`
- `GET/POST /technician/work-orders/{id}/attachments` multipart: `file`, `client_request_id` opcional.
- `GET /technician/work-orders/{id}/attachments/{attachment_id}` (binario).

`TechnicianWorkOrderResponse` agrega:

```json
{
  "customer_name": "Carlos Gomez",
  "customer_phone": "+54 11 5555-1001",
  "customer_address": "Av. Siempre Viva 742",
  "customer_city": "CABA",
  "customer_province": "Buenos Aires",
  "customer_postal_code": "1425"
}
```

## Portal del cliente

### `GET /portal/{tenant_slug}`

Público. Devuelve branding mínimo:

```json
{
  "tenant": { "id": "...", "name": "Servicios Demo", "slug": "servicios-demo" },
  "portal": { "display_name": "Servicios Demo", "primary_color": "#0F766E", "support_email": null, "support_phone": null },
  "demo_available": true
}
```

### `POST /portal/{tenant_slug}/auth/request`

```json
{ "email": "carlos@example.com" }
```

o `{ "phone": "+54 11 5555-1001" }`.

Respuesta genérica:

```json
{ "message": "Si los datos coinciden, te enviamos un acceso.", "dev_token": "..." }
```

`dev_token` solo aparece si `PORTAL_DEV_MODE=true` y el tenant es
`PORTAL_DEV_TENANT_SLUG` (por defecto `servicios-demo`). En producción real se
envía por email/WhatsApp.

### `POST /portal/{tenant_slug}/auth/verify`

```json
{ "token": "..." }
```

Respuesta:

```json
{
  "access_token": "...",
  "expires_in": 86400,
  "customer": { "id": "...", "name": "Carlos Gomez", "email": "...", "phone": "..." },
  "tenant": { "id": "...", "name": "Servicios Demo", "slug": "servicios-demo" }
}
```

### `POST /portal/{tenant_slug}/auth/demo`

Solo si `PORTAL_DEV_MODE=true` y el tenant es el demo. Devuelve la misma
respuesta que `verify` para el cliente demo.

### Endpoints de datos del portal

Requieren `Authorization: Bearer <portal_token>`.

- `GET /portal/{tenant_slug}/me`
- `GET /portal/{tenant_slug}/summary`
  `{ "open_requests": 1, "open_orders": 2, "pending_quotes": 1, "next_appointment": {...} | null }`
- `GET /portal/{tenant_slug}/requests`
- `POST /portal/{tenant_slug}/requests`
  `{ "title": "...", "description": "...", "priority": "normal" }`
- `GET /portal/{tenant_slug}/orders`
- `GET /portal/{tenant_slug}/orders/{id}` (detalle + turnos + presupuestos)
- `GET /portal/{tenant_slug}/quotes`
- `POST /portal/{tenant_slug}/quotes/{id}/approve`
- `POST /portal/{tenant_slug}/quotes/{id}/reject`
- `GET /portal/{tenant_slug}/appointments`
  `[{ "id": "...", "starts_at": "...", "ends_at": "...", "status": "scheduled", "notes": null }]`
- `GET /portal/{tenant_slug}/payments`
  `[{ "id": "...", "amount": "50000.00", "currency": "ARS", "method": "transfer", "status": "registered", "paid_at": "..." }]`

Las respuestas no exponen IDs internos innecesarios, tokens públicos ni datos
de otros clientes. Los importes son strings decimales (`"49610.00"`).

## Notificaciones push

- `POST /notifications/devices` `{ "token": "ExponentPushToken[...]", "platform": "android" }`
- `DELETE /notifications/devices/{token}`
- El backend envía push al técnico cuando se le asigna una orden o cambia el
  estado de una orden suya. Si falla, la operación de negocio no se revierte.

## Idempotencia móvil

Las notas, materiales y adjuntos aceptan `client_request_id` (UUID generado por
la app). Si se reintenta la misma operación, el backend devuelve el recurso
existente en lugar de duplicarlo.

## Configuración de la app

```env
EXPO_PUBLIC_API_URL=https://saas-gestion-api.vercel.app
EXPO_PUBLIC_DEMO_TENANT_SLUG=servicios-demo
```

## Errores

Formato estándar de FastAPI:

```json
{ "detail": "Mensaje para el usuario" }
```

- `401`: token vencido o inválido.
- `403`: sin permiso o tenant incorrecto.
- `404`: recurso inexistente o de otro tenant.
- `409`: conflicto de estado.
- `422`: validación.
- `429`: rate limit o lockout.
