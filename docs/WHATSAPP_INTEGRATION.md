# WhatsApp Business Platform

## Decisión

Usar la API oficial de WhatsApp Business Platform / Cloud API. No automatizar
WhatsApp Web ni sesiones personales.

## Arquitectura

```text
WhatsApp Cloud API
      │ webhook
      ▼
Adaptador WhatsApp (FastAPI)
      │
      ├── verificación de firma
      ├── idempotencia
      ├── normalización de mensajes
      └── comunicación con servicios de negocio
```

La lógica de negocio no vive en el webhook. El adaptador traduce el evento a un
comando interno.

## Configuración por tenant

- `phone_number_id`
- `business_account_id`
- `access_token` cifrado
- `verify_token`
- `app_secret`
- `webhook_url`

## Webhook

- `GET /api/v1/webhooks/whatsapp`: verificación con `hub.mode`,
  `hub.verify_token` y `hub.challenge`.
- `POST /api/v1/webhooks/whatsapp`: validar `X-Hub-Signature-256` con HMAC
  SHA-256, rechazar duplicados por `message.id`, normalizar y encolar.
- Responder 200 rápido; procesar de forma asíncrona.

## Funcionalidades previstas

- Recibir mensajes.
- Identificar cliente por teléfono.
- Registrar consulta/solicitud.
- Asociar conversación.
- Enviar confirmaciones y recordatorios.
- Enviar presupuestos.
- Solicitar reseñas.

## Reglas

- Consentimiento y plantillas aprobadas.
- Límites y costos por conversación.
- Reintentos con backoff.
- Registro de mensajes y estados.
- Secretos por tenant.
- La plataforma sigue funcionando si WhatsApp falla.

## Estado actual

Esqueleto de integración. Sin credenciales de Meta no se prueba end-to-end.
No afirmar que la integración funciona hasta probarla con un número real.
