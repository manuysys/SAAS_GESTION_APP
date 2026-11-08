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

### PostgreSQL administrado

- Activar backups automáticos diarios.
- Retención mínima: 7 diarios, 4 semanales, 3 mensuales.
- Cifrado en reposo y en tránsito.
- Probar restauración al menos una vez antes del lanzamiento.

### Backup manual

```powershell
pg_dump --format=custom --no-owner --file=backup.dump "$env:DATABASE_URL_SYNC"
pg_restore --clean --if-exists --no-owner --dbname="$env:DATABASE_URL_SYNC" backup.dump
```

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
