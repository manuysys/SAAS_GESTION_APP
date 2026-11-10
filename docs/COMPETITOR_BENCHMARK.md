# Benchmark competitivo

**Fecha:** 2026-11-09
**Fuente única de datos de competidores:** [`COMPETITIVE_ANALYSIS.md`](COMPETITIVE_ANALYSIS.md) (verificación del 2026-11-08). **Este documento no agrega precios, planes ni funciones de competidores.** Si un dato cambia, se corrige en `COMPETITIVE_ANALYSIS.md` primero.

**Advertencia:** los precios y funciones son los publicados el 2026-11-08 y **no fueron reverificados** para esta fecha. Antes de usarlos en una decisión comercial, repetir la verificación.

## 1. Alcance y qué no se incluye

| Incluido | No incluido |
|---|---|
| Ordion, AppTec, OrdenSoft, GestiónPro, STApp, Nixora CRM, Mecaris, TallerOS (`talleros.ar` y `talleros.io`). | SistemaLoop, Lumex y Jobber. Los menciona [`MEJORAS_Y_PROGRESO.txt`](../MEJORAS_Y_PROGRESO.txt) §9 (SistemaLoop y Lumex en §9, cierre de la sección), pero **no están en `COMPETITIVE_ANALYSIS.md`**. Quedan como pendientes de investigación. |
| Precios vigentes al 2026-11-08 según fuente. | Precios de Arreglo en comparación con descuentos de competidores (no están publicados en la fuente). |
| Funciones "documentadas", "anunciadas" o "no documentadas", con la clasificación de la fuente. | Funciones no citadas por la fuente. |

## 2. Tabla sintética (de `COMPETITIVE_ANALYSIS.md` §3)

Valores copiados de la tabla sintética de la fuente. La clasificación entre paréntesis es la de la fuente.

| Competidor | Segmento principal | Entrada de pago (ARS/mes) | Techo (ARS/mes) | Prueba o plan gratis | Técnicos o usuarios | WhatsApp | IA | App para técnicos | Offline |
|---|---|---|---|---|---|---|---|---|---|
| Ordion | Servicios técnicos a domicilio | $25.000 | $150.000 | Sin plan free · 14 a 30 días | 3 técn. + 1 admin (Emprendedor) hasta ilimitado (Corporativo) | No documentado | No documentado | PWA standalone (documentado) | No documentado |
| AppTec | Técnicos a domicilio e ISPs | $49.000 | $85.000 | Plan Gratis + 7 días de Enterprise | 1 (Gratis), 3 (Starter), 20 (Pro), 50+ (Enterprise) | Manual: link de seguimiento (documentado) | No documentado | APK Android fuera de Play (documentado) | No documentado |
| OrdenSoft | Talleres de reparación | $24.000 ($19.200 anual) | $49.000 ($39.200 anual) | Sin plan free · 7 días | 1 en Básico; multi-usuario desde Profesional | Manual (anunciado) | Consulta de datos del taller, escalada por plan (anunciado) | Web responsive (documentado) | No ("Solo necesitás internet", documentado) |
| GestiónPro | Talleres de electrónica y línea blanca | $34.500 (USD 22) | $86.500 (USD 55) | Sin plan free · 15 días (30 con código) | Multi-PC en red; sin tope de órdenes | Anuncia automático en cambios de estado (anunciado) | Voz y texto para diagnóstico y negocio (anunciado) | Windows .exe + web móvil (anunciado) | Sí, en PC local (anunciado) |
| STApp | Talleres de celulares y electrónica | $19.999 ($12.500 anual) | $19.999 (hasta 3 sucursales) | Plan Free + 30 días de Pro | 1 en Free; ilimitados en Profesional | Contradicción en manual (documentado) | Chatbot para ayuda y leads (documentado) | Web + PWA + APK fuera de Play (documentado) | Acceso básico en PWA (documentado) |
| Nixora CRM | Celulares, PC y electrónica | $19.900 | $49.900 | Plan Demo sin vencimiento | 1 en Básico; hasta 5 en Pro | Manual "con un toque" (documentado) | Solo en Pro (anunciado) | Web en navegador (documentado) | No documentado |
| Mecaris | Talleres mecánicos | $28.000 (+$8.000 por módulo) | $44.000 | Sin plan free · 14 días | Usuarios y órdenes sin límite en Base | "Próximamente" (documentado) | No documentado | Web (documentado) | No documentado |
| TallerOS (`talleros.ar`) | Talleres mecánicos y lubricentros | $45.000 ($41.250 anual) | $150.000 (Multisucursal) | Sin plan free · 21 días | Usuarios ilimitados desde PRO Mensual | Automático por QR (documentado) | Asistente "Tall" desde $65.000 (documentado) | App Android en Google Play + panel (documentado) | No documentado |
| TallerOS (`talleros.io`) | Talleres multi-rubro | $18.000 | $35.000 | Plan gratuito + 30 días | 1 (Gratis), 5 (Starter), 15 (Profesional) | Manual, no envía solo (documentado) | Sin IA (bot de Telegram de solo lectura) | Web (documentado) | No documentado |
| **Arreglo (referencia)** | Servicios técnicos a domicilio | $29.900 (Starter) | $99.900 (Business) | "14 días en implementación" (sin fecha de fin) | 1 (Starter), 5 (Professional), 20 (Business) | Esqueleto implementado (cifrado, webhook con firma), sin credenciales ni prueba end-to-end (ver F51–F53) | Determinista + proveedor externo opcional, sólo lectura | PWA sin instalación (parcial, ver F43) | Sólo shell y pantalla offline (ver F44) |

