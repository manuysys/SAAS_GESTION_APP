# Backlog priorizado

**Fecha:** 2026-11-09
**Base:** [`PRODUCT_AUDIT_2026-11-09.md`](PRODUCT_AUDIT_2026-11-09.md), [`FEATURE_TRUTH_MATRIX.md`](FEATURE_TRUTH_MATRIX.md), [`LANDING_AUDIT.md`](LANDING_AUDIT.md), [`DASHBOARD_AUDIT.md`](DASHBOARD_AUDIT.md), [`SECURITY_AUDIT.md`](SECURITY_AUDIT.md), [`DEMO_ENVIRONMENT.md`](DEMO_ENVIRONMENT.md), [`UX_IMPROVEMENTS.md`](UX_IMPROVEMENTS.md) y [`COMPETITOR_BENCHMARK.md`](COMPETITOR_BENCHMARK.md).
**Criterio de prioridad:** [`MEJORAS_Y_PROGRESO.txt`](../MEJORAS_Y_PROGRESO.txt) §17, con ajuste por severidad de seguridad.

| Prioridad | Significado | Cuándo |
|---|---|---|
| **P0** | Calidad y confianza: afirmaciones falsas, seguridad alta, demo expuesta. | Antes de cualquier nueva función. |
| **P1** | Experiencia central: dashboard, órdenes, presupuestos, técnico, formularios. | Después de P0. |
| **P2** | Automatización: seguimiento, WhatsApp real, email, RLS, 2FA. | Cuando P1 esté cerrado. |
| **P3** | Inteligencia avanzada, comercial y funciones no priorizadas. | Sólo con datos de entrevistas. |

**Regla de cierre:** una tarea se marca como hecha sólo con la salida de la prueba indicada. Ninguna tarea se cierra con la frase "debería funcionar". Los tests se corren con `scripts/verify.ps1` o los comandos canónicos de `AGENTS.md`.

**Actualización 2026-11-10:** se adelantó el eje móvil/portal por pedido del fundador. La app Android de técnicos y clientes, el portal en la API, el dashboard operativo y la consistencia de la landing están implementados y verificados con typecheck, tests y pruebas contra producción. Quedan como dependencias externas: probar el APK en un dispositivo real, publicar en Play Store, entregar magic links por email/WhatsApp, cobros con Mercado Pago y dominio propio.

**Regla de dependencia:** las tareas P0 que tocan la landing (`P0-02`, `P0-03`, `P0-04`) van antes de cualquier cambio de copy.

---

## P0 — Calidad y confianza

### P0-01 · Ejecutar y registrar la verificación real

- **Descripción:** correr `scripts/verify.ps1` y los comandos de `AGENTS.md` (ruff, basedpyright, pytest, pnpm lint, typecheck, test, build). Guardar la salida en `docs/PROJECT_STATUS.md`.
- **Justificación:** esta auditoría no ejecutó tests. Las cifras de 83 pytest y 70 vitest son de un estado anterior. Sin ejecución no hay línea base para los cambios siguientes.
- **Dependencias:** ninguna.
- **Módulos:** `scripts/verify.ps1`, `apps/api`, `apps/web`.
- **Criterios de aceptación:** los seis comandos terminan con código 0. La cantidad de tests coincide con la declarada en `PROJECT_STATUS.md` o se actualiza ese documento con el número real.
- **Pruebas:** la propia ejecución; salida pegada en el changelog.

### P0-02 · Dataset de demo compartido para la landing

- **Descripción:** crear un único dataset de ejemplo (clientes, solicitudes, órdenes, presupuestos, pagos, turnos) que usen todas las secciones de la landing. Validar reglas: códigos únicos, relaciones válidas, estados coherentes, fechas y montos consistentes.
- **Justificación:** L-01 a L-05 en [`LANDING_AUDIT.md`](LANDING_AUDIT.md). Corregir textos a mano no alcanza (MEJORAS §6).
- **Dependencias:** ninguna.
- **Módulos:** nuevo `apps/web/src/lib/marketing/demo-dataset.ts`; `components/marketing/mockups.tsx`, `hero-visual.tsx`.
- **Criterios de aceptación:** (1) un solo `demo-dataset.ts` alimenta todos los mockups; (2) un código de orden aparece una sola vez; (3) el presupuesto aprobado está vinculado a una orden con el mismo cliente, técnico y total que el pago; (4) ningún mockup usa números fuera del dataset.
- **Pruebas:** test Vitest de validación del dataset (unicidad, relaciones, montos con `Decimal` o centavos enteros, estados válidos). Test que recorra los mockups y verifique que sólo usan IDs del dataset.

### P0-03 · Corregir rótulos y mockups de ejemplo

