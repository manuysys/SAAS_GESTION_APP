# Email transaccional con Resend

Guía de configuración y verificación del correo saliente. El módulo de código
está implementado con proveedor `console` y Resend; **la entrega productiva no
está verificada** porque faltan dominio, DNS y API key. El estado del backend se
registra en `docs/PROJECT_STATUS.md`.

## Variables de entorno

| Variable | Uso |
| --- | --- |
| `RESEND_API_KEY` | clave de API de Resend. Solo backend. |
| `EMAIL_FROM` | remitente, por ejemplo `DOVEXO <no-reply@dominio>` |
| `APP_PUBLIC_URL` | URL pública de la app para construir enlaces (invitaciones, portal, recuperación) |

Reglas:

- `RESEND_API_KEY` nunca va al frontend ni a la app móvil: no debe tener prefijo
  `NEXT_PUBLIC_` ni `EXPO_PUBLIC_`.
- Sin `RESEND_API_KEY`, el envío debe fallar de forma explícita y registrada, no
  silenciosa.
- `EMAIL_FROM` debe pertenecer a un dominio verificado en Resend. Mientras no
  exista, usar el remitente de pruebas que indica Resend y no prometer entrega.
- `APP_PUBLIC_URL` en producción apunta al dominio propio; en demo, a la URL de
  Vercel.
- No hay valores reales en el repositorio: solo `.env.example` vacío.

## Situación actual del dominio

- **No hay dominio comprado** para DOVEXO. No existe `EMAIL_FROM` productivo.
- Sin dominio verificado, Resend solo permite el modo de pruebas: remitente de
  prueba y destinatario limitado a la casilla del titular de la cuenta. No sirve
  para invitar técnicos reales.
- Por lo tanto: la entrega productiva está **bloqueada** hasta comprar y verificar
  el dominio.

## Verificación de dominio

Pasos en Resend (panel > Domains > Add domain):

1. Agregar el dominio raíz, por ejemplo `dovexo.com.ar` (el real cuando exista).
2. Resend muestra los registros DNS a crear. **Copiarlos del panel**: los valores
   son específicos de la cuenta y no se inventan en este documento.
3. Cargarlos en el proveedor de DNS del dominio (Registro, NIC.ar, Cloudflare,
   etc.).
4. Esperar la propagación (minutos a algunas horas según el TTL).
5. Volver a Resend y presionar verificar. El dominio debe quedar `verified`.
6. Recién entonces configurar `EMAIL_FROM` con ese dominio.

### Registros que se esperan

| Tipo | Función | Qué hace |
| --- | --- | --- |
| `TXT` SPF | autoriza a Resend a enviar en nombre del dominio | sin SPF, los filtros marcan el correo como sospechoso |
| `TXT`/`CNAME` DKIM | firma criptográfica del mensaje | permite detectar alteraciones y mejora la reputación |
| `TXT` DMARC (`_dmarc`) | política de fallo | indica qué hacer si falla SPF/DKIM |
| `MX` (si se reciben respuestas) | recepción | opcional, solo si se quiere recibir correo en el dominio |

DMARC inicial sugerido: `v=DMARC1; p=none; rua=mailto:<casilla de reportes>`.
Con `p=none` se observa sin rechazar. Pasar a `quarantine` solo después de unas
semanas con reportes limpios. No inventar la casilla de reportes: definirla.

Validación externa una vez publicado el DNS:

```powershell
Resolve-DnsName -Type TXT <dominio>            # SPF
Resolve-DnsName -Type TXT _dmarc.<dominio>     # DMARC
Resolve-DnsName -Type TXT <selector>._domainkey.<dominio>   # DKIM
```

El selector DKIM lo informa Resend.

## Modo de pruebas

Mientras no haya dominio verificado:

- Usar la clave de API de un entorno de desarrollo, no la de producción.
- Enviar solo a la casilla del titular de la cuenta.
- Verificar la bandeja de entrada y la carpeta de spam manualmente.
- No usar direcciones de clientes reales.
- Registrar en `docs/KNOWN_ISSUES.md` que la entrega no es productiva.

## Aceptado no es entregado

Es la distinción más importante para no mentir sobre el estado del correo:

| Estado | Significado | Cómo se comprueba |
| --- | --- | --- |
| Solicitado | la app pidió enviar | log propio, antes de llamar a Resend |
| Aceptado | Resend respondió 200 con un `id` | respuesta de la API |
| Enviado | Resend lo entregó a un servidor de destino | evento `email.sent` |
| Entregado | el servidor del destinatario lo aceptó | evento `email.delivered` |
| Rebotado | rechazado (casilla inexistente, bloqueo) | evento `email.bounced` |
| Marcado como spam | el usuario lo reportó | evento `email.complained` |

Un `200` de la API significa **aceptado**, no entregado. Nunca afirmar "el
usuario recibió el correo" sin un evento de entrega o una confirmación humana.

Guardar el `id` de Resend junto al registro de envío permite correlacionar
después con los webhooks. No guardar el cuerpo completo ni datos sensibles
innecesarios.

## Webhooks de entrega

Para conocer el resultado real hay que consumir webhooks:

1. En Resend: Webhooks > Add endpoint, apuntando a la API
   (`<API>/api/v1/webhooks/resend` cuando exista).
2. Suscribir al menos: `email.sent`, `email.delivered`, `email.bounced`,
   `email.delivery_delayed`, `email.complained`.
3. Resend firma con el esquema de Svix: encabezados `svix-id`,
   `svix-timestamp` y `svix-signature`. Verificar la firma con el secreto del
   endpoint antes de procesar nada.
4. Rechazar eventos con timestamp viejo (protección contra replay).
5. Procesar de forma idempotente por `svix-id` / `email_id`: los webhooks se
   reintentan.
6. Registrar el estado en la base y no borrar historial de fallos.

Sin webhooks configurados, el sistema solo sabe que Resend aceptó el envío.

## Seguridad y operación

- La clave vive en variables de entorno del backend (Vercel). Rotarla si se
  sospecha filtración: generar nueva en Resend y actualizar el entorno.
- No registrar la clave ni el cuerpo del correo en logs.
- Limitar reintentos con backoff y una clave de idempotencia por envío lógico:
  un reintento de la operación de negocio no debe duplicar el correo.
- Un fallo de email no debe revertir la operación de negocio (crear la
  invitación aunque el envío falle); sí debe quedar registrado y ser visible.
- Respetar los límites del plan contratado y monitorear rebotes: una tasa alta de
  rebotes puede suspender la cuenta.

## Cuando el fundador compre el dominio

1. Registrar el dominio a nombre de ARVOKTA.
2. Configurar DNS y verificar el dominio en Resend.
3. Crear `EMAIL_FROM` con el dominio verificado.
4. Configurar `APP_PUBLIC_URL` con el dominio de la app.
5. Cargar `RESEND_API_KEY` de producción en el entorno del backend.
6. Enviar un correo de prueba a una casilla externa (Gmail, Outlook) y revisar
   spam y encabezados (`Authentication-Results` debe mostrar `spf=pass`,
   `dkim=pass`).
7. Configurar el webhook y comprobar que llega `email.delivered`.
8. Recién entonces habilitar invitaciones y magic links para clientes reales.
9. Publicar la política de privacidad que mencione el envío de correos.

## Bloqueos externos

- Dominio no comprado.
- Cuenta de Resend y clave de API: estado no verificado en este documento.
- Casilla para reportes DMARC sin definir.