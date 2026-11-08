# Seguridad

## Principios

- Seguridad desde el primer commit, no como fase posterior.
- Mínimo privilegio y defensa en profundidad.
- Nunca confiar en datos del cliente (body, query, headers, archivos).
- Los secretos viven fuera del repositorio.

## Autenticación

- Contraseñas con Argon2id (parámetros calibrados al hardware).
- Access token JWT firmado con HS256 o EdDSA, 15 minutos.
- Refresh token opaco, hasheado en base, rotativo, 30 días.
- Detección de reutilización de refresh token: revocar toda la familia.
- Cookies `HttpOnly`, `Secure` en producción, `SameSite=Lax`.
- Verificación de email y recuperación de contraseña con tokens de un solo uso.
- Rate limiting por IP y por cuenta en login, registro y refresh.
- Bloqueo temporal progresivo tras intentos fallidos.

## Autorización

- RBAC por membresía: `owner`, `admin`, `dispatcher`, `technician`, `viewer`.
- Verificación en backend en cada endpoint; el frontend solo oculta opciones.
- El técnico solo ve sus órdenes y datos operativos; nunca finanzas globales.
- Acciones sensibles requieren rol y confirmación explícita.

## Multi-tenant

Ver `docs/TENANT_SECURITY.md`. Resumen:

- `tenant_id` derivado de la sesión, nunca del body.
- Repositorios con filtro obligatorio.
- Pruebas automatizadas de acceso cruzado.
- RLS como defensa adicional cuando el esquema esté estable.

## Entradas y salidas

- Validación con Pydantic v2 y límites de longitud.
- SQL parametrizado vía SQLAlchemy; prohibido SQL concatenado.
- Escapado automático de React; evitar `dangerouslySetInnerHTML`.
- Cabeceras de seguridad: CSP, HSTS, X-Content-Type-Options, Referrer-Policy.
- CORS restringido a orígenes conocidos.

## Archivos

- Validar MIME real, extensión y tamaño máximo.
- Nombres aleatorios; almacenamiento fuera del webroot.
- URLs firmadas de corta duración.
- Escaneo de malware cuando el volumen lo justifique.

## Webhooks e integraciones

- Verificar firma (HMAC) y timestamp.
- Rechazar eventos duplicados con idempotency key.
- Validar el payload antes de procesarlo.
- Secretos por tenant, cifrados en reposo.
- Reintentos con backoff y registro de fallos.

## IA y prompt injection

- Mensajes de clientes y archivos son datos no confiables.
- Instrucciones del sistema separadas del contenido externo.
- Herramientas con validación estricta de argumentos y tenant.
- Acciones sensibles requieren confirmación humana.
- No permitir SQL libre ni exportación masiva no autorizada.

## Auditoría y logs

- Registrar login, cambios de estado, permisos, pagos y accesos de soporte.
- Logs estructurados sin secretos ni datos personales innecesarios.
- Retención definida; exportación y eliminación por tenant.

## Secretos

- `.env` local gitignoreado; `.env.example` con valores ficticios.
- En producción, gestor de secretos del proveedor.
- Rotación documentada de JWT, base de datos e integraciones.

## Respaldos y continuidad

- Backup diario de PostgreSQL con retención mínima de 7 días.
- Prueba de restauración antes del lanzamiento.
- Plan documentado para caída de PostgreSQL, WhatsApp o proveedor de IA.

## Cumplimiento

- Ley 25.326 de Protección de Datos Personales (Argentina).
- Política de privacidad y términos de servicio antes de comercializar.
- Registro de finalidades, consentimiento y derechos de los titulares.
- Revisión legal profesional antes del lanzamiento.