- **Descripción:** cambiar "En vivo" por "Ejemplo de operación". Dejar una etiqueta "Datos ilustrativos" por composición. Corregir el rótulo "Panel · Hoy" para que no sugiera un tablero real.
- **Justificación:** L-06, L-07, L-08 y MEJORAS §6.2.
- **Dependencias:** `P0-02`.
- **Módulos:** `hero-visual.tsx:73`, `mockups.tsx` (`PanelMockup`, `OrdersMockup`, `PaymentsMockup`), `marketing/ui.ts`.
- **Criterios de aceptación:** la palabra "En vivo" no aparece en el HTML desplegado; la etiqueta ilustrativa aparece una vez por bloque visual.
- **Pruebas:** búsqueda de texto en el build (`pnpm build` y `grep` sobre `.next`). Test de render con Vitest que cuente las etiquetas.

### P0-04 · Unificar el copy de prueba y de disponibilidad

- **Descripción:** una sola constante para el texto de prueba ("Acceso de evaluación; la prueba de 14 días está en implementación; hoy no se cobra"). Separar en la landing "Disponible hoy" de "Próximamente" para WhatsApp y para cualquier módulo que dependa de credenciales.
- **Justificación:** el texto de prueba aparece repetido en cinco lugares (hero, pricing, FAQ, términos y registro). WhatsApp figura como módulo sin estar operativo (F53, F54). MEJORAS §5.6 y §17 P0.
- **Dependencias:** `P0-02`.
- **Módulos:** `lib/marketing/content.ts`, `components/marketing/hero.tsx`, `pricing.tsx`, `features-bento.tsx`, `app/terms/page.tsx`, `app/(auth)/register/page.tsx`.
- **Criterios de aceptación:** el texto de prueba viene de una constante; ningún módulo "disponible" depende de credenciales; el registro dice qué pasa después sin prometer cobro ni duración.
- **Pruebas:** test Vitest que verifique que `productStats` y las tarjetas no cuentan WhatsApp como disponible. Búsqueda de "14 días" fuera de la constante.

### P0-05 · Decidir y comunicar los límites de los planes

- **Descripción:** dos pasos. (a) Decidir la fuente de verdad de precios y límites: la tabla `plans` (DB) o `lib/brand.ts`. (b) Hasta que `P1-01` esté hecho, rotular los límites como "Referencia de uso" o retirarlos de la tarjeta. Traducir "tokens de IA" a "consultas del asistente por mes".
- **Justificación:** F64 y S-13. La landing promete límites que el backend no aplica. MEJORAS §5.6 y §14 pide no usar tokens como única unidad.
- **Dependencias:** ninguna para (a); (b) antes de publicar cambios de precios.
- **Módulos:** `lib/brand.ts`, `lib/marketing/pricing.ts`, `components/marketing/pricing.tsx`, `api/routes/billing.py`, migración de planes.
- **Criterios de aceptación:** un solo origen para precios y límites documentado en `DECISIONS.md` (ADR nuevo que marque como obsoleto el uso de `brand.ts` para precios); ninguna tarjeta muestra un límite sin enforcement sin rótulo.
- **Pruebas:** test que compare los precios de `brand.ts` con `GET /billing/plans` (o con la migración). Test de render de la tarjeta.

### P0-06 · Definir las métricas del dashboard y quitar rótulos engañosos

- **Descripción:** documentar la definición exacta de cada métrica (qué cuenta, qué excluye, de dónde sale). Mostrarla en tooltip. Quitar "Operación en vivo" y reemplazar "Salud operativa" hasta que exista `P1-04`.
- **Justificación:** U-D1, U-D10, sección 1 de [`DASHBOARD_AUDIT.md`](DASHBOARD_AUDIT.md). MEJORAS §7.2.
- **Dependencias:** ninguna.
- **Módulos:** `(app)/dashboard/page.tsx`, `apps/api/app/services/dashboard_service.py` (sólo docstrings), `docs/DASHBOARD_AUDIT.md`.
- **Criterios de aceptación:** cada tarjeta tiene definición accesible; no hay "en vivo" ni "salud operativa".
- **Pruebas:** test de render que verifique los tooltips. Revisión de texto.

### P0-07 · Asegurar la demo pública

- **Descripción:** (1) sacar la contraseña del hero y del login; (2) retirar la cuenta `founder@` de la base pública y rotar cualquier contraseña publicada; (3) quitar credenciales de la documentación pública; (4) implementar el reset (sección 5 de [`DEMO_ENVIRONMENT.md`](DEMO_ENVIRONMENT.md)) en modo manual primero; (5) verificar la visibilidad del repositorio.
- **Justificación:** S-06, S-16, S-20 y D-01 a D-03. Es el hallazgo de mayor severidad de la auditoría que depende de la base.
- **Dependencias:** autorización del responsable para tocar la base de demo (MEJORAS §19: no alterar datos reales sin autorización). Ninguna para (1) y (3).
- **Módulos:** `components/marketing/hero.tsx`, `(auth)/login/page.tsx`, `lib/marketing/content.ts`, `docs/DEMO.md`, `README.md`, `docs/MOBILE_API.md`, `docs/PROJECT_STATUS.md`, `apps/api/scripts/seed_demo.py` (nuevo).
- **Criterios de aceptación:** D-AC1 a D-AC4 de `DEMO_ENVIRONMENT.md`.
- **Pruebas:** búsqueda de la contraseña en el build; test de integración del seed (idempotencia y aislamiento); verificación manual del login de demo y de la ausencia de `founder@`.

