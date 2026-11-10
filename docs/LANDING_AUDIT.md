# Auditoría de la landing

**Fecha:** 2026-11-09
**Objeto:** landing pública `/` de https://saas-gestion-web.vercel.app y código en `apps/web/src/components/marketing/*` y `apps/web/src/lib/marketing/*`.
**Referencia de criterios:** [`MEJORAS_Y_PROGRESO.txt`](../MEJORAS_Y_PROGRESO.txt) §5, §6, §10.4, §10.5 y §11.2.

## Método y límites

- Se leyó el HTML visible de la versión desplegada (fetch del texto de la página) y se contrastó con el código de cada sección.
- **No se hizo verificación visual** en los viewports 1440×900, 1366×768, 768×1024, 390×844 y 360×800. No hay capturas.
- **No se midieron Core Web Vitals** (LCP, INP, CLS). La sección de performance es de análisis de código, no de medición.
- **No se corrió axe ni Lighthouse.** Los hallazgos de accesibilidad son de lectura de código.

## Resumen ejecutivo

La landing comunica bien el concepto y es transparente en varios puntos (la prueba "en implementación", el aviso de datos ilustrativos, el texto sobre WhatsApp que requiere credenciales de Meta). Los problemas principales son de **consistencia de datos de ejemplo** y de **afirmaciones que el producto no cumple todavía**:

1. Los mockups usan códigos de orden que se contradicen entre sí (OT-0141 duplicado, OT-0142 con tres significados).
2. El presupuesto `QT-2026-0001` aparece como "aprobado" en el hero y como "enviado" en el mockup de presupuesto, y su importe se vincula a dos órdenes distintas.
3. Un mockup se rotula "En vivo" aunque es un ejemplo estático.
4. Los límites de planes ("100 órdenes por mes", etc.) no tienen enforcement en el backend.
5. La demo pública tiene las credenciales en la landing y no tiene reset.

## 1. Hero

| Aspecto | Observación | Evidencia |
|---|---|---|
| Jerarquía | Título, descripción y CTA claros. Título con `font-display` a `clamp` de 2.6–5.25 rem. | `components/marketing/hero.tsx` |
| CTA principal | "Crear mi empresa" (`/register`). Correcto según MEJORAS §5.2. | `hero.tsx:46` |
| CTA secundario | "Probar la demo" lleva a `/login`, no a un recorrido de demo. El nombre promete más de lo que entrega. | `hero.tsx:50` |
| Credenciales en el hero | Email y contraseña de la demo están visibles en el primer pantallazo. Ver [`DEMO_ENVIRONMENT.md`](DEMO_ENVIRONMENT.md). | `hero.tsx:58-69` |
| Aviso de prueba | "Prueba de 14 días: en implementación. Hoy el registro no cobra." Transparente. | `hero.tsx:54-56` |
| Captura del producto | Tarjetas flotantes en CSS, rotuladas "Datos ilustrativos". | `hero-visual.tsx:100` |
| Tarjeta "En vivo" | El rótulo "En vivo · OT-0142" describe un ejemplo estático. Corresponde a MEJORAS §6.2 ("Ejemplo de operación"). | `hero-visual.tsx:73` |
| Tarjetas sin `aria-hidden` | El contenedor `HeroVisual` no oculta sus tarjetas al lector de pantalla, a diferencia de los mockups (`aria-hidden="true"`). Los textos "En vivo", "Presupuesto aprobado" y "Cobro registrado" se leen como contenido real. | `hero-visual.tsx:57-61` vs `mockups.tsx:22-23` |

## 2. Recorrido comercial (siete etapas)

| Aspecto | Observación |
|---|---|
| Contenido | Siete etapas: Consulta, Solicitud, Orden de trabajo, Presupuesto, Aprobación, Visita, Pago. Coincide con MEJORAS §2 y §5.3. |
| Fuente | `journeySteps` en `lib/marketing/content.ts`. |
| Qué falta | Cada etapa debería responder "quién interviene", "qué información usa" y "qué deja preparado" (MEJORAS §5.3). Hoy cada etapa tiene una frase. |
| Veracidad | Etapa 6 ("El técnico ve su agenda y registra notas, materiales y fotos desde el celular") es correcta según F39–F41. Etapa 7 ("saldo pendiente visible para todo el equipo") depende de F37 (cálculo a nivel empresa, no por orden). |
| Relación entre registros | No se muestra la relación cliente → solicitud → orden → presupuesto → pago, que MEJORAS §5.3 pide explicitar. |

