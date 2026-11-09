# Problemas conocidos

## Entorno y despliegue

- **GitHub CLI parcialmente autenticado.** `gh` está instalado y el push a
  `origin` funciona con la credencial de Windows, pero `gh auth login` no se
  completó porque el token existente no tiene el scope `read:org`. Para usar
  todas las funciones de `gh` hay que autorizar un token con ese scope.
- **Demo en planes gratuitos.** Frontend y API están en Vercel Hobby; la base
  está en Neon Free. Hay límites de uso, cold starts y una ventana de
  restauración acotada. No es producción con SLA.
- **Docker no operativo.** Docker Desktop está instalado, pero no hay WSL/Hyper-V
  activo. El desarrollo usa PostgreSQL portable, no contenedores.
- **Node 26 global en `Downloads`.** Se instaló Node 24 LTS con `fnm` para el
  proyecto. Si `fnm` no se activa en una shell nueva, usar
  `fnm exec --using=24 -- <comando>`.
- **Ollama limitado.** `gpt-oss:20b` ocupa 13 GB y el equipo tiene 16 GB de RAM
  y un i5 de dos núcleos. No usar en paralelo con builds pesados.

## Integraciones

- **WhatsApp sin probar end-to-end.** El código de configuración, webhook,
  firma HMAC y envío está implementado, pero no hay número de Meta ni
  credenciales reales. No afirmar que funciona hasta probarlo.
- **IA externa sin API key.** El proveedor determinista funciona localmente.
  OpenAI-compatible y Ollama están implementados, pero no se probaron contra un
  proveedor externo real.
- **Mercado Pago sin credenciales.** No hay cobros reales ni webhooks.
- **Sin correo transaccional.** Las notificaciones son solo in-app.

## Producto

- **Enforcement de límites parcial.** Los planes y límites existen, pero todavía
  no se valida cada límite en todos los endpoints.
- **Suscripción sin cobro.** El registro crea una suscripción `trialing`; no se
  cobra ni se procesa pago.
- **Automatizaciones sin worker.** Las acciones se ejecutan en la transacción del
  evento. No hay outbox ni reintentos programados.
- **`send_whatsapp` queda `skipped`.** Hasta configurar WhatsApp, la acción no
  envía nada.
- **Fotos en PostgreSQL.** Los adjuntos se guardan como `BYTEA`; migrar a S3 en
  producción.
- **Rate limiting en memoria.** Es por instancia; en producción con varias
  instancias hace falta Redis/Upstash o el límite del proveedor.
- **Panel global.** Requiere `is_platform_admin` o un email en
  `PLATFORM_ADMIN_EMAILS`. No hay interfaz para administrar platform admins.
- **Sin entrevistas a clientes.** La investigación competitiva está hecha, pero
  no hay validación con clientes reales.
- **Sin nombre comercial aprobado.** TIVORA fue descartado preliminarmente.

## Riesgos técnicos

- Compatibilidad de dependencias con Node 24/26 y Python 3.12.
- RLS de PostgreSQL y FK compuestas requieren diseño cuidadoso.
- Costos variables de IA y WhatsApp sin cuotas comerciales validadas.
- Migración de adjuntos a almacenamiento S3-compatible.
- Protección de datos personales y revisión legal Ley 25.326.