### P0-08 · Cerrar el enlace público de presupuesto

- **Descripción:** (1) rate limit para `POST .../approve` y `.../reject`, con el mismo scope que el GET; (2) verificar que `PublicQuoteResponse` no incluya IDs internos ni `public_token`, con un test de lista blanca; (3) no mostrar el botón de aprobar si el estado final ya está fijado.
- **Justificación:** S-04, S-17, U-X4 y U-X5. MEJORAS §11.2.
- **Dependencias:** ninguna.
- **Módulos:** `core/middleware.py` (`rate_limit_middleware`), `schemas/quote.py`, `api/routes/public_quotes.py`, `components/quotes/public-quote-view.tsx`, `app/q/[token]/page.tsx`.
- **Criterios de aceptación:** más de N POST por minuto desde una IP devuelven 429; el JSON público coincide con la lista blanca; recargar un presupuesto aprobado no muestra acciones.
- **Pruebas:** test de 429 en POST público; test de lista blanca de campos; test de Vitest del componente con estado final.

### P0-09 · Revisar declaraciones legales y de seguridad

- **Descripción:** comparar cada afirmación de `privacy` y `terms` con el estado real (región de alojamiento, plazos de backup, proveedores externos, Argon2id, cookies). Lo que no está confirmado se marca como pendiente. Revisión profesional antes de comercializar.
- **Justificación:** S-15, MEJORAS §11.4 y §11.5. Los documentos son borradores.
- **Dependencias:** P0-07 (para saber qué proveedores quedan).
- **Módulos:** `app/privacy/page.tsx`, `app/terms/page.tsx`, `components/marketing/legal-page.tsx`.
- **Criterios de aceptación:** ninguna afirmación de seguridad o de región sin evidencia; el documento se rotula "Borrador, pendiente de revisión legal" hasta la revisión.
- **Pruebas:** revisión documental contra `SECURITY_AUDIT.md`. No es automatizable.

### P0-10 · Vencimiento y revocación de enlaces públicos

- **Descripción:** (1) `valid_until` obligatorio al enviar, con valor por defecto configurable (sugerido: 15 días desde el envío); (2) bloquear aprobación vencida con mensaje claro; (3) endpoint de revocación del enlace con auditoría; (4) mostrar la fecha de vencimiento en el envío.
- **Justificación:** S-02, S-03, F26, U-Q3, U-Q4, U-X1. MEJORAS §11.2.
- **Dependencias:** ninguna. `P1-14` (hash) es posterior y no bloquea.
- **Módulos:** `services/quote_service.py`, `api/routes/quotes.py`, `schemas/quote.py`, `components/quotes/quote-form.tsx`, `quote_events`.
- **Criterios de aceptación:** un presupuesto enviado sin fecha recibe la fecha por defecto; un enlace vencido devuelve 409 (o el código que se defina) con mensaje; un enlace revocado no muestra datos; cada revocación genera evento.
- **Pruebas:** tests de backend para vencimiento por defecto, aprobación vencida y revocación; test de aislamiento (revocar presupuesto de otro tenant da 404).

### P0-11 · Corregir afirmaciones erróneas en documentación interna

- **Descripción:** corregir (1) "validado en entrevistas" en `COMPETITIVE_ANALYSIS.md` línea 238; (2) dominios de OrdenSoft y GestiónPro en `MEJORAS_Y_PROGRESO.txt` §9; (3) rótulo de "Datos reales" si no se usan datos reales en la demo.
- **Justificación:** B-01 a B-03 en [`COMPETITOR_BENCHMARK.md`](COMPETITOR_BENCHMARK.md). Las reglas de `AGENTS.md` piden no describir como validado algo que no lo está.
- **Dependencias:** ninguna.
- **Módulos:** `docs/COMPETITIVE_ANALYSIS.md`, `MEJORAS_Y_PROGRESO.txt`.
- **Criterios de aceptación:** ningún documento afirma validación de entrevistas sin registro en `CUSTOMER_RESEARCH.md`; los dominios coinciden con la fuente.
- **Pruebas:** búsqueda de "validado" y de los dominios citados.

---

## P1 — Experiencia central

### P1-01 · Enforcement centralizado de límites (entitlements)

