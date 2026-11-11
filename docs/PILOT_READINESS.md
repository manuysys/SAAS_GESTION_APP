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

**Resumen:** 0 hechos, 6 en curso, 11 pendientes, 3 bloqueados (sobre 20 criterios).

## 1. Checklist de criterios

| # | Criterio | Estado | Evidencia verificada | Dependencia externa / nota |
|---|---|---|---|---|
| 1 | El propietario puede invitar técnicos desde la web | Pendiente | No hay rutas `/team`, modelo `invitations` ni pantalla de equipo en `apps/`. Solo existe el contrato en `docs/TEAM_API.md`. | Ninguna para construir. Requiere email para completar (criterio 2). |
| 2 | El técnico recibe una invitación real | Bloqueado | No hay módulo de email en `apps/api`. Búsqueda de `resend` sin resultados en código. | Dominio DOVEXO verificado, cuenta Resend y `RESEND_API_KEY`. Ver sección 3. |
| 3 | Puede aceptar la invitación | Pendiente | Sin endpoints `/public/invitations/*`. | Ninguna para construir. |
| 4 | Aparece en el equipo | Pendiente | Sin listado de equipo (`GET /api/v1/team`). | Depende de 1 y 3. |
| 5 | Los límites del plan son respetados | En curso | Límite de órdenes por mes aplicado en creación y conversión (`PROJECT_STATUS.md`). Límites de usuarios y técnicos sin endpoint de alta. | Se cierra al implementar invitaciones (`max_users`, `max_technicians` con lock). |
| 6 | El propietario puede habilitar acceso al portal de clientes | Pendiente | Sin `POST /api/v1/customers/{id}/portal-access`. Hoy el acceso demo usa `dev_token` (`portal_service.py`). | Ninguna para construir. |
| 7 | Puede enviar o copiar un enlace seguro | Pendiente | Sin generación de enlace administrativo. Envío bloqueado por email. | Copiar enlace no depende de Resend; enviarlo sí. |
| 8 | El cliente puede ingresar | En curso | Login demo funciona en `servicios-demo` con `PORTAL_DEV_MODE=true` (`DEMO_ENVIRONMENT.md`, sección 1.1). | Entrega real del acceso: bloqueada por email. `dev_token` debe salir de producción. |
| 9 | El cliente ve exclusivamente sus datos | En curso | Existe `apps/api/tests/test_portal.py`, que verifica el tenant de la sesión. No se revisó en esta sesión si cubre el aislamiento entre dos clientes del mismo tenant; hay que confirmarlo antes de cerrar el criterio. | Completar pruebas de aislamiento de cliente. |
| 10 | El administrador puede importar clientes desde CSV | Pendiente | Sin endpoint ni UI de importación. | Ninguna. |
| 11 | Puede importar clientes desde XLSX | Pendiente | Sin soporte XLSX en el código. | Ninguna. Definir librería compatible en Python antes de implementar. |
| 12 | El importador muestra errores y duplicados | Pendiente | No implementado. | Depende de 10 y 11. |
| 13 | El onboarding permite configurar una empresa sin intervención técnica | Pendiente | No hay rutas ni componentes de onboarding (`CONTEXTO`/`ROADMAP` lo listan como pendiente). | Depende de 1 (paso de equipo) y 10 (paso de datos). |
| 14 | La demo puede restaurarse | Pendiente | `DEMO_ENVIRONMENT.md` documenta que no existe seed versionado ni reset. El seed vive en `.local/` (no versionado). | Ninguna para construir; requiere decidir base de demo (opciones A/B/C en `DEMO_ENVIRONMENT.md`). |
| 15 | La aplicación tiene un build firmado | Bloqueado | APK actual firmado con debug (`KNOWN_ISSUES.md`). `apps/mobile/app.json` usa `com.arreglo.mobile`. No hay keystore de release. | Keystore de release fuera de Git, decisión de `applicationId` (`com.dovexo.mobile`) antes de generarla. |
| 16 | La aplicación se instala en Android real | Bloqueado | No hay evidencia de instalación en dispositivo físico. | Dispositivo Android físico y APK o AAB firmado (criterio 15). |
| 17 | El flujo técnico principal funciona | En curso | PWA `/tech` probada en navegador contra Vercel + Neon (`PROJECT_STATUS.md`). App Expo sin prueba en dispositivo. | Dispositivo físico para cerrar la parte móvil. |
| 18 | Los backups tienen una restauración comprobada | Pendiente | Existen `.github/workflows/backup.yml`, `scripts/backup.ps1` y `scripts/restore.ps1`. No hay registro de una restauración probada. `docs/BACKUP_RESTORE.md` no existe todavía. | Almacenamiento externo independiente y base de staging para la prueba. |
| 19 | Las pruebas de seguridad correspondientes pasan | En curso | 99 pruebas pytest existentes (`PROJECT_STATUS.md`). No hay pruebas para invitaciones, magic link de cliente, importación ni reutilización de tokens, porque esas funciones no existen. | Se completa al implementar cada bloque (lista de `PROXIMOS_PASOS.txt`, sección 13). |
| 20 | La documentación permite repetir los procesos | En curso | Hay documentación de demo, deploy, móvil y operación. Faltan `EMAIL_RESEND.md`, `BACKUP_RESTORE.md` y `ANDROID_RELEASE.md`. | Crear esos documentos cuando se implementen los procesos. |

## 2. Estado de identidad

| Elemento | Estado real |
|---|---|
| Empresa | ARVOKTA (decisión de `PROXIMOS_PASOS.txt`). |
| Producto | DOVEXO, registrado como nombre aprobado en ADR-016. Dominio pendiente. |
| UI web | Todavía muestra "Arreglo" (`apps/web/src/lib/brand.ts`). |
| App Android | `apps/mobile/app.json`: nombre "Arreglo", slug y scheme `arreglo`, package `com.arreglo.mobile`. |
| Email | Sin módulo. Cuando exista, remitente `DOVEXO <no-reply@dominio-verificado>` (`TEAM_API.md`). |

Antes de generar la keystore de release hay que decidir el `applicationId` definitivo. Ver ADR-016.

## 3. Bloqueos externos

| Bloqueo | Criterios afectados | Acción necesaria | Responsable |
|---|---|---|---|
| Dominio DOVEXO no registrado ni verificado | 2, 7, 14 (remitente), sección 12 de `PROXIMOS_PASOS.txt` | Búsqueda de marca, registro del dominio en NIC.ar, DNS con SPF, DKIM y DMARC verificados en Resend. | Fundador / ARVOKTA |
| Cuenta Resend y `RESEND_API_KEY` | 2, 7 | Crear cuenta, verificar dominio y cargar la clave como secreto en Vercel (no en el frontend). | Fundador / ARVOKTA |
| Cuenta de Google Play Console | 15, 16 | Crear cuenta de desarrollador, ficha, política de privacidad y data safety. | Fundador / ARVOKTA |
| Keystore de release | 15 | Generar la keystore, guardar backup seguro fuera de Git y definir `applicationId` antes del primer upload. | Fundador / ARVOKTA |
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