Los valores de Arreglo salen de `lib/brand.ts` y de la migración `5ffb8399d836`, y se contrastaron con [`FEATURE_TRUTH_MATRIX.md`](FEATURE_TRUTH_MATRIX.md). Los precios de Arreglo son de lanzamiento y no tienen enforcement de límites (F64).

## 3. Lectura para Arreglo

Estas conclusiones son interpretación de la fuente, no datos nuevos.

### 3.1 Dónde se compite

- **Segmento:** de los 8 competidores de la fuente, 6 están pensados para mostrador. Sólo Ordion y AppTec atacan el servicio a domicilio de forma nativa (`COMPETITIVE_ANALYSIS.md` §4.1). Es el espacio que Arreglo elige.
- **Precio de entrada:** Arreglo Starter (29.900) queda por encima de Ordion Emprendedor (25.000) y por debajo de AppTec Starter (49.000). Pero Starter de Arreglo incluye **1 técnico**, y Ordion Emprendedor incluye **3 técnicos y 1 administrador**. En términos de capacidad, la comparación no es directa.
- **Escalón de precio:** la fuente señala que AppTec obliga a pasar a 49.000 para 2–3 técnicos con fotos en la orden (§4.3). Arreglo Professional (59.900) incluye 5 técnicos. Esto es ventaja **si** los límites se aplican (F64).

### 3.2 Dónde Arreglo no compite todavía

| Diferencial que la fuente identifica | Estado de Arreglo | Referencia |
|---|---|---|
| Automatización de WhatsApp | Sin integración probada (F53, F54). | Backlog `P2-02`. |
| Migración desde Excel con vista previa | No existe (F16). | Backlog `P2-07`. |
| Facturación ARCA | Fuera de MVP (`AGENTS.md` §Restricciones). | Backlog `P3-07`, sin prioridad. |
| Portal de cliente con marca propia | No existe. Sólo el enlace por presupuesto. | Backlog `P3-01`. |
| Hoja de ruta y GPS | Fuera de MVP. | No se prioriza. |
| Modo offline de la app de técnico | No existe (F44). | Backlog `P1-12`. |
| Asistente que ejecuta procesos con confirmación humana | Asistente sólo de lectura (por diseño). | Backlog `P3-08`. |

