# Backups y restauración

Estrategia de respaldo de PostgreSQL, verificación de restauración y monitoreo.
Estado auditado el 2026-11-10.

## Lo que existe hoy

### 1. Script local (`scripts/backup.ps1`)

- `pg_dump` en formato custom sobre el PostgreSQL **local** de desarrollo
  (`127.0.0.1:55432`, base `saas_gestion_dev`).
- Salida: `.local/backups/saas_gestion_<timestamp>.dump`.
- Parámetros con valores por defecto de desarrollo (`saas`, `saas_dev_password`).
  No son credenciales de producción y no deben reutilizarse fuera de local.
- `.local/` está en `.gitignore`.

Este script **no respalda producción**.

### 2. Workflow (`/.github/workflows/backup.yml`)

- Programado todos los días a las 05:00 UTC y manual con `workflow_dispatch`.
- Usa el secreto `NEON_DATABASE_URL` (cadena de conexión de Neon). Sin valor en
  el repositorio.
- `pg_dump --format=custom --no-owner --no-privileges` a `backup.dump`.
- Sube el archivo como artifact `neon-backup-<run_id>` con retención de **14 días**.
- Si `NEON_DATABASE_URL` no está configurada, imprime un mensaje y termina con
  éxito: el run queda verde aunque no se haya respaldado nada.

### 3. Neon

- Plan Free. Ofrece historial limitado y restauración dentro de una ventana
  corta. **No** es un mecanismo de respaldo propio ni garantiza retención larga.

## Huecos reales

| Hueco | Riesgo |
| --- | --- |
| El artifact vive en GitHub, la misma infraestructura que el código | pérdida de cuenta o de acceso = pérdida del backup |
| Retención de 14 días | no hay copia mensual ni histórica |
| Sin cifrado | el dump contiene datos personales de clientes |
| El run verde no distingue "respaldado" de "omitido" | falsa sensación de seguridad |
| Nunca se restauró un backup | no se sabe si el dump sirve |
| Sin alerta por antigüedad del backup | un fallo silencioso pasa desapercibido |

Neon Free no debe ser la única protección de datos de clientes.

## Estrategia externa propuesta

Objetivo: RPO de 24 horas (a futuro, con PITR pago, minutos) y RTO de 2 horas
para volver a operar.

1. **Dump diario** con `pg_dump --format=custom` contra la conexión directa de
   Neon (no el pooler), igual que hoy.
2. **Cifrado antes de salir** del runner: `age` o `gpg` con clave pública. La
   clave privada queda offline, nunca en GitHub. Cifrar con la clave pública en
   CI permite respaldar sin exponer el secreto de descifrado.
3. **Almacenamiento independiente**: bucket S3-compatible (Cloudflare R2,
   Backblaze B2 o S3) en una cuenta distinta de Neon, Vercel y GitHub. Nombre
   `dovexo-pg/<YYYY>/<MM>/<DD>/dovexo-<timestamp>.dump.age`.
4. **Integridad**: guardar el SHA-256 de cada archivo junto al dump y verificarlo
   en la restauración.
5. **Retención** con reglas de ciclo de vida del bucket:
   - 7 copias diarias,
   - 4 semanales (domingo),
   - 3 mensuales (día 1),
   - borrar lo anterior.
6. **Prueba de restauración** mensual en una base de staging, con registro de
   fecha y resultado en este documento.
7. **Alerta** si el backup más reciente tiene más de 36 horas.

Variables y secretos necesarios (sin valores):

| Nombre | Tipo | Uso |
| --- | --- | --- |
| `NEON_DATABASE_URL` | secreto de GitHub | cadena de conexión de Neon para `pg_dump` |
| `BACKUP_AGE_RECIPIENT` | variable de GitHub (clave pública) | cifrado del dump |
| `BACKUP_S3_ENDPOINT` | variable | endpoint del bucket |
| `BACKUP_S3_BUCKET` | variable | nombre del bucket |
| `BACKUP_S3_ACCESS_KEY_ID` | secreto | credencial de escritura del bucket |
| `BACKUP_S3_SECRET_ACCESS_KEY` | secreto | credencial de escritura del bucket |

Credenciales del bucket: permiso solo de escritura y listado del prefijo de
backups. Nada de borrado amplio ni acceso a otros prefijos.

La clave privada de descifrado (`age`) se guarda en el gestor de contraseñas del
fundador, junto con la keystore de Android y las credenciales de producción.

## Restauración en staging

Nunca restaurar sobre producción durante una prueba. Nunca ejecutar un reset
global.

1. Elegir el destino: una base de staging separada (otra base en Neon o una
   instancia local). Verificar que el nombre **no** sea la base de producción.
2. Descargar el dump y su SHA-256 desde el bucket; comprobar el hash.
3. Descifrar a un archivo temporal (`age -d -i <clave privada>`).
4. Crear la base destino vacía y restaurar:

   ```powershell
   pg_restore --no-owner --no-privileges --dbname="$env:STAGING_DATABASE_URL" .\dovexo-<timestamp>.dump
   ```

5. Aplicar migraciones pendientes si el dump es anterior al último deploy:

   ```powershell
   cd apps/api
   uv run alembic upgrade head
   ```

6. Verificar:
   - `alembic current` muestra la revisión esperada;
   - conteos de `tenants`, `users`, `customers`, `work_orders`, `quotes` son
     coherentes con la fecha del backup;
   - `GET /api/v1/health/ready` responde 200 contra la base restaurada;
   - un login de prueba y una lectura del dashboard funcionan.
7. Registrar: fecha, quién, archivo usado, resultado y problemas.
8. Borrar el dump descifrado del disco local al terminar.

## Monitoreo

| Qué | Cómo | Alerta |
| --- | --- | --- |
| Backup ejecutado | estado del workflow de GitHub Actions | notificación por fallo |
| Backup omitido | el workflow debe marcar error si falta `NEON_DATABASE_URL` | revisar el run |
| Antigüedad | chequeo diario del objeto más reciente en el bucket | más de 36 h sin backup |
| Restauración | prueba mensual documentada | fallo de `pg_restore` |
| API | `GET /api/v1/health/live` y `/ready` | 2 fallos consecutivos |
| Frontend | URL pública de Vercel | 5xx o caída |
| Base de datos | conexiones y tamaño en Neon | cerca del límite del plan |
| Errores | logs estructurados de la API y request ID | tasa de 5xx |
| Jobs y automatizaciones | `automation_executions` con estado `failed` | cualquier fallo repetido |
| Emails | rebotes y quejas vía webhooks de Resend | tasa de rebote alta |

Hoy no hay proveedor de monitoreo de errores ni alertas configuradas. Es un
pendiente explícito, no algo que ya funcione.

## Última restauración probada

**Ninguna.** No se restauró ningún backup todavía. Hasta que se ejecute y
registre una restauración en staging, no se puede afirmar que los backups
sirvan.

## Pendientes

- [ ] Cifrado del dump antes de subirlo.
- [ ] Bucket externo con retención 7/4/3.
- [ ] Workflow que falle (no que omita) si falta `NEON_DATABASE_URL`.
- [ ] Alerta por antigüedad del backup.
- [ ] Primera restauración en staging, registrada.
- [ ] Monitoreo de errores y alertas de disponibilidad.
- [ ] Evaluar plan pago de Neon con PITR para reducir el RPO.