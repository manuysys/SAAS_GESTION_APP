# Operaciones y producción

## Health checks

- `GET /api/v1/health/live`: proceso vivo.
- `GET /api/v1/health/ready`: base de datos disponible.
- Monitorear ambos desde el proveedor de hosting.

## Logs

- Logs estructurados con request ID.
- No incluir tokens, contraseñas ni datos personales innecesarios.
- En Vercel, revisar `vercel logs` o el dashboard del proyecto.

## Respaldos

### Neon (demo pública)

- El plan Free de Neon incluye una ventana de restauración limitada.
- Verificar la ventana vigente en el panel de Neon.
- Para producción, contratar un plan con backups automáticos y retención
  explícita.
- Probar una restauración antes de usar datos reales.

### PostgreSQL local

- Usar `scripts/backup.ps1` y `scripts/restore.ps1`.
- Guardar los backups fuera de `.local` si se usan para recuperación real.

### Backup automático de Neon

- Workflow `.github/workflows/backup.yml`, diario a las 05:00 UTC.
- Requiere el secret `NEON_DATABASE_URL` con la URL directa
  (`postgresql://...`) sin prefijo de driver.
- Guarda un artefacto `backup.dump` con retención de 14 días.
- Restauración:

```powershell
pg_restore --clean --if-exists --no-owner --no-privileges \
  --dbname="$env:DATABASE_URL" backup.dump
```

- Probar la restauración en una base de staging antes de confiar en el backup.
- Para producción real, usar el plan de Neon con point-in-time recovery y
  backups administrados.

## Incidentes

| Escenario | Acción |
|---|---|
| PostgreSQL no responde | Activar modo mantenimiento, revisar proveedor, restaurar backup si es necesario |
| API caída | Rollback al deployment anterior, revisar logs y health checks |
| WhatsApp caído | Encolar mensajes, reintentar con backoff, no bloquear la operación |
| Proveedor de IA caído | Degradar a respuestas deterministas o mostrar error claro |
| Automatización fallida | Reintentar, registrar ejecución fallida y alertar |
| Credencial comprometida | Rotar secreto, revocar sesiones, auditar accesos |

## Seguridad operativa

- Rotar `JWT_SECRET` con procedimiento documentado.
- No compartir `.env` ni credenciales por chat.
- Usar gestor de secretos del proveedor.
- Aplicar mínimo privilegio a usuarios de base de datos.
- Revisar dependencias con `pnpm audit` y `uv pip audit` cuando esté disponible.
- Habilitar rate limiting en auth y endpoints sensibles.

## Rate limiting

- Login, registro, refresh y recuperación: límites estrictos por IP y cuenta.
- Endpoints públicos de presupuestos: límite por token/IP.
- IA: cuota por tenant y por usuario.
- En serverless, el límite en memoria es por instancia; para producción usar
  Redis/Upstash o el rate limiting del proveedor.

## Monitoreo mínimo

- Latencia p95 de API.
- Tasa de errores 5xx.
- Conexiones y almacenamiento de PostgreSQL.
- Ejecuciones de automatización fallidas.
- Consumo de IA y WhatsApp por tenant.
- Errores de frontend.

## Email transaccional

Proveedor recomendado: **Resend** (free: 3.000 emails/mes, 100/día, 3 dominios,
DKIM/SPF/DMARC). Alternativa: Brevo (300/día, pero con marca en el plan free).

Variables:

```env
RESEND_API_KEY=
EMAIL_FROM="Arreglo <no-reply@arreglo.com.ar>"
```

Usos iniciales: bienvenida, reset de contraseña, presupuesto enviado,
recordatorio de turno y recibo de pago. Hasta verificar el dominio, Resend solo
permite enviar al email de la cuenta.

Requisitos de entregabilidad: dominio propio, SPF, DKIM, DMARC, rebotes y quejas
configurados. No usar el dominio principal para marketing masivo sin separar
subdominio.

## Checklist de lanzamiento

- [ ] Dominio propio y HTTPS.
- [ ] Backups automáticos y restauración probada.
- [ ] Secretos en gestor del proveedor.
- [ ] Rate limiting activo.
- [ ] Monitoreo y alertas configuradas.
- [ ] Política de privacidad y términos de servicio.
- [ ] Revisión legal Ley 25.326.
- [ ] Pruebas de aislamiento multi-tenant en producción.
- [ ] Plan de soporte y contacto.
- [ ] Costos variables de IA/WhatsApp con cuotas.