## 3. Funcionalidades

| Aspecto | Observación |
|---|---|
| Agrupación | `featureCards` tiene 9 tarjetas planas. MEJORAS §5.4 propone agrupar en A–F por beneficio. No está hecho. |
| Conteo | `productStats` muestra "9 módulos", incluyendo WhatsApp, que depende de credenciales inexistentes. Cuenta una función no operativa como módulo. |
| Duplicación | La franja de marcas (`marquee.tsx`) repite la lista. La copia duplicada tiene `aria-hidden="true"`, así que el lector de pantalla no la lee dos veces. **Buena práctica confirmada.** MEJORAS §6.1 queda resuelto para lectores de pantalla. |
| WhatsApp | Tarjeta rotulada "Requiere credenciales de Meta". Transparente. Ver F53. |
| Mockups | Ocho mockups con datos ilustrativos. Ver sección 6 (consistencia). |
| "Datos ilustrativos" | El texto aparece unas diez veces en la página desplegada, una por mockup. MEJORAS §6.2 pide una vez por composición. Es repetitivo pero no engañoso. |

## 4. Demo

| Aspecto | Observación |
|---|---|
| Acceso | Dos puntos con credenciales visibles: hero y login (`login/page.tsx:84-91`). |
| Datos | El backend tiene datos de demo según [`DEMO.md`](DEMO.md). La landing no los consulta: son mockups estáticos. |
| Reset | No existe. Ver [`DEMO_ENVIRONMENT.md`](DEMO_ENVIRONMENT.md). |
| Promesa | "Cuenta demo con datos de ejemplo" y "Al crear tu empresa empezás con un espacio propio" (sección final). Lo segundo es correcto por diseño de tenants. |
| Riesgo | Cualquier visitante puede cambiar la demo compartida. Ver MEJORAS §5.5 y §11.3. |

## 5. Precios

| Aspecto | Observación | Evidencia |
|---|---|---|
| Montos | Starter 29.900, Professional 59.900, Business 99.900 ARS/mes. **Coinciden** entre `brand.ts` y la migración `5ffb8399d836`. Sin inconsistencia de importes hoy. | `lib/brand.ts:36-50`; migración líneas 319, 335, 351. |
| Fuente de verdad | Los precios de la landing salen de `lib/brand.ts` (hardcoded en frontend). El backend los tiene en `plans` (DB). Dos fuentes que pueden divergir. MEJORAS §14 pide no codificar precios en componentes. | `components/marketing/pricing.tsx:4` |
| Límites | Tarjetas dicen "1 usuario · 1 técnico · 100 órdenes por mes · 50.000 tokens de IA por mes". Los límites no tienen enforcement. Ver F64. | `lib/marketing/pricing.ts:20-28` |
| Tokens | La unidad de IA visible es "tokens". MEJORAS §5.6 pide traducirla a consultas o créditos. |
| Impuestos | No se indica si el precio incluye IVA. MEJORAS §5.6 lo pide. |
| Anual | No hay plan anual. No se menciona. Correcto, pero conviene decirlo. |
| Prueba | "Prueba de 14 días: en implementación" aparece en la pill de precios (`pricing.tsx:32`) y en el texto de `pricingCopy`. |
| CTA | "Empezar con {plan}" lleva a `/register`. No hay cobro; correcto. |
| Facturación | No se menciona. Correcto (fuera de MVP según `AGENTS.md`). |

### Trial: 14 días o 30 días

Se pidió verificar la inconsistencia "14 vs 30". **Resultado:** dentro del producto no hay 30 días. Todas las referencias propias dicen 14 días (`content.ts:222`, `pricing.tsx:32`, `hero.tsx:55`, `terms/page.tsx:33`, [`SAAS_BILLING.md`](SAAS_BILLING.md) líneas 89–90). Los 30 días aparecen **sólo en competidores** de [`COMPETITIVE_ANALYSIS.md`](COMPETITIVE_ANALYSIS.md).

El problema real no es 14 vs 30, sino que la prueba **no tiene fecha de fin** en el código: la suscripción queda en `trialing` sin vencer. Hasta que eso se resuelva, conviene comunicarla como "acceso de evaluación" (MEJORAS §5.6), no como prueba de 14 días.

## 6. Consistencia de datos de ejemplo

Se leyó el HTML desplegado y el código de los mockups. Los hallazgos son concretos y reproducibles en el código.