- **Descripción:** un servicio único que lea los límites del plan y los aplique en creación de usuarios, técnicos, órdenes y consumo de IA. Respuesta clara al exceder el límite.
- **Justificación:** F64, S-13. MEJORAS §14: "los límites deben estar centralizados".
- **Dependencias:** `P0-05` (decisión de límites).
- **Módulos:** nuevo `apps/api/app/services/entitlements.py`; `api/routes/work_orders.py`, `technicians.py`, `tenants.py`, `ai.py`; `repositories/billing.py`.
- **Criterios de aceptación:** crear la orden número N+1 del plan devuelve error con mensaje; el asistente deja de responder al agotar cuota (ya existe); el owner ve el uso actual en `/settings/billing`.
- **Pruebas:** test por cada límite (usuarios, técnicos, órdenes, IA); test de aislamiento (el límite de A no afecta a B).

### P1-02 · Saldo por orden

- **Descripción:** calcular saldo por orden (`Σ pagos − total aprobado de presupuestos de esa orden`), exponerlo en la API y mostrarlo en órdenes, pagos y dashboard.
- **Justificación:** F37, L-07 y sección 1.2 de [`DASHBOARD_AUDIT.md`](DASHBOARD_AUDIT.md). El saldo a nivel empresa puede esconder déficits.
- **Dependencias:** ninguna.
- **Módulos:** `repositories/dashboard.py`, `repositories/payments.py`, `api/routes/payments.py`, `api/routes/work_orders.py`, `(app)/payments/page.tsx`, `(app)/orders/[id]/page.tsx`.
- **Criterios de aceptación:** la suma de saldos por orden coincide con el saldo global cuando todos los pagos tienen orden; un pago sin orden se muestra aparte.
- **Pruebas:** test de integración con dos órdenes y dos pagos; test de aislamiento; test de Vitest para el formato del saldo.

### P1-03 · Acciones rápidas de creación

- **Descripción:** reemplazar los accesos de navegación del dashboard por cinco acciones de creación.
- **Justificación:** U-D5, MEJORAS §7.2.
- **Dependencias:** `P0-06`.
- **Módulos:** `(app)/dashboard/page.tsx`, `components/command-palette.tsx`.
- **Criterios de aceptación:** cada acción abre el formulario con foco en el primer campo; máximo cinco acciones.
- **Pruebas:** test de Vitest del render y de la navegación a cada formulario.

### P1-04 · "Atención requerida" y dashboard por rol

- **Descripción:** endpoint `GET /dashboard/attention` con reglas deterministas (sección 4 de [`DASHBOARD_AUDIT.md`](DASHBOARD_AUDIT.md)). Separar la vista de `dispatcher` de la de `owner` y `admin`. Quitar la lista decorativa de pasos.
- **Justificación:** sección 1.3, 1.4 y 3 de `DASHBOARD_AUDIT.md`; MEJORAS §7.3 y §7.4.
- **Dependencias:** `P0-06`, `P1-02` (para "finalizadas con saldo").
- **Módulos:** `api/routes/dashboard.py`, `services/dashboard_service.py`, `repositories/dashboard.py`, `(app)/dashboard/page.tsx`.
- **Criterios de aceptación:** cada alerta tiene conteo y enlace filtrado; alerta con cero no aparece; `dispatcher` no recibe `pending_balance` si se decide ocultarlo (decisión documentada en `DECISIONS.md`).
- **Pruebas:** tests de backend para cada regla con fechas fijas; test de aislamiento; test de rol (`dispatcher` no ve finanzas si corresponde); test de Vitest del bloque.

### P1-05 · Pantalla de inicio del técnico

- **Descripción:** en `/tech`, la primera tarjeta es el próximo trabajo con hora, cliente, dirección y "Cómo llegar". Barra inferior con "Iniciar visita", "Fotos y notas", "Cerrar visita". Resumen antes de cerrar.
- **Justificación:** U-T1, U-T2, U-T6, U-T7. MEJORAS §8.
- **Dependencias:** `P1-12` (estado de conexión).
- **Módulos:** `app/tech/page.tsx`, `components/tech/tech-shell.tsx`, `app/tech/orders/[id]/page.tsx`.
- **Criterios de aceptación:** en 360×800 las tres acciones se ven sin scroll; el cierre muestra resumen antes de confirmar.
- **Pruebas:** test de Vitest; verificación visual en 360×800 y 390×844 (pendiente, no hecha).

### P1-06 · Estados vacíos, de error y de carga

- **Descripción:** estado vacío con acción para clientes, órdenes, presupuestos, pagos, agenda y técnico. Reintento en errores de carga. Esqueletos en todas las listas.
- **Justificación:** sección 5 de `DASHBOARD_AUDIT.md`; U-C4, U-D6, U-D7, U-T8, U-R1; MEJORAS §10.1.
- **Dependencias:** ninguna.
- **Módulos:** `components/ui/empty-state.tsx`, `skeleton.tsx`, pantallas de listado.
- **Criterios de aceptación:** ninguna tabla vacía sin explicación; cada error de carga tiene "Reintentar".
- **Pruebas:** tests de Vitest para cada estado (carga, vacío, error).

### P1-07 · Formularios, confirmaciones y acciones destructivas

