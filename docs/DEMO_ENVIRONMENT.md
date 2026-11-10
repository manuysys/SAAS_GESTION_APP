# Entorno de demo

**Fecha:** 2026-11-09
**Relación con otros documentos:** procedimiento de uso en [`DEMO.md`](DEMO.md); despliegue en [`DEPLOY_VERCEL.md`](DEPLOY_VERCEL.md); riesgos generales en [`SECURITY_AUDIT.md`](SECURITY_AUDIT.md) (S-06, S-16, S-20).

> **Advertencia:** este documento no repite las contraseñas. Están en [`DEMO.md`](DEMO.md) y en la landing y el login (ver sección 3). Son públicas en la práctica y deben rotarse.

## 1. Estado actual

| Componente | Estado | Evidencia |
|---|---|---|
| Frontend | Desplegado en `https://saas-gestion-web.vercel.app/`. La landing responde con contenido real. | Fetch del HTML el 2026-11-09. |
| API | Desplegada en `https://saas-gestion-api.vercel.app/`. `GET /api/v1/health/ready` devuelve `{"status":"ready"}`. | Fetch el 2026-11-09. |
| Base de datos | Neon PostgreSQL, región `gru1`, plan Free. | [`DEMO.md`](DEMO.md), [`PROJECT_STATUS.md`](PROJECT_STATUS.md). |
| Login con cuenta demo | **No verificado** en esta sesión. | — |
| Datos de demo | Declarados en [`DEMO.md`](DEMO.md): 3 clientes, 2 solicitudes, 2 órdenes, dos presupuestos, un turno, un pago parcial, una suscripción Professional, una automatización y una notificación. | **No verificados contra la base.** |
| Script de siembra | **No encontrado** en el repositorio. Ninguna búsqueda de `seed` en `apps/` o `scripts/` devolvió un seed de demo. | Búsqueda de `seed` y `saasgestion.com`. |
| Reset de datos | **No existe.** | — |
| Modo de solo lectura | **No existe.** | — |
| Separación de la base de producción | **No documentada.** No hay evidencia de que la demo esté en una base distinta de la que usaría un cliente real. | `DEMO.md` menciona una sola base Neon. |

**Conclusión:** la demo funciona como vitrina, pero no es un entorno controlado. Cualquiera que entre con la cuenta demo puede cambiar datos de forma permanente y no hay forma de volver al estado inicial desde el repositorio.

## 1.1 Actualización 2026-11-10: portal del cliente

- El portal del cliente está implementado en la API: `GET /api/v1/portal/servicios-demo` responde `200` con `demo_available: true`, y `POST /api/v1/portal/servicios-demo/auth/demo` devuelve una sesión para Carlos Gomez.
- En producción están configuradas `PORTAL_DEV_MODE=true` y `PORTAL_DEV_TENANT_SLUG=servicios-demo` (Vercel, Production).
- El token de desarrollo solo se emite para el tenant demo. Cualquier otro tenant devuelve `404`.
- El seed de la demo existe únicamente en `.local/seed-demo-neon.ps1` (no versionado). No hay seed reproducible en el repositorio.
- Siguen pendientes el reset automático, el modo de solo lectura y la separación de la base de producción.
- Riesgo nuevo: con `PORTAL_DEV_MODE=true`, cualquiera puede iniciar sesión como el cliente demo y crear solicitudes o aprobar/rechazar presupuestos. Es aceptable para la demo, no para un entorno real.

## 2. Cuentas

| Rol | Email | Empresa | Plataforma | Dónde figura la contraseña | Riesgo |
|---|---|---|---|---|---|
| Administrador | `demo@saasgestion.com` | Servicios Demo | No | `DEMO.md`, `hero.tsx`, `login/page.tsx`, `content.ts` | Alto: pública en la landing. |
| Técnico | `tecnico@saasgestion.com` | Servicios Demo | No | `DEMO.md`, `MOBILE_API.md` | Medio: expone la PWA y las órdenes asignadas. |
| Fundador / plataforma | `founder@saasgestion.com` | SaaS Gestion HQ | **Sí** (`is_platform_admin=true`) | `DEMO.md` | **Crítico** si la contraseña funciona en la base pública: da acceso a `/admin` y a métricas de todas las empresas. |

