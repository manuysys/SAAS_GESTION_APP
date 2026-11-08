# Seguridad multi-tenant

## Modelo

Cada empresa es un `tenant`. Un usuario puede pertenecer a uno o varios tenants
mediante `memberships`. El tenant activo se selecciona en la sesión y se valida
en el backend.

## Reglas obligatorias

1. El `tenant_id` se obtiene del token/sesión, nunca del body ni de la URL.
2. Toda consulta de negocio incluye `WHERE tenant_id = :current_tenant`.
3. Los repositorios reciben un `TenantContext` obligatorio.
4. Las entidades relacionadas se validan contra el mismo tenant antes de
   asociarlas.
5. Los IDs de recursos de otro tenant devuelven 404, no 403, para no filtrar
   existencia.
6. Las operaciones de administración global usan un rol separado y auditado.
7. Los archivos y URLs firmadas se validan contra el tenant del recurso.
8. Las automatizaciones y webhooks se ejecutan con el tenant del recurso.
9. Los logs incluyen `tenant_id` pero no datos sensibles.
10. Las pruebas de aislamiento son obligatorias para cada módulo.

## Roles

| Rol | Alcance |
|---|---|
| `owner` | Todo el tenant, facturación y miembros |
| `admin` | Operación y configuración, sin transferir propiedad |
| `dispatcher` | Clientes, solicitudes, órdenes, agenda y asignaciones |
| `technician` | Solo sus órdenes, datos operativos y archivos asociados |
| `viewer` | Lectura limitada, sin mutaciones |

## Defensa en profundidad

- Filtro de aplicación obligatorio.
- FK compuestas `(tenant_id, id)` para impedir referencias cruzadas.
- RLS de PostgreSQL cuando el esquema esté estable:
  `USING (tenant_id = current_setting('app.tenant_id')::uuid)`.
- Tests de integración con dos tenants sembrados.

## Matriz de pruebas mínima

| Caso | Resultado esperado |
|---|---|
| Tenant A lee cliente de B | 404 |
| Tenant A modifica orden de B | 404 |
| Tenant A asigna técnico de B | 400/404 |
| Tenant A descarga archivo de B | 404 |
| Usuario sin membership accede | 403 |
| Técnico accede a finanzas globales | 403 |
| Webhook de tenant A modifica B | rechazado |
| Automatización de A consulta B | 0 resultados |

## Auditoría

- Registrar `tenant_id`, `actor_user_id`, acción, entidad e IP.
- Acceso de soporte al tenant: justificado, autorizado, limitado y auditado.
- Nunca permitir que el panel global lea datos de clientes sin un proceso
  explícito de soporte.