- **Descripción:** (1) confirmación con texto explícito para archivar, anular pagos, aprobar desde oficina, cancelar turnos, aprobar y rechazar presupuesto desde el enlace; (2) conservar datos ante error de validación; (3) aviso al salir con cambios sin guardar; (4) errores asociados al campo con `aria-describedby`; (5) mensaje de login genérico.
- **Justificación:** MEJORAS §10.2 y §10.3; U-C2, U-C5, U-O5, U-P3, U-Q5, U-A4, U-X2, U-X8, U-G3, U-A11Y-3.
- **Dependencias:** ninguna.
- **Módulos:** formularios en `components/*/` y `app/(auth)/login/page.tsx`.
- **Criterios de aceptación:** no hay acción destructiva con un solo clic; el login no revela si el email existe.
- **Pruebas:** tests de Vitest para la confirmación; test de backend para el mensaje genérico de login (`test_auth.py`).

### P1-08 · Verificación de email y recuperación de contraseña

- **Descripción:** flujo de verificación al registro y de recuperación con token de un solo uso, expiración corta, rate limit y auditoría. Requiere un proveedor de correo (ver `P2-03`), o un modo de desarrollo que no envíe.
- **Justificación:** S-09, S-10, F06, F07. SECURITY.md lo declara obligatorio.
- **Dependencias:** `P2-03` (correo transaccional). Puede arrancar con el modelo de tokens.
- **Módulos:** `api/routes/auth.py`, `services/auth_service.py`, `models` (tabla de tokens), `app/(auth)/*`.
- **Criterios de aceptación:** el token de reset se usa una sola vez; expira en 30 minutos; el reset revoca sesiones existentes; el enlace de reset no aparece en logs.
- **Pruebas:** tests de backend (uso único, expiración, revocación de refresh tokens, rate limit); test de no enumeración.

### P1-09 · Validación de archivos y aislamiento de adjuntos

- **Descripción:** (1) validar firma binaria (magic bytes) de JPEG, PNG y WebP, además del tipo declarado; (2) generar nombres aleatorios; (3) tests de aislamiento para asignación cruzada de técnico y descarga de adjuntos ajenos.
- **Justificación:** S-05, sección 4 de `SECURITY_AUDIT.md`.
- **Dependencias:** ninguna.
- **Módulos:** `services/technician_pwa_service.py`, `api/routes/technician.py`, `api/routes/appointments.py`.
- **Criterios de aceptación:** un archivo de texto con `Content-Type: image/jpeg` es rechazado; un técnico de A no descarga un adjunto de B (404).
- **Pruebas:** tests de backend con archivos falsificados; test de aislamiento de adjuntos y de asignación cruzada.

### P1-10 · Auditoría de accesibilidad WCAG 2.2 AA

- **Descripción:** correr axe (o equivalente) en landing, login, dashboard, órdenes, presupuestos, `/q/[token]` y `/tech`. Medir contraste y tamaño de controles. Corregir lo que falle.
- **Justificación:** MEJORAS §10.4; sección 8 de `LANDING_AUDIT.md`; U-A11Y-1 a U-A11Y-5; U-L5.
- **Dependencias:** ninguna.
- **Módulos:** `components/marketing/*`, `components/ui/*`, `app/globals.css`.
- **Criterios de aceptación:** cero violaciones críticas o serias en las páginas listadas; contraste de texto normal de al menos 4,5:1.
- **Pruebas:** informe de axe adjunto al PR; medición de contraste; navegación por teclado documentada.

### P1-11 · Medición de Core Web Vitals

- **Descripción:** medir LCP, INP y CLS en landing y `/tech` en un perfil móvil de gama media y red 4G. Decidir qué librerías de movimiento se quedan.
- **Justificación:** sección 9 de `LANDING_AUDIT.md`; MEJORAS §10.5 ("medir antes de optimizar").
- **Dependencias:** ninguna.
- **Módulos:** `components/marketing/hero-scene.tsx`, `smooth-scroll.tsx`, `hero-visual.tsx`.
- **Criterios de aceptación:** cifras registradas en `PROJECT_STATUS.md`; decisión sobre GSAP, Lenis y Motion documentada en `DECISIONS.md`.
- **Pruebas:** informe de Lighthouse o WebPageTest con condiciones documentadas.

### P1-12 · PWA del técnico: nombre, conexión y fotos

- **Descripción:** (1) renombrar el manifest a Arreglo; (2) indicador de conexión y mensaje claro cuando no se guarda; (3) compresión de fotos antes de subir; (4) retención de borrador de notas al vencer la sesión; (5) probar instalación y navegación en Android e iOS.
- **Justificación:** F43, F44, U-T3, U-T4, U-T5, U-T9; MEJORAS §8.
- **Dependencias:** ninguna.
- **Módulos:** `public/manifest.webmanifest`, `public/sw.js`, `components/tech/technician-attachments.tsx`, `components/tech/technician-note-form.tsx`, `lib/technician.ts`.
- **Criterios de aceptación:** el nombre instalado es Arreglo; sin conexión se muestra el aviso y las acciones fallidas no pierden datos escritos; una foto de 8 MB se sube bajo el límite.
- **Pruebas:** tests de Vitest de `lib/technician.ts` y de la compresión; prueba manual documentada en Android e iOS (pendiente, no hecha).

