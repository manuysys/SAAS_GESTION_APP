# Preparación para pilotos

**Fecha:** 2026-11-10
**Fuente de criterios:** `PROXIMOS_PASOS.txt`, sección 14 (criterios 1 a 20).
**Alcance:** estado real de cada criterio. No describe funcionalidad planificada como si existiera.

## Leyenda

| Estado | Significado |
|---|---|
| **Hecho** | Hay código en el repositorio y prueba o evidencia verificable. |
| **En curso** | Existe una parte implementada o una prueba parcial. Falta cerrar el criterio. |
| **Pendiente** | No hay código. Puede desarrollarse sin dependencias externas. |
| **Bloqueado** | Falta una cuenta, credencial, dominio o dispositivo externo. Ver sección 3. |

**Resumen:** 10 hechos, 3 en curso, 6 pendientes y 1 bloqueado (sobre 20 criterios).

Actualización 2026-11-11: se cerraron los hallazgos de la auditoría de seguridad
(revocación de sesión de portal, consumo atómico, reenvío idempotente,
invitaciones vencidas, escape HTML, `Origin` y `Referrer-Policy`, rate limit con
IP de proxy). El criterio 19 sigue en curso solo por importación y onboarding.

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
| 10 | El administrador puede importar clientes desde CSV | Pendiente | Sin endpoint ni UI de importación. | Ninguna. |
| 11 | Puede importar clientes desde XLSX | Pendiente | Sin soporte XLSX en el código. | Ninguna. Definir librería compatible en Python antes de implementar. |
| 12 | El importador muestra errores y duplicados | Pendiente | No implementado. | Depende de 10 y 11. |
| 13 | El onboarding permite configurar una empresa sin intervención técnica | Pendiente | No hay rutas ni componentes de onboarding (`CONTEXTO`/`ROADMAP` lo listan como pendiente). | Depende de 1 (paso de equipo) y 10 (paso de datos). |
| 14 | La demo puede restaurarse | Pendiente | `DEMO_ENVIRONMENT.md` documenta que no existe seed versionado ni reset. El seed vive en `.local/` (no versionado). | Ninguna para construir; requiere decidir base de demo (opciones A/B/C en `DEMO_ENVIRONMENT.md`). |
| 15 | La aplicación tiene un build firmado | Hecho (AAB) | Keystore de release generada; workflow `android-release.yml` produjo `dovexo-android-aab` firmado y verificado | Falta subirlo a Play Console. El APK `mobile-apk-4` sigue siendo debug. |
| 16 | La aplicación se instala en Android real | Bloqueado | No hay evidencia de instalación en dispositivo físico. | Dispositivo Android físico y APK/AAB de prueba. |
| 17 | El flujo técnico principal funciona | En curso | PWA `/tech` probada en navegador contra Vercel + Neon (`PROJECT_STATUS.md`). App Expo sin prueba en dispositivo. | Dispositivo físico para cerrar la parte móvil. |
| 18 | Los backups tienen una restauración comprobada | Pendiente | Existen `.github/workflows/backup.yml`, `scripts/backup.ps1`, `scripts/restore.ps1` y `docs/BACKUP_RESTORE.md`. No hay restauración probada. | Almacenamiento externo independiente y base de staging. |
| 19 | Las pruebas de seguridad correspondientes pasan | En curso | 127 pruebas pytest; tests de invitaciones, portal, revocación de sesión, aislamiento y límites. Faltan importación y onboarding. | Se completa al implementar importación/onboarding. |
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

1. Email transaccional y módulo `email` (sin dominio, con proveedor `console`). Desbloquea la parte técnica de 2 y 7.
2. Invitaciones de técnicos (criterios 1, 3, 4, 5).
3. Acceso al portal sin `dev_token` en producción (criterios 6, 7, 8, 9).
4. Importador CSV y después XLSX (criterios 10, 11, 12).
5. Onboarding y reset reproducible de la demo (criterios 13, 14).

Los bloqueos de la sección 3 se atienden en paralelo, porque no requieren código.