Nota sobre el dominio del email: `saasgestion.com` no es el dominio de la marca provisional (Arreglo). Conviene migrar la demo a un dominio propio cuando exista ([`BRAND.md`](BRAND.md)).

## 3. Dónde se expone la demo hoy

| Lugar | Qué muestra | Evaluación |
|---|---|---|
| `hero.tsx:58-69` | Bloque "Cuenta demo con datos de ejemplo" con email y contraseña. | Visible en el primer pantallazo. |
| `(auth)/login/page.tsx:84-91` | Recuadro "Cuenta de demo" con email y contraseña. | Visible en el login, para cualquier visitante. |
| `lib/marketing/content.ts:3-7` | Constante `demoAccount` con la contraseña. | Si el módulo se importa desde componentes de cliente, la constante llega al bundle JavaScript público. No verifiqué el grafo de imports. |
| `docs/DEMO.md`, `README.md`, `docs/MOBILE_API.md`, `docs/PROJECT_STATUS.md` | Credenciales en texto. | Depende de la visibilidad del repositorio. Ver S-16. |

El punto 3 importa: quitar el texto de la UI no alcanza si la constante sigue importada en un bundle público. Hay que verificarlo en el build (criterio D-AC1).

## 4. Riesgos

| ID | Riesgo | Probabilidad | Impacto | Mitigación propuesta |
|---|---|---|---|---|
| D-01 | Un visitante borra o modifica clientes, órdenes o pagos de la demo. Otra persona ve el estado alterado. | Alta | Medio: se pierde la confianza en la demo. | Reset programado (D-P1) y sólo lectura (D-P2). |
| D-02 | La cuenta de plataforma funciona en la base pública y permite ver métricas de todas las empresas, o cambiar planes. | Media (depende de la base) | Alto | Quitar `founder` de la base pública. Rotar contraseña. Separar la base. |
| D-03 | Un visitante registra su empresa desde la demo y carga datos reales (por error o a propósito), en la misma base. | Media | Alto: datos personales en un entorno que no es producción. | Aviso visible en el registro y en la demo; separar la base de cualquier cliente real. |
| D-04 | Scripts de abuso (automatizados) llenan la base o agotan la cuota de IA. | Media | Medio (costo y cuota). | Rate limit (ya existe para login); cuota de IA (existe); límite de creación en demo. |
| D-05 | El plan Free de Neon (almacenamiento y conexiones) o el Hobby de Vercel se agotan. | Media | Alto: la demo deja de responder. | Monitoreo simple y reset que libere espacio. |
| D-06 | La demo muestra datos que no coinciden con la landing (IDs de la landing son estáticos). | Alta | Medio | Dataset compartido (`P0-02`). Ver [`LANDING_AUDIT.md`](LANDING_AUDIT.md). |
| D-07 | No hay forma reproducible de recrear la demo: el seed no está en el repo. | Alta | Alto | Versionar el seed (sección 5). |
| D-08 | El enlace público de presupuesto de la demo sigue vivo. Cualquiera con el enlace puede aprobarlo. | Media | Bajo (es ficticio) | Expiración por defecto (`P0-10`). |

## 5. Propuesta de reset

Objetivo: volver la demo a un estado conocido y reproducible, sin intervención manual, con frecuencia diaria o por demanda.

### 5.1. Pasos

1. **Versionar el seed.** Crear un script (por ejemplo `apps/api/scripts/seed_demo.py`) que cree el tenant "Servicios Demo", sus usuarios, clientes, solicitudes, órdenes, presupuestos, turnos, pagos y automatizaciones. Debe ser **idempotente**: si ya existe, borra sólo los datos del tenant demo y vuelve a cargarlos.
2. **Borrar sólo el tenant demo.** El reset nunca debe tocar otros tenants. Verificar el `slug` del tenant antes de borrar y abortar si no coincide.
3. **Ejecutar el reset** con un job programado (por ejemplo, Vercel Cron o un job de GitHub Actions) cada 24 horas, y permitir ejecución manual con un comando documentado en `DEMO.md`.
4. **Fechas relativas.** El seed debe generar fechas relativas a hoy (turnos "hoy", presupuestos "hace 4 días"). Con fechas fijas, la demo queda desactualizada en días.
5. **Auditoría del reset.** Registrar la ejecución (fecha, filas borradas y creadas) para saber cuándo se reinició.

### 5.2. Qué no debe hacer el reset