### P1-13 · Landing: estructura, FAQ y "queda listo para"

- **Descripción:** agrupar funcionalidades en A–F (MEJORAS §5.4); agregar "Queda listo para" a cada etapa; completar la FAQ con las preguntas de MEJORAS §5.7 y respuestas verdaderas; justificar o quitar el marcador "Recomendado".
- **Justificación:** sección 2, 3 y 7 de `LANDING_AUDIT.md`; U-L7, U-L8, U-L10, U-L11, U-X7.
- **Dependencias:** `P0-02`, `P0-04`.
- **Módulos:** `lib/marketing/content.ts`, `components/marketing/features-bento.tsx`, `journey.tsx`, `faq.tsx`, `pricing.tsx`.
- **Criterios de aceptación:** seis grupos de funcionalidades; cada pregunta de la FAQ tiene una respuesta verificable o "Todavía no está disponible".
- **Pruebas:** tests de Vitest de la estructura de contenido; revisión de cada respuesta contra `FEATURE_TRUTH_MATRIX.md`.

### P1-14 · Guardar los enlaces públicos con hash

- **Descripción:** almacenar el SHA-256 del `public_token` y comparar por hash. Migración que invalide los tokens existentes o los rehashee.
- **Justificación:** S-01.
- **Dependencias:** `P0-10` (para no duplicar la migración de vencimiento).
- **Módulos:** `models/quote.py`, `repositories/quotes.py`, nueva migración de Alembic.
- **Criterios de aceptación:** la base no contiene tokens en claro; los enlaces ya enviados siguen funcionando o se documenta que dejan de hacerlo.
- **Pruebas:** test de migración; test de aprobación con token válido y con token inválido.

### P1-15 · Content-Security-Policy y política de `Origin`

- **Descripción:** (1) CSP en el frontend (nonce o hash); (2) documentar y testear la política para requests sin `Origin` ni `Referer`.
- **Justificación:** S-11, S-18.
- **Dependencias:** ninguna.
- **Módulos:** `apps/web/next.config.ts` (o middleware de Next), `api/deps.py`.
- **Criterios de aceptación:** la landing y el dashboard cargan sin errores de CSP; el build no tiene scripts inline sin nonce.
- **Pruebas:** revisión de la consola del navegador; test de backend para `Origin` ausente.

### P1-16 · Filtros, búsqueda y flujos de uso diario

- **Descripción:** agrupador de mejoras de uso diario: filtros "Sin técnico", "Hoy" y "Atrasadas" en órdenes; búsqueda por teléfono y dirección en clientes; copiar enlace de presupuesto; vista de semana en agenda; "Registrar cobro" desde la orden; "Crear desde solicitud" como flujo principal; recordar la vista elegida.
- **Justificación:** sección 2 a 6 de [`UX_IMPROVEMENTS.md`](UX_IMPROVEMENTS.md); MEJORAS §17 P1 ("filtros", "búsqueda").
- **Dependencias:** `P1-02` para saldos; `P1-04` para "Atrasadas".
- **Módulos:** `api/routes/work_orders.py`, `customers.py`, `(app)/orders`, `(app)/customers`, `(app)/quotes`, `(app)/agenda`, `(app)/payments`.
- **Criterios de aceptación:** cada filtro devuelve el mismo conteo que la pantalla; la búsqueda encuentra por teléfono y dirección.
- **Pruebas:** tests de backend de cada parámetro de filtro, con aislamiento; tests de Vitest de los componentes.

### P1-17 · Verificar backups y restauración

- **Descripción:** restaurar la base en un proyecto aislado y registrar el tiempo y el resultado. Definir la retención real de Neon y documentarla.
- **Justificación:** S-14, F73.
- **Dependencias:** ninguna.
- **Módulos:** `scripts/backup.ps1`, `scripts/restore.ps1`, `docs/OPERATIONS.md`.
- **Criterios de aceptación:** restauración completa verificada con conteos de tablas iguales; tiempo registrado en `PROJECT_STATUS.md`.
- **Pruebas:** comparación de conteos antes y después de restaurar.

### P1-18 · Entrevistas con clientes

- **Descripción:** ejecutar las 10 entrevistas del plan de [`CUSTOMER_RESEARCH.md`](CUSTOMER_RESEARCH.md) y completar el registro.
- **Justificación:** 0 de 10 realizadas. Las hipótesis H1 a H7 siguen pendientes y el rango de precios de [`COMPETITIVE_ANALYSIS.md`](COMPETITIVE_ANALYSIS.md) no está validado.
- **Dependencias:** ninguna. Requiere disponibilidad del fundador.
- **Módulos:** `docs/CUSTOMER_RESEARCH.md`.
- **Criterios de aceptación:** el registro tiene 10 filas con datos reales; las hipótesis se marcan como confirmadas, refutadas o pendientes con el umbral de la tabla.
- **Pruebas:** no aplica. Es trabajo de campo; no se inventan entrevistas.

