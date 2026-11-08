# PWA para técnicos

## Objetivo

Que un técnico pueda trabajar desde el celular sin acceso al panel
administrativo ni a información financiera.

## Alcance

- Login con el mismo usuario y tenant.
- Ver solo las órdenes asignadas a él.
- Consultar cliente, teléfono, dirección e instrucciones.
- Iniciar, pausar y finalizar un trabajo.
- Agregar notas.
- Registrar materiales utilizados.
- Subir fotos del trabajo.
- Funcionar como PWA instalable con shell offline.

## Modelo

### work_order_materials

`id`, `tenant_id`, `work_order_id`, `description`, `quantity` NUMERIC(12,3),
`unit`, `created_by_user_id`, timestamps.

### work_order_attachments

`id`, `tenant_id`, `work_order_id`, `filename`, `mime_type`, `size_bytes`,
`data` BYTEA, `uploaded_by_user_id`, timestamps.

Las fotos se guardan en PostgreSQL para el MVP. En producción se puede migrar a
S3/Vercel Blob manteniendo el mismo contrato.

## API

- `GET /api/v1/technician/work-orders`
- `GET /api/v1/technician/work-orders/{id}`
- `POST /api/v1/technician/work-orders/{id}/transition`
- `POST /api/v1/technician/work-orders/{id}/notes`
- `GET/POST /api/v1/technician/work-orders/{id}/materials`
- `GET/POST /api/v1/technician/work-orders/{id}/attachments`
- `GET /api/v1/technician/work-orders/{id}/attachments/{attachment_id}`

Todos validan que la orden pertenezca al técnico autenticado.

## Reglas

- El técnico solo ve sus órdenes.
- No ve presupuestos, pagos ni métricas globales.
- Las transiciones permitidas son las mismas del backend.
- Fotos: JPEG, PNG o WebP; máximo 5 MB.
- No se permite modificar una orden finalizada o cancelada.
- Los archivos se sirven autenticados, nunca por URL pública directa.

## PWA

- `manifest.webmanifest` con nombre, colores, iconos y `display: standalone`.
- Service worker con cache del shell y página offline.
- No cachear respuestas de API.
- Instalación desde el navegador del celular.

## Rutas

- `/tech`: listado de trabajos asignados.
- `/tech/orders/[id]`: detalle y acciones.
- `/offline`: fallback cuando no hay red.

## Pruebas

- Técnico A no puede ver la orden de técnico B.
- Técnico no puede acceder a endpoints financieros.
- Iniciar/finalizar actualiza estado y evento.
- Nota, material y foto quedan persistidos.
- Adjunto inválido o demasiado grande se rechaza.
