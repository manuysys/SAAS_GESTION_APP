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
- **IA externa con Groq en producción.** El proveedor OpenAI-compatible está
  configurado con Groq (`openai/gpt-oss-120b`) y fallback determinista si se
  agota la cuota. Ollama local no se probó con el modelo grande por RAM.
- **Mercado Pago sin credenciales.** No hay cobros reales ni webhooks.
- **Sin correo transaccional.** Las notificaciones son solo in-app y el magic
  link del portal no se envía por email ni WhatsApp: en la demo se devuelve un
  `dev_token`.

## Producto

- **Enforcement de límites parcial.** Las órdenes por mes ya se validan al crear
  una orden o convertir una solicitud. Usuarios y técnicos todavía no tienen un
  endpoint de alta donde aplicar su límite.
- **Suscripción sin cobro.** El registro crea una suscripción `trialing`; no se
  cobra ni se procesa pago.
- **Automatizaciones sin worker.** Las acciones se ejecutan en la transacción del
  evento. No hay outbox ni reintentos programados.
- **`send_whatsapp` queda `skipped`.** Hasta configurar WhatsApp, la acción no
  envía nada.
- **Fotos en PostgreSQL.** Los adjuntos se guardan como `BYTEA`; migrar a S3 en
  producción.
- **Rate limiting compartido en PostgreSQL.** Hay fallback en memoria; para
  varias instancias conviene Redis/Upstash o el límite del proveedor.
- **Panel global.** Requiere `is_platform_admin` o un email en
  `PLATFORM_ADMIN_EMAILS`. No hay interfaz para administrar platform admins.
- **Sin entrevistas a clientes.** La investigación competitiva está hecha, pero
  no hay validación con clientes reales.
- **Nombre comercial: resuelto parcialmente (2026-11-10).** DOVEXO está aprobado como producto (ADR-016), pero el dominio, la búsqueda de marca y el cambio de código siguen pendientes. Ver la sección "Identidad, dominio y distribución".

## App móvil y portal

- **APK de prueba firmado con debug.** El build local usa la keystore de debug;
  sirve para instalar en un dispositivo real, no para Google Play. Para publicar
  hay que configurar una keystore de release o usar EAS.
- **Sin probar en dispositivo físico.** Falta instalar el APK y recorrer login,
  trabajos, fotos, offline y portal en un Android real.
- **Push requiere `extra.eas.projectId`.** Sin `eas init` o un development build,
  el registro de notificaciones queda desactivado silenciosamente.
- **Magic link sin entrega real.** No hay email transaccional ni WhatsApp; el
  portal usa `dev_token` en el tenant demo con `PORTAL_DEV_MODE=true`.
- **`PORTAL_DEV_MODE=true` en producción.** Permite iniciar sesión como el
  cliente demo de `servicios-demo`. Desactivarlo para un entorno real.
- **Fotos offline en almacenamiento local.** Se copian a `documentDirectory`; si
  se reinstala la app o se limpian datos, se pierden antes de sincronizar.
- **iOS no probado.** Requiere macOS o EAS Build.
- **El portal no reemplaza la web.** No incluye facturación fiscal, configuración
  de empresa ni administración.

## Riesgos técnicos

- Compatibilidad de dependencias con Node 24/26 y Python 3.12.
- RLS de PostgreSQL y FK compuestas requieren diseño cuidadoso.
- Costos variables de IA y WhatsApp sin cuotas comerciales validadas.
- Migración de adjuntos a almacenamiento S3-compatible.
- Protección de datos personales y revisión legal Ley 25.326.

## Identidad, dominio y distribución (2026-11-10)

- **Dominio de DOVEXO no registrado ni verificado.** No hay dominio para el
  remitente de email, la landing ni los enlaces de invitación. Acción: búsqueda de
  marca, registro en NIC.ar y configuración DNS. Ver [`BRAND.md`](BRAND.md).
- **Resend sin cuenta ni dominio verificado.** El módulo de email existe con
  proveedor `console` y Resend opcional, pero no hay `RESEND_API_KEY` ni dominio
  verificado. Ninguna afirmación de "email entregado" es válida. Bloquea
  invitaciones reales y enlaces de acceso por email; el enlace se copia a mano.
- **Identidad de código actualizada.** `brand.ts` y `app.json` usan
  DOVEXO/ARVOKTA. El `applicationId` es `com.dovexo.mobile` y no se puede cambiar
  después de la primera subida a Play.
- **Keystore de release generada; AAB no subido a Play.** El workflow
  `android-release.yml` generó y verificó `dovexo-android-aab`. El APK
  `mobile-apk-5` sigue firmado con debug y no es publicable. Falta el backup
  seguro de la keystore y la cuenta de Play Console.
- **Sin cuenta de Google Play Console.** No hay ficha, política de privacidad ni
  data safety. Bloquea la prueba interna.
- **Sin prueba en Android físico.** Criterios 16 y 17 de `PROXIMOS_PASOS.txt`
  siguen abiertos. Ver [`PILOT_READINESS.md`](PILOT_READINESS.md).
- **Discrepancia documental resuelta.** `PROXIMOS_PASOS.txt` fue actualizado
  para registrar DOVEXO como nombre aprobado, con dominio y marca pendientes.
- **Restauración de backups no probada.** Existe el workflow `backup.yml`, los
  scripts `backup.ps1`/`restore.ps1` y `docs/BACKUP_RESTORE.md`, pero no hay un
  registro de restauración en staging.
- **Documentación de referencia creada.** `docs/EMAIL_RESEND.md`,
  `docs/ANDROID_RELEASE.md`, `docs/BACKUP_RESTORE.md` y `docs/TEAM_API.md` ya
  existen. Mantenerlos actualizados cuando cambie el proceso.
- **Pytest completo puede colgarse en Windows.** La suite entera en un solo
  proceso se quedó esperando una conexión asyncpg después de
  `test_invitations.py`. `scripts/verify.ps1` ejecuta los mismos 127 tests en dos
  procesos (71 + 56) y así termina de forma estable. No se perdió cobertura.