---

## P2 — Automatización

| ID | Tarea | Justificación | Dependencias | Módulos | Criterios de aceptación | Pruebas |
|---|---|---|---|---|---|---|
| P2-01 | Seguimiento de presupuestos y recordatorios programados (worker o cron) para presupuestos sin respuesta y próximos a vencer. | F27, U-Q1; ADR-009 no tiene worker. | P0-10, P1-04 | `services/automation_service.py`, nuevo job | Recordatorio interno a las 72 h; sin envío automático al cliente sin plantilla aprobada; idempotente por presupuesto y día. | Test con reloj fijo; test de idempotencia; test de aislamiento. |
| P2-02 | WhatsApp: prueba end-to-end con un número de prueba de Meta y estados de entrega (pendiente, enviado, entregado, leído, fallido). | F53, F54; MEJORAS §12. | Credenciales de Meta (externo). | `services/whatsapp_service.py`, `api/routes/whatsapp_webhook.py`, `(app)/settings/whatsapp` | Un mensaje muestra "enviado" sólo tras confirmación del API; los estados de entrega se registran; si WhatsApp está desconectado el resto funciona. | Prueba con número de prueba documentada; tests de webhook de estados. |
| P2-03 | Correo transaccional con proveedor y plantillas. | F50; requisito de P1-08. | Elegir proveedor (decisión). | Nuevo `services/email_service.py` | Envío de verificación y reset; registro del envío; sin datos sensibles en logs. | Test con proveedor simulado; prueba manual documentada. |
| P2-04 | Cobro recurrente de la suscripción con Mercado Pago (preapproval y webhooks idempotentes). | F65; [`SAAS_BILLING.md`](SAAS_BILLING.md). | Credenciales de sandbox (externo); decisión comercial. | `api/routes/billing.py`, nuevo webhook | Estados `trialing`, `active`, `past_due`, `cancelled` transicionan según el webhook; el access token nunca llega al frontend. | Tests de webhook con firma y duplicados; prueba en sandbox. |
| P2-05 | Evaluar RLS de PostgreSQL y rate limit distribuido. | S-07, S-12. | Diseño de sesión con `app.tenant_id`. | `core/db.py`, migraciones | Decisión documentada en `DECISIONS.md`; si se implementa, un test sin `tenant_id` en sesión devuelve cero filas. | Test de integración con dos tenants y RLS activo. |
| P2-06 | 2FA (TOTP) para owner y admin. | S-08. | — | `api/routes/auth.py`, modelo de usuario | Código de un solo uso; códigos de recuperación hasheados; auditoría de activación. | Tests de TOTP con reloj fijo; tests de lockout. |
| P2-07 | Importación guiada de clientes desde CSV o Excel con vista previa. | F16; [`COMPETITIVE_ANALYSIS.md`](COMPETITIVE_ANALYSIS.md) §4.6. | P1-06 (estados) | Nuevo `api/routes/imports.py`, `(app)/customers` | Vista previa con errores por fila; no importa filas inválidas sin confirmación; límite de tamaño; aislamiento por tenant. | Tests con archivos válidos e inválidos; test de aislamiento. |
| P2-08 | Asistente: preguntas admitidas, mensajes de información insuficiente y período explícito en las respuestas. | MEJORAS §13. | — | `services/ai_service.py`, `(app)/assistant/page.tsx` | Ninguna cifra sin fuente; cada respuesta indica el proveedor activo. | Tests de respuestas deterministas; test de "no sé" con datos vacíos. |
| P2-09 | Almacenamiento de adjuntos en S3 o equivalente, con URLs firmadas de corta duración. | F22, F41; [`SECURITY.md`](SECURITY.md). | Proveedor (decisión). | `services/technician_pwa_service.py`, nuevo adaptador de storage | Los adjuntos ya no están en BYTEA; la descarga requiere URL firmada con expiración. | Tests de firma y expiración; migración de datos. |
| P2-10 | Resolver `apps/mobile`: integrarla o retirarla del repo. | F45. Scaffold de plantilla sin conexión a la API. | Decisión del fundador. | `apps/mobile/` | El repo no contiene una app que parezca funcional sin serlo. | No aplica si se retira; si se integra, `expo lint` y `tsc --noEmit` según `apps/mobile/AGENTS.md`. |
| P2-11 | Registro de accesos y de revocaciones de enlaces públicos. | S-03. | P0-10 | `models`, `api/routes/public_quotes.py` | Cada acceso guarda fecha, IP enmascarada y resultado; visible para el owner. | Test de registro; test de aislamiento. |
| P2-12 | Un único mecanismo de platform admin (flag en DB) con script auditado. | S-19. | — | `api/deps.py`, `scripts/` | Sin acceso por lista de emails en configuración. | Test de acceso con y sin flag. |