- No borrar usuarios que no sean del tenant demo.
- No modificar la base de producción (ver sección 6).
- No recrear la cuenta de plataforma con contraseña pública.

## 6. Propuesta de separación

Hay tres opciones. Se recomienda la primera por costo y simplicidad.

| Opción | Descripción | Pros | Contras |
|---|---|---|---|
| A. Tenant demo en la misma base, con reset y sin cuenta de plataforma | Un tenant dedicado, reset diario, usuarios con contraseñas rotadas. | Sin costo adicional. Simple. | Comparte base con todo lo demás. Requiere disciplina en el reset. |
| B. Base demo separada (rama de Neon o segundo proyecto) | Una base exclusiva para la demo, con el mismo esquema. | Aislamiento real. | Mantener dos bases. Migraciones en ambas. |
| C. Modo sólo lectura por tenant | Una bandera en el tenant que bloquea escrituras (salvo login y navegación). | Protege la demo sin reset. | Requiere cambio en middleware y en UI (botones deshabilitados). |

**Recomendación:** A en el corto plazo, B antes de tener clientes reales, y C como complemento.

Mientras no haya base separada, **no se debe cargar ningún dato real en la demo** y el registro debe mostrar un aviso ("Las empresas registradas desde la demo comparten la base de ejemplo").

## 7. Modo de solo lectura

Objetivo: que un visitante pueda explorar sin modificar datos, con un recorrido guiado (MEJORAS §5.5).

| Aspecto | Propuesta |
|---|---|
| Activación | Bandera `is_demo_readonly` en el tenant demo. |
| Backend | Middleware que rechace cualquier `POST`, `PATCH`, `PUT` o `DELETE` del tenant demo con 403 y mensaje claro, salvo `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`. |
| Frontend | Botones de creación y edición deshabilitados o con un aviso "Esto es una demo: los cambios no se guardan". |
| Recorrido guiado | Una pantalla o banner que lleve por: panel, órdenes, presupuesto público, PWA del técnico, asistente. |
| Pruebas | Test que confirme que `POST /customers` en el tenant demo devuelve 403, y que el tenant de cualquier otra empresa no cambia. |
| Riesgo | Un modo sólo lectura mal implementado puede bloquear la navegación. Probar cada pantalla. |

Nota: el rol `viewer` existe pero hoy no puede leer presupuestos (`test_viewer_cannot_read_quotes`). No conviene usarlo como modo demo sin antes revisar sus permisos de lectura.

## 8. Criterios de aceptación

| ID | Criterio | Verificación |
|---|---|---|
| D-AC1 | Las credenciales no aparecen en la landing ni en el bundle público. | Búsqueda del texto en el build (`pnpm build` y búsqueda en `.next/static`). |
| D-AC2 | La cuenta de plataforma no existe en la base de la demo, o su contraseña fue rotada. | Consulta a la base (solo lectura) o verificación manual del administrador. |
| D-AC3 | El seed está en el repositorio, es idempotente y sólo toca el tenant demo. | Test de integración: correr el seed dos veces y verificar que otros tenants no cambian. |
| D-AC4 | El reset se ejecuta programado y deja la demo en el mismo estado (conteos iguales). | Comparar conteos antes y después de dos resets. |
| D-AC5 | Un visitante no puede cambiar la demo de forma permanente (si se implementa C). | Test de 403 sobre escrituras. |
| D-AC6 | Las cifras y los IDs de la demo coinciden con la landing (`P0-02`). | Test que compare el dataset compartido con la base del seed. |
| D-AC7 | `DEMO.md` describe el reset y no contiene contraseñas. | Revisión del documento. |

## 9. Riesgos residuales

- Neon Free y Vercel Hobby tienen límites y cold starts ([`DEMO.md`](DEMO.md)). Un reset diario consume recursos; medir.
- Un reset borra lo que un usuario haya cargado en la demo, lo cual es deseable pero debe anunciarse.
- Si la demo se usa para vender, un reset en plena demostración la rompe. Anunciar la hora del reset.

## 10. Qué no se verificó

- Inicio de sesión con las cuentas demo.
- Estado real de los datos en Neon.
- Si `founder@` existe y funciona en la base desplegada.
- Consumo actual de almacenamiento y conexiones de Neon.
- Visibilidad pública del repositorio.
</content>
