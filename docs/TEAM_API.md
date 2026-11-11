# Contrato de equipo, invitaciones y acceso al portal

**Fecha:** 2026-11-10
**Estado:** contrato para implementación. No describe funcionalidad ya desplegada.

## Identidad

- Empresa: **ARVOKTA**.
- Producto: **DOVEXO**.
- Nombre visible en UI, emails y documentación: DOVEXO.
- Los identificadores internos (`arreglo`, `saas-gestion`, tablas y rutas existentes)
  no se renombran en esta etapa.
- Android: `com.dovexo.mobile`, scheme `dovexo`, slug `dovexo`.

## Email transaccional

Proveedor inicial: Resend. Sin dominio verificado se usa el proveedor `console`
en desarrollo y se documenta que la entrega real queda bloqueada.

Variables:

```env
EMAIL_PROVIDER=console|resend
RESEND_API_KEY=
EMAIL_FROM=DOVEXO <no-reply@dominio-verificado>
APP_PUBLIC_URL=https://saas-gestion-web.vercel.app
```

Tabla `email_deliveries`:

- `id` UUID.
- `tenant_id` UUID nullable.
- `to_email` string.
- `template` string.
- `subject` string.
- `status` (`queued`, `sent`, `failed`).
- `provider` string.
- `provider_message_id` string nullable.
- `idempotency_key` string unique.
- `error` text nullable.
- `created_at`, `updated_at`.

Reglas:

- Un solo módulo de email; no llamar a Resend desde endpoints.
- Plantillas HTML y texto plano.
- No guardar tokens ni secretos en logs.
- Si el proveedor falla, la operación de negocio no se revierte; se registra el
  fallo y se permite reenviar.
- Idempotencia por clave estable; un reintento no duplica el email.

## Invitaciones

Tabla `invitations`:

- `id` UUID.
- `tenant_id` FK tenants.
- `email_normalized` string.
- `role` (`admin`, `dispatcher`, `technician`, `viewer`).
- `invited_by` FK users.
- `token_hash` string unique.
- `expires_at` timestamptz.
- `accepted_at` nullable.
- `revoked_at` nullable.
- `created_at`, `updated_at`.

Reglas:

- Token aleatorio de alta entropía; solo se guarda SHA-256.
- Expiración inicial: 7 días.
- Un token se usa una sola vez.
- El email del usuario autenticado debe coincidir con `email_normalized`.
- No se puede invitar a `owner`.
- Un `admin` no puede invitar `admin`; solo `owner` puede.
- Si el usuario ya existe, se asocia a la nueva empresa sin duplicar identidad.
- Límites `max_users` y `max_technicians` se validan antes de crear la
  invitación, con lock para evitar carreras.
- Reenviar invalida el token anterior y genera uno nuevo.
- Revocar impide aceptar.
- La respuesta de crear/reenviar puede incluir `invitation_url` con el token
  crudo **una sola vez** para que el administrador lo copie. No se guarda en
  logs.

### Endpoints autenticados

Todos requieren `Authorization: Bearer` y `X-Tenant-ID`.

`GET /api/v1/team`

```json
{
  "members": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "full_name": "Juan Perez",
      "email": "juan@example.com",
      "role": "technician",
      "status": "active",
      "last_login_at": null
    }
  ],
  "invitations": [
    {
      "id": "uuid",
      "email": "tecnico@example.com",
      "role": "technician",
      "status": "pending",
      "expires_at": "2026-11-17T12:00:00Z",
      "created_at": "2026-11-10T12:00:00Z"
    }
  ]
}
```

`POST /api/v1/team/invitations`

```json
{ "email": "tecnico@example.com", "full_name": "Tecnico", "role": "technician" }
```

Respuesta `201`:

```json
{
  "id": "uuid",
  "email": "tecnico@example.com",
  "role": "technician",
  "status": "pending",
  "expires_at": "2026-11-17T12:00:00Z",
  "invitation_url": "https://.../invitations/raw-token",
  "email_status": "sent|failed|console"
}
```

`POST /api/v1/team/invitations/{id}/resend` → mismo shape.

`DELETE /api/v1/team/invitations/{id}` → `204`.

### Endpoints públicos

`GET /api/v1/public/invitations/{token}`

```json
{
  "tenant_name": "Servicios Demo",
  "email_masked": "t***o@example.com",
  "role": "technician",
  "expires_at": "2026-11-17T12:00:00Z",
  "status": "pending|expired|accepted|revoked"
}
```

`POST /api/v1/public/invitations/{token}/accept`

Body para usuario nuevo:

```json
{ "full_name": "Tecnico", "password": "una-clave-segura" }
```

Body para usuario existente autenticado: `{}` con Bearer.

Respuesta `200`:

```json
{
  "access_token": "...",
  "refresh_token": "...",
  "token_type": "bearer",
  "tenant": { "id": "uuid", "name": "Empresa", "slug": "empresa", "role": "technician" },
  "user": { "id": "uuid", "email": "tecnico@example.com", "full_name": "Tecnico" }
}
```

## Acceso al portal del cliente

El acceso se genera desde la ficha del cliente. El token crudo se devuelve una
sola vez para copiar; si se envía por email, no se incluye en logs.

`POST /api/v1/customers/{customer_id}/portal-access`

```json
{ "send_email": true }
```

Respuesta `200`:

```json
{
  "access_url": "https://.../portal/...?token=raw-token",
  "expires_at": "2026-11-11T12:00:00Z",
  "email_status": "sent|failed|console"
}
```

`POST /api/v1/customers/{customer_id}/portal-access/revoke` → `204`.

Reglas:

- Solo owner/admin/dispatcher.
- Token aleatorio, hash SHA-256, expiración configurable (24 h inicial).
- Uso único para crear la sesión; luego se usa el JWT de portal.
- `dev_token` no se devuelve en producción.
- Rate limiting, auditoría y aislamiento por tenant.
- El cliente solo accede a sus propios datos.

## Fuera de este contrato

- Importador CSV/XLSX.
- Onboarding.
- Reset de demo.
- Push y Play Store.
- Mercado Pago.
- WhatsApp.