---

## P3 — Inteligencia y comercial avanzado

Ninguna tarea de P3 se inicia sin entrevistas (`P1-18`) que justifiquen frecuencia, impacto y disposición a pagar, como exige MEJORAS §15.

| ID | Tarea | Justificación | Dependencias | Módulos | Criterios de aceptación | Pruebas |
|---|---|---|---|---|---|---|
| P3-01 | Portal de cliente persistente (historial de órdenes y presupuestos). | No existe en el repo (sin fila propia en la matriz; sólo hay enlace público por presupuesto). [`COMPETITIVE_ANALYSIS.md`](COMPETITIVE_ANALYSIS.md) menciona el portal de AppTec. | P1-18, P2-06 | Nuevo módulo de autenticación de cliente | Acceso sólo a sus propios registros; sin acceso a otras empresas. | Tests de aislamiento cliente-tenant. |
| P3-02 | Reserva de visitas online con cupos. | MEJORAS §15; sin datos. | P1-18 | Nuevo módulo | Cupos por técnico; sin sobrecarga. | Tests de cupos y conflictos. |
| P3-03 | Mantenimientos preventivos y recordatorios. | MEJORAS §15. | P2-01 | `services/automation_service.py` | Recurrencia configurable; sin spam. | Tests con reloj fijo. |
| P3-04 | Reportes de conversión, ingresos por período y clientes recurrentes. | DASHBOARD_AUDIT §2; MEJORAS §7.2. | P1-02 | `repositories/dashboard.py` | Filtros temporales; no compara períodos sin datos. | Tests con fechas fijas; aislamiento. |
| P3-05 | Exportaciones CSV de clientes, órdenes y pagos. | MEJORAS §15; SECURITY.md (portabilidad). | P1-16 | `api/routes/*` | Exporta sólo el tenant; límite de filas; registro de la exportación. | Tests de aislamiento y de contenido. |
| P3-06 | Dominio propio y marca definitiva. | ADR-015; KNOWN_ISSUES (sin nombre aprobado). | Búsqueda de marca y registro de dominio. | `lib/brand.ts`, `docs/BRAND.md` | Un único lugar de cambio; redirecciones desde el dominio provisional. | Revisión de enlaces; test de metadatos. |
| P3-07 | Facturación electrónica ARCA. | Fuera de MVP (`AGENTS.md`). Mencionada en [`COMPETITIVE_ANALYSIS.md`](COMPETITIVE_ANALYSIS.md) §5.2. | Decisión de alcance; entrevistas. | — | No se inicia sin decisión de alcance. | — |
| P3-08 | Asistente que prepara operaciones (solicitud desde mensaje, borrador de presupuesto) con aprobación humana. | MEJORAS §13; [`COMPETITIVE_ANALYSIS.md`](COMPETITIVE_ANALYSIS.md) §4.5. | P2-08, P1-18 | `services/ai_service.py` | Ninguna acción se ejecuta sin confirmación; cada propuesta queda auditada; sin SQL libre. | Tests de confirmación obligatoria; tests de tenant y permisos. |
| P3-09 | Reseñas de Google y seguimiento de satisfacción. | MEJORAS §15. Mencionada por GestiónPro en la fuente. | P2-02 | — | Solicitud sólo tras orden cerrada y con consentimiento según política. | Tests de condiciones. |

---

## Trazabilidad con las auditorías

| Hallazgo | Tarea |
|---|---|
| L-01 a L-05 (landing) | P0-02, P0-03 |
| L-06 "En vivo" | P0-03 |
| L-07 a L-09 | P0-03, P0-06 |
| Trial 14 y "en implementación" | P0-04 |
| Límites sin enforcement | P0-05, P1-01 |
| Demo y credenciales | P0-07 |
| S-01 hash de token | P1-14 |
| S-02 expiración | P0-10 |
| S-03 revocación y accesos | P0-10, P2-11 |
| S-04 rate limit POST público | P0-08 |
| S-05 firma de archivos | P1-09 |
| S-06, S-16, S-20 | P0-07 |
| S-07 RLS | P2-05 |
| S-08 2FA | P2-06 |
| S-09, S-10 reset y verificación | P1-08, P2-03 |
| S-11, S-18 CSP y Origin | P1-15 |
| S-12 rate limit distribuido | P2-05 |
| S-13 límites | P0-05, P1-01 |
| S-14 backups | P1-17 |
| S-15 legal | P0-09 |
| S-17 campos públicos | P0-08 |
| S-19 platform admin | P2-12 |
| B-01 "validado en entrevistas" | P0-11 |
| B-02, B-03 dominios | P0-11 |
| Dashboard | P0-06, P1-02, P1-03, P1-04, P1-06 |
| Técnico | P1-05, P1-12 |
| Entrevistas (0 de 10) | P1-18 |
</content>