### 3.3 Dónde Arreglo tiene base para diferenciarse

- **Transparencia comercial:** la fuente destaca a Mecaris y a las contradicciones de STApp, OrdenSoft y GestiónPro. Arreglo puede competir con reglas claras, siempre que los límites se apliquen (P0-05).
- **Presupuesto público con precio histórico:** ADR-008. La fuente no muestra competidores con esta combinación documentada.
- **PWA sin tienda de aplicaciones:** AppTec y STApp distribuyen APK fuera de Play. Arreglo no requiere eso, pero la PWA todavía no fue probada en Android ni iOS (`P1-12`).

## 4. Inconsistencias encontradas en las fuentes

Se detectaron en la lectura cruzada. **No se corrigieron los documentos originales** (fuera del alcance de esta tarea). Conviene corregirlas en un ciclo de documentación.

| ID | Dónde | Problema | Acción |
|---|---|---|---|
| B-01 | `COMPETITIVE_ANALYSIS.md` línea 238 | Dice que el rango AR$ 22.000–32.000/mes está "validado en entrevistas". **Según `CUSTOMER_RESEARCH.md` no hay entrevistas realizadas (0 de 10).** Afirmación sin sustento. | Reescribir como hipótesis pendiente de validación. Backlog `P0-11`. |
| B-02 | `MEJORAS_Y_PROGRESO.txt` §9 | Cita `https://ordensoft.com.ar/`. `COMPETITIVE_ANALYSIS.md` indica que ese dominio no responde y que el sitio oficial es `https://ordensoft.com/`. | Corregir la referencia. |
| B-03 | `MEJORAS_Y_PROGRESO.txt` §9 | Cita `https://trgestion.com/` para GestiónPro. La fuente indica que ese dominio pertenece a otra empresa y que el sitio correcto es `https://trgestion.com.ar/`. | Corregir la referencia. |
| B-04 | `COMPETITIVE_ANALYSIS.md` §3 | Ordion en la tabla sintética dice "14 a 30 días" de prueba, según el plan. Sin diferencia relevante, pero la columna no lo especifica. | Desambiguar por plan. |
| B-05 | `COMPETITIVE_ANALYSIS.md` (STApp) | Contradicciones internas documentadas por la propia fuente (WhatsApp, límites del plan Free). | Mantener como está: es un hallazgo de la fuente. |
| B-06 | `MEJORAS_Y_PROGRESO.txt` §9 | Incluye Jobber como referencia funcional sin investigación previa en el repo. | Crear entrada en `COMPETITIVE_ANALYSIS.md` o marcar como referencia no verificada. |

## 5. Pendientes de investigación

Sin datos en el repo, no se comparan:

| Competidor | Fuente de la mención | Acción |
|---|---|---|
| SistemaLoop | `MEJORAS_Y_PROGRESO.txt` §9 | Relevar con el skill `competitive-research` (protocolo de fuentes oficiales y evidencia) y agregar a `COMPETITIVE_ANALYSIS.md` con la misma metodología (fuente oficial, fecha, clasificación). |
| Lumex | Igual | Igual. |
| Jobber | Igual. Es un producto internacional: MEJORAS §9 advierte que popularidad internacional no equivale a aplicabilidad en Argentina. | Igual, con foco en procesos, no en diseño. |

## 6. Criterios de uso

- Un dato de competidor sólo entra a un documento de Arreglo si está en `COMPETITIVE_ANALYSIS.md` con fecha y clasificación.
- No se compara precio sin indicar la fecha de verificación del competidor.
- No se usan las funciones de un competidor como "lo que el cliente quiere" sin pasar por entrevistas (ver `CUSTOMER_RESEARCH.md`, 0 de 10 realizadas).
- Ninguna función de Arreglo se declara como "diferencial" si no está en estado "Implementada y probada" en [`FEATURE_TRUTH_MATRIX.md`](FEATURE_TRUTH_MATRIX.md).
</content>