| ID | Problema | Dónde (código / desplegado) | Gravedad |
|---|---|---|---|
| L-01 | **OT-0141 aparece dos veces** en el mockup de órdenes: "Filtración en baño" (Pendientes) e "Instalación de A/C" (En curso). El código genera el código como `OT-014{columnIndex + itemIndex}`, lo que produce colisiones. | `mockups.tsx:149-151`; desplegado: "OT-0141" dos veces. | Alta |
| L-02 | **OT-0142 tiene tres significados.** En el hero y en el panel es "Instalación de A/C · En curso". En el mockup de órdenes es "Cambio de termotanque · Cerradas". El mockup de pagos lo titula "Pagos · OT-0142" con total 95.500 y saldo 45.500. | `hero-visual.tsx:73-75`; `mockups.tsx:73`, `:136`; `mockups.tsx:282`. | Alta |
| L-03 | **QT-2026-0001 contradice su estado.** En el hero: "Presupuesto aprobado · QT-2026-0001 · $95.500 · Aprobado desde el link público". En el mockup de presupuesto: "Presupuesto QT-2026-0001 · Enviado", ítem "Revisión de caldera", total 95.500. | `hero-visual.tsx:83-86`; `mockups.tsx:165-169`. | Alta |
| L-04 | **Una caldera tiene dos códigos.** "Revisión de caldera" es OT-0140 (Pendientes) en el mockup de órdenes y OT-0143 (Presupuesto) en el panel. | `mockups.tsx:134`, `:74`. | Media |
| L-05 | **La orden de pago no coincide con el presupuesto.** El mockup de pagos (OT-0142, A/C) cobra el total de QT-2026-0001 (caldera, 95.500). Un presupuesto de una caldera y un pago de una instalación de A/C no pueden ser la misma operación. | `mockups.tsx:282-297` contra L-02 y L-03. | Alta |
| L-06 | **"En vivo" en un ejemplo estático.** | `hero-visual.tsx:73`. | Media |
| L-07 | **"Por cobrar $ 1.240.000" en el panel** no es reproducible con la definición del backend (`max(0, aprobados − cobros)` a nivel empresa). El dato es ilustrativo, pero el rótulo "Panel · Hoy" lo presenta como un tablero real. | `mockups.tsx:95-101`; `dashboard_service.py:31`. | Media |
| L-08 | **"Órdenes hoy 14" es ambiguo.** MEJORAS §7.2 pide distinguir "trabajos programados para hoy" de "órdenes creadas hoy". El backend cuenta turnos de hoy (`appointments_today`), no órdenes. | `mockups.tsx:92-93`. | Baja |
| L-09 | **"Sin aprobar 7" y "7 presupuestos sin respuesta" del asistente** son coherentes entre sí, pero el backend cuenta sólo `status = sent`. Si hay borradores, no entran. Consistente con la definición, pero el texto "sin aprobar" incluye conceptualmente a los borradores. | `mockups.tsx:96-97`, `:339`. | Baja |

**Causa raíz:** cada sección tiene sus datos escritos a mano. No hay un dataset compartido ni reglas de validación, que es lo que pide MEJORAS §6. Corregir los textos uno por uno no alcanza. Ver backlog `P0-02`.

## 7. Preguntas frecuentes

| Pregunta | Observación |
|---|---|
| ¿Los técnicos tienen que instalar una app? | Respuesta: "No... Funciona en Android y iPhone." **La parte de iPhone no fue verificada en dispositivo.** Hay que medirla antes de sostenerla. |
| ¿El cliente necesita cuenta? | Correcto según `public_quotes.py`. La respuesta omite que el token es un secreto en texto plano y no se puede revocar (ver [`SECURITY_AUDIT.md`](SECURITY_AUDIT.md) S-01 a S-03). |
| ¿Cómo se separan los datos? | Correcto, con reserva: la separación está testeada en la capa de aplicación, no con RLS. |
| ¿WhatsApp ya está disponible? | Correcto y transparente. |
| ¿La IA envía datos a terceros? | Correcto. Dice "hoy Groq", que es información de [`PROJECT_STATUS.md`](PROJECT_STATUS.md). Falta explicar qué datos se envían, que MEJORAS §5.7 pide. |
| ¿Cuánto cuesta y hay prueba gratis? | Ver sección 5. |

**Faltan** las preguntas de MEJORAS §5.7: cancelar, exportar datos, qué pasa al consumir la cuota, importar desde Excel, soporte, cambiar de plan. "Cambiar de plan" existe en backend (F63), pero no está en la FAQ.

