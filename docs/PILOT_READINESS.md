# Preparación para pilotos

**Fecha:** 2026-11-11
**Fuente de criterios:** `PROXIMOS_PASOS.txt`, sección 14 (criterios 1 a 20).
**Alcance:** estado real de cada criterio. No describe funcionalidad planificada como si existiera.

## Leyenda

| Estado | Significado |
|---|---|
| **Hecho** | Hay código en el repositorio y prueba o evidencia verificable. |
| **En curso** | Existe una parte implementada o una prueba parcial. Falta cerrar el criterio. |
| **Pendiente** | No hay código. Puede desarrollarse sin dependencias externas. |
| **Bloqueado** | Falta una cuenta, credencial, dominio o dispositivo externo. Ver sección 3. |

**Resumen:** 13 hechos, 5 en curso, 1 pendiente y 1 bloqueado (sobre 20 criterios).

Actualización 2026-11-11: se cerraron los hallazgos de la auditoría de seguridad
(revocación de sesión de portal, consumo atómico, reenvío idempotente,
invitaciones vencidas, escape HTML, `Origin` y `Referrer-Policy`, rate limit con
IP de proxy). Se implementaron el importador CSV/XLSX (criterios 10 a 12), el
onboarding (13) y el reset del tenant demo (14). Quedan en curso:

- **11 (XLSX):** `openpyxl` y `defusedxml` no están en `apps/api/requirements.txt`.
  Sin ellos el preview XLSX falla en Vercel.
- **13 (onboarding):** falta la prueba E2E en navegador y la verificación en producción.
- **19 (seguridad):** falta la ejecución final de `scripts/verify.ps1` que confirme
  la suite con importación, onboarding y reset.

Los criterios marcados como Hecho tienen código y tests en el repositorio. Ninguno
tiene todavía verificación final en producción; ese registro lo hace `devops`.

## 1. Checklist de criterios

| # | Criterio | Estado | Evidencia verificada | Dependencia externa / nota |
|---|---|---|---|---|
| 1 | El propietario puede invitar técnicos desde la web | Hecho | `apps/api/app/api/routes/team.py`, `apps/web/src/app/(app)/settings/team/page.tsx`; `tests/test_invitations.py` | Falta probarlo con un usuario real. |
| 2 | El técnico recibe una invitación real | En curso | `email_service.py` con proveedor `console` y Resend; `tests/test_email_service.py` | Sin dominio verificado ni `RESEND_API_KEY` no hay entrega real. Ver sección 3. |
| 3 | Puede aceptar la invitación | Hecho | `POST /api/v1/public/invitations/{token}/accept`; `tests/test_invitations.py`; página `/invitations/[token]` | Requiere que el email coincida con el invitado. |
| 4 | Aparece en el equipo | Hecho | `GET /api/v1/team`; `tests/test_invitations.py`; UI de equipo | — |
| 5 | Los límites del plan son respetados | Hecho | `plan_limits_service.py` valida órdenes, usuarios y técnicos con lock; tests de límites | Los planes reales deben tener los límites cargados. |
| 6 | El propietario puede habilitar acceso al portal de clientes | Hecho | `POST /api/v1/customers/{id}/portal-access`; sección en el detalle del cliente | — |
| 7 | Puede enviar o copiar un enlace seguro | Hecho | `access_url` con token crudo una vez; `CopyLinkField`; email opcional | El envío real por email sigue bloqueado por Resend/dominio. |
| 8 | El cliente puede ingresar | Hecho | `/portal/[slug]?token=...`, deep link `dovexo://customer`, verificación de token; prueba de producción | Falta probarlo en un dispositivo con la app instalada. |
| 9 | El cliente ve exclusivamente sus datos | Hecho | `tests/test_portal.py::test_portal_orders_and_quotes_are_customer_scoped`; dependencia de portal por cliente/tenant | — |
| 10 | El administrador puede importar clientes desde CSV | Hecho | `POST /api/v1/imports/customers/preview` y `/commit`, `GET /api/v1/imports/{job_id}/errors.csv` (`apps/api/app/services/import_service.py`); `apps/api/tests/test_imports.py` (preview CSV, commit idempotente, permisos por rol); UI en `/settings/import` con `customer-import.test.tsx`. | Verificación final en producción pendiente (devops). |
| 11 | Puede importar clientes desde XLSX | En curso | Parser XLSX con `openpyxl` y `defusedxml`; límites anti zip-bomb (1000 entradas, 20 MB descomprimidos, ratio 100); `test_imports.py` (XLSX válido, zip bomb, corte en fila 501). | `openpyxl` y `defusedxml` están en `pyproject.toml` pero no en `apps/api/requirements.txt`. Según el código, en Vercel el preview devuelve 422. Ver `KNOWN_ISSUES.md`. |
| 12 | El importador muestra errores y duplicados | Hecho | Preview con `errors` y `duplicate` por fila; duplicados contra la base y dentro del archivo; `errors.csv` descargable con neutralización de fórmulas en la salida; tests `test_preview_duplicate_*` y `test_errors_csv_*`. | Verificación final en producción pendiente. |
| 13 | El onboarding permite configurar una empresa sin intervención técnica | En curso | Asistente de cuatro pasos en `/onboarding` (`onboarding-wizard.tsx`); progreso en `tenants.onboarding_state`; checklist en el dashboard; `test_onboarding.py` y `onboarding-wizard.test.tsx`. | Falta prueba E2E en navegador y verificación en producción. El paso 4 usa la importación; su XLSX depende de la brecha de `requirements.txt`. |
| 14 | La demo puede restaurarse | Hecho | `POST /api/v1/admin/demo/reset` solo para platform admin, sobre el tenant `servicios-demo`; seed versionado en `apps/api/app/seed/demo.py` con turno futuro; `apps/api/tests/test_demo_reset.py` (11 tests: permisos, aislamiento, idempotencia, `audit_logs` preservados). | Sin botón en la UI. `demo@saasgestion.com` no es platform admin, así que no puede ejecutarlo. Verificación en producción pendiente. |
| 15 | La aplicación tiene un build firmado | Hecho (AAB) | Keystore de release generada; workflow `android-release.yml` produjo `dovexo-android-aab` firmado y verificado | Falta subirlo a Play Console. El APK `mobile-apk-4` sigue siendo debug. |
| 16 | La aplicación se instala en Android real | Bloqueado | No hay evidencia de instalación en dispositivo físico. | Dispositivo Android físico y APK/AAB de prueba. |
| 17 | El flujo técnico principal funciona | En curso | PWA `/tech` probada en navegador contra Vercel + Neon (`PROJECT_STATUS.md`). App Expo sin prueba en dispositivo. | Dispositivo físico para cerrar la parte móvil. |
| 18 | Los backups tienen una restauración comprobada | Pendiente | Existen `.github/workflows/backup.yml`, `scripts/backup.ps1`, `scripts/restore.ps1` y `docs/BACKUP_RESTORE.md`. No hay restauración probada. | Almacenamiento externo independiente y base de staging. |
| 19 | Las pruebas de seguridad correspondientes pasan | En curso | 179 pruebas pytest reportadas, incluidas importación, onboarding y reset (`test_imports.py`, `test_onboarding.py`, `test_demo_reset.py`), además de invitaciones, portal, revocación de sesión, aislamiento y límites. | Ejecución final de `scripts/verify.ps1` pendiente (qa/devops). Pasa a Hecho cuando haya salida real. |
| 20 | La documentación permite repetir los procesos | Hecho | `docs/EMAIL_RESEND.md`, `docs/ANDROID_RELEASE.md`, `docs/BACKUP_RESTORE.md`, `docs/TEAM_API.md`, `docs/PILOT_READINESS.md` | Mantenerla actualizada. |