## 8. Accesibilidad (WCAG 2.2 AA, por lectura de código)

| Criterio | Estado | Observación |
|---|---|---|
| Movimiento | Bien | `hero-visual.tsx` usa `useReducedMotion` y anula el parallax. |
| Textos decorativos | Bien | Los mockups están en `aria-hidden`. La franja duplicada también. |
| Contraste | **Por medir** | Muchos textos usan `text-white/55`, `/60`, `/65` sobre `#0B1F33` y tamaños de 9 a 10 px en los mockups. Probablemente no alcancen 4,5:1 para texto normal. Hay que medirlo con una herramienta. Los mockups son decorativos, pero el texto de la sección "Recorrido" y el FAQ también usan tonos bajos (`text-ink/75`). |
| Foco visible | Bien en intención | Hay clases `focusDark` y `focusLight` en `components/marketing/ui.ts`. No verificado visualmente. |
| Encabezados | Bien en código | Un `h1` (`hero-title`), `aria-labelledby` por sección. |
| Lectores de pantalla | Parcial | Tarjetas del hero sin `aria-hidden` (ver sección 1). |
| Tamaños de control | Por medir | `ctaPrimary` y `ctaGhostDark` no se midieron; WCAG 2.2 pide 24×24 px mínimo (2.5.8). |

## 9. Performance (análisis de código, no medido)

| Aspecto | Observación |
|---|---|
| Hero | Three.js se carga de forma lazy (`hero-scene`), según [`PROJECT_STATUS.md`](PROJECT_STATUS.md). Hay un `HeroFallback` SVG mientras carga. |
| Librerías de animación | GSAP con ScrollTrigger, Lenis, Motion. Son tres motores de movimiento en la misma landing. MEJORAS §10.5 pide no agregar librerías pesadas sin necesidad concreta. Hay que medir el costo de cada una. |
| LCP | El texto del hero entra con CSS, sin esperar JS (`hero.tsx` comentario). Buena intención. La imagen del hero es un canvas 3D: si el LCP cae en el canvas, el resultado cambia. **No medido.** |
| CLS | `min-h-[100svh]` y `aspect-ratio` reservan espacio. Buena práctica. |
| INP | Las animaciones de scroll corren en el hilo principal con Lenis. **No medido.** |
| Acción | Medir en un Android de gama media con red 4G simulada antes de optimizar. MEJORAS §10.5. |

## 10. Legal y confianza

| Aspecto | Observación |
|---|---|
| Enlaces | Footer con "Política de privacidad" y "Términos y condiciones". |
| Contenido | Son borradores según MEJORAS §11.5. No se revisó el contenido completo en esta auditoría. |
| Afirmaciones de seguridad | La landing no afirma Argon2id ni HTTP-only en la página pública (correcto). La política sí lo afirma; ver backlog `P0-09`. |
| Identidad | La marca es provisional (**Arreglo**). `arreglo.com.ar` no está confirmado en NIC.ar ([`DECISIONS.md`](DECISIONS.md) ADR-015). El correo `hola@arreglo.com.ar` aparece en el footer, sin verificar que el dominio sea propio. |
| Nombre en PWA | El manifest se llama "SaaS Gestión · Técnicos" (`public/manifest.webmanifest`). No coincide con la marca de la landing. |

## 11. Qué está bien (conservar)

- Concepto "Del primer llamado al último cobro, todo en orden" (MEJORAS §5.1).
- Transparencia sobre WhatsApp y prueba.
- Precios en ARS con formato `es-AR`.
- Estructura de secciones y navegación con ancla.
- Franja de marcas con copia duplicada oculta a lectores de pantalla.
- Mockups con cálculo correcto de totales (45.000 + 38.500 + 12.000 = 95.500).

## 12. Acciones recomendadas (resumen)

Ver [`PRIORITIZED_BACKLOG.md`](PRIORITIZED_BACKLOG.md) para IDs, criterios y pruebas. Resumen:

| Acción | Backlog |
|---|---|
| Dataset compartido de demo con validación (IDs únicos, relaciones, estados, importes) | `P0-02` |
| Reemplazar mockups inconsistentes y el rótulo "En vivo" | `P0-03` |
| Unificar textos de prueba y límites en una sola fuente | `P0-04`, `P0-05` |
| Marcar o eliminar límites no aplicados | `P0-05` |
| Medir contraste, tamaños y performance | `P1-10`, `P1-11` |
| Agrupar funcionalidades por beneficio (A–F) y completar FAQ | `P1-13` |
</content>