## 2. Estado de identidad

| Elemento | Estado real |
|---|---|
| Empresa | ARVOKTA (decisión de `PROXIMOS_PASOS.txt`). |
| Producto | DOVEXO, registrado como nombre aprobado en ADR-016. Dominio pendiente. |
| UI web | DOVEXO/ARVOKTA (`apps/web/src/lib/brand.ts`). |
| App Android | DOVEXO, slug/scheme `dovexo`, package `com.dovexo.mobile`. |
| Email | Módulo con proveedor `console` y Resend; falta dominio verificado y API key. |

La keystore de release ya fue generada y el AAB firmado está en GitHub Actions.
El `applicationId` `com.dovexo.mobile` queda fijo para la primera subida a Play.
Ver ADR-016.

## 3. Bloqueos externos

| Bloqueo | Criterios afectados | Acción necesaria | Responsable |
|---|---|---|---|
| Dominio DOVEXO no registrado ni verificado | 2, 7, 14 (remitente), sección 12 de `PROXIMOS_PASOS.txt` | Búsqueda de marca, registro del dominio en NIC.ar, DNS con SPF, DKIM y DMARC verificados en Resend. | Fundador / ARVOKTA |
| Cuenta Resend y `RESEND_API_KEY` | 2, 7 | Crear cuenta, verificar dominio y cargar la clave como secreto en Vercel (no en el frontend). | Fundador / ARVOKTA |
| Cuenta de Google Play Console | 15, 16 | Crear cuenta de desarrollador, ficha, política de privacidad y data safety. | Fundador / ARVOKTA |
| Keystore de release | 15 | **Hecho:** keystore generada y secretos en GitHub. Falta backup seguro fuera de esta máquina. | Fundador / ARVOKTA |
| Dispositivo Android físico | 16, 17 | Instalar el build firmado y recorrer la lista de pruebas de `PROXIMOS_PASOS.txt`, sección 10. | Equipo de QA |
| Almacenamiento externo para backups y base de staging | 18 | Definir proveedor de backup independiente, cifrado y retención. Restaurar en staging, nunca en producción. | Fundador / ARVOKTA |

Dependencias no bloqueantes del piloto según `PROXIMOS_PASOS.txt`: push (EAS projectId y FCM), WhatsApp (credenciales de Meta) y Mercado Pago.

## 4. Próximo bloque de trabajo sugerido

Los bloques de invitaciones, portal, importador, onboarding y reset ya tienen código
en el repositorio. Lo que sigue, en orden:

1. Agregar `openpyxl` y `defusedxml` a `apps/api/requirements.txt` y redesplegar la
   API. Cierra la parte técnica de 11.
2. Verificación final con `scripts/verify.ps1` y registro de la salida real. Cierra 19.
3. Prueba E2E en navegador del importador, el onboarding y el reset contra Vercel
   + Neon. Cierra 13 y confirma 10, 12 y 14 en producción.
4. Dominio, cuenta de Resend y `RESEND_API_KEY` (criterios 2 y 7; bloqueados, ver
   sección 3). El módulo de email ya existe.

Los bloqueos de la sección 3 se atienden en paralelo, porque no requieren código.
