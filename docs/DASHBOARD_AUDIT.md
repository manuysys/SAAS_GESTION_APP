# Auditoría del dashboard

**Fecha:** 2026-11-09
**Objeto:** `apps/web/src/app/(app)/dashboard/page.tsx`, `GET /api/v1/dashboard/summary`, `apps/api/app/services/dashboard_service.py` y `apps/api/app/repositories/dashboard.py`.
**Referencia:** [`MEJORAS_Y_PROGRESO.txt`](../MEJORAS_Y_PROGRESO.txt) §7 (el dashboard como centro de operaciones).

## Método y límites

- Lectura de código del frontend, del servicio, del repositorio y de la ruta.
- Revisión de los tests `apps/api/tests/test_dashboard.py` (3 tests: conteos, aislamiento entre tenants, técnico sin acceso). **No se ejecutaron.**
- **No se inició sesión** en la demo para ver el dashboard con datos reales. La captura de pantalla y el comportamiento en viewport no están verificados.

## Resumen

El dashboard responde a "¿cuánto tengo abierto?" pero no a "¿qué tengo que hacer hoy?". Es un tablero de conteos. Las cinco preguntas que MEJORAS §7.1 pide responder al abrirlo:

| Pregunta (MEJORAS §7.1) | ¿Responde hoy? | Cómo |
|---|---|---|
| ¿Qué trabajos tengo hoy? | **Parcial** | Sólo cuenta turnos de hoy (`appointments_today`). No lista cuáles. |
| ¿Qué trabajos están atrasados? | **No** | No hay cálculo de atraso. |
| ¿Qué solicitudes necesitan revisión? | **Parcial** | `service_requests_new` existe en el servicio pero **no se muestra** en el frontend. |
| ¿Qué presupuestos esperan respuesta? | **Parcial** | Cuenta presupuestos `sent`, sin antigüedad ni vencimiento. |
| ¿Qué trabajos necesitan asignación? | **No** | No hay conteo de órdenes sin técnico. |
| ¿Qué técnicos están disponibles? | **No** | No hay carga ni disponibilidad. |
| ¿Cuánto dinero está pendiente de cobrar? | **Parcial** | Sí, pero a nivel empresa (ver métrica "Pendiente de cobro"). |
| ¿Qué actividades ocurrieron recientemente? | **Parcial** | Usa notificaciones, no el historial de eventos. |

## 1. Qué muestra hoy

### 1.1 Encabezado oscuro

| Elemento | Dato | Observación |
|---|---|---|
| Etiqueta "Operación en vivo" con punto animado | Estático | No refleja datos en tiempo real. Es un rótulo decorativo. MEJORAS §6.2 pide no presentar actividad ficticia como "en vivo". |
| Saludo "Hola, {nombre}." | Usuario activo | Correcto. |
| "Este es el pulso de {empresa}." | Tenant activo | Correcto. |
| Botón "Nuevo presupuesto" | Acción | Única acción primaria. Falta "Nueva orden" y "Nuevo cliente" (MEJORAS §7.2). |
| "Preguntale al asistente" | Acción | Correcto. |
| Bloque de métricas "Órdenes abiertas", "Presupuestos pendientes", "Pendiente de cobro" | Métricas del summary | Repite tres valores que también aparecen en las tarjetas de abajo. **Duplicación.** |

### 1.2 Tarjetas de métricas (fila de 5)

| Tarjeta | Campo del backend | Definición real | Problema |
|---|---|---|---|
| Clientes | `customers_total` | Clientes sin `deleted_at`. | Sin problema. |
| Órdenes abiertas | `work_orders_open` | Órdenes con `operational_status` en `new`, `scheduled`, `in_progress`, `waiting`. | Sin distinción de "hoy" ni "atrasadas". Subtítulo "de N en total". |
| Presupuestos pendientes | `quotes_pending` | Presupuestos con `status = sent`. | No incluye antigüedad ni vencimiento. No es "sin respuesta" en sentido estricto: un presupuesto enviado y vencido sigue contando igual. |
| Pendiente de cobro | `pending_balance` | `max(0, Σ quotes.total[approved] − Σ payments.amount[registered])` a nivel empresa. | **Global, no por orden.** Un cobro de una orden sin presupuesto aprobado reduce el saldo de otra. Se puede clampear a 0 y ocultar un déficit real. Ver F37. |
| Turnos de hoy | `appointments_today` | Turnos con `starts_at` en el día argentino, excluyendo `cancelled`. | Cuenta turnos, no órdenes. MEJORAS §7.2 pide distinguirlos. |

### 1.3 Bloque "Salud operativa"

- Dos anillos (`ProgressRing`): **órdenes abiertas / total** y **presupuestos pendientes / total**.
- La etiqueta "Datos reales" y el subtítulo "Proporción de trabajo abierto y presupuestos sin responder".

**Problema:** un anillo que mide "proporción de trabajo abierto" no es un indicador de salud. Un negocio con mucho trabajo abierto sano y otro con trabajo atrasado muestran el mismo número. La palabra "Salud" promete un juicio que el cálculo no hace. Propuesta: reemplazarlo por "Atención requerida" (sección 4).

### 1.4 Pasos del proceso

Una lista fija con cuatro pasos (cliente → presupuesto → turno y cierre → pago). Es **texto estático**. No refleja el estado de ninguna empresa. Es decorativo, aunque se lee como estado.

### 1.5 Actividad reciente

- Usa `GET /api/v1/notifications`, no el historial de eventos ni `audit_logs`.
- Muestra hasta 4 notificaciones (`slice(0, 4)`).
- Estado vacío: "Todavía no hay actividad. Cuando una automatización se dispare, aparece acá." Correcto y explicativo.
- Enlace "Ver todas" a `/notifications`.

### 1.6 Accesos rápidos

Seis enlaces: Clientes, Solicitudes, Presupuestos, Agenda, Pagos, Asistente. Ninguno es una acción de creación. MEJORAS §7.2 pide acciones de creación ("Nueva solicitud", "Nuevo cliente", "Nueva orden", "Nuevo presupuesto", "Agendar visita"), no navegación.

## 2. Qué NO está en el dashboard

| Falta | Cómo se calcula (propuesta) | Fuente |
|---|---|---|
| Trabajos programados para hoy (lista) | Órdenes con turno hoy, con hora, técnico y dirección. | `appointments` + `work_orders` |
| Trabajos atrasados | Turno o fecha comprometida pasada y orden no finalizada. Requiere definir "atrasado" con el negocio. | `work_orders.scheduled_at`, `operational_status` |
| Órdenes sin técnico | `work_orders.assigned_technician_id IS NULL` y estado no cerrado. | `work_orders` |
| Presupuestos sin respuesta hace más de 72 h | `status = sent` y `sent_at < now() − 72 h`. El umbral es sugerido por MEJORAS §7.3. | `quotes.sent_at` |
| Presupuestos vencidos | `valid_until < now()` y `status = sent`. | `quotes.valid_until` |
| Visitas que se solapan | Conflictos de turnos, ya detectados al crear (F30) pero no listados. | `appointments` |
| Saldo por orden | `Σ payments − total aprobado`, por orden. | `payments.work_order_id`, `quotes.work_order_id` |
| Órdenes finalizadas con saldo | Estado cerrado y saldo > 0. | Igual que la anterior |
| Carga de técnicos | Turnos por técnico en la semana. | `appointments.technician_id` |
| Solicitudes nuevas sin revisar | `service_requests.status = new`. Calculado en el servicio, sin UI. | `service_requests` |
| Rendimiento (conversión, ingresos por período) | Filtros temporales. MEJORAS §7.2 pide no comparar períodos sin datos suficientes. | Varias |

## 3. Roles

| Rol | Ve el dashboard | Qué pasa hoy | Qué debería ver (MEJORAS §7.4) |
|---|---|---|---|
| `owner` | Sí | Summary completo. | Estado general, finanzas, rendimiento, operaciones, técnicos, configuración. |
| `admin` | Sí | Igual que owner. | Igual que owner, sin facturación. |
| `dispatcher` | Sí | Igual que owner, incluido "Pendiente de cobro". | Solicitudes, órdenes, agenda, asignaciones, conflictos, seguimientos. **No necesita finanzas globales.** |
| `technician` | No | Redirige a `/tech` (`dashboard/page.tsx:53-56`). | Agenda personal, próximo trabajo. Ya existe en `/tech`. |
| `viewer` | No | Redirige a `/orders`. | Lectura de acuerdo con permisos. Hoy `viewer` no lee presupuestos (`test_viewer_cannot_read_quotes`), así que `/orders` puede quedar vacío o sin información útil. Verificar. |

**Problema:** `dispatcher` ve "Pendiente de cobro" y "Presupuestos pendientes". Es una decisión de permisos que conviene validar: en [`TENANT_SECURITY.md`](TENANT_SECURITY.md), el rol `dispatcher` no figura con finanzas, y `payments.py` le permite registrar pagos. Hay que decidir si el summary de finanzas se limita a `owner` y `admin`.

Además, el backend `READ_ROLES` de `dashboard.py` es `owner, admin, dispatcher`. El frontend y el backend coinciden, pero no hay un perfil de dashboard por rol.

## 4. Propuesta de "Atención requerida"

Reemplaza la "Salud operativa". Reglas deterministas (MEJORAS §7.3: no usar IA para cosas que se calculan).

| Alerta | Regla | Acción sugerida |
|---|---|---|
| Presupuestos sin respuesta | `sent` hace más de 72 h | Ver presupuestos |
| Órdenes sin técnico | Abiertas sin `assigned_technician_id` | Asignar |
| Visita con conflicto | Solapamiento de turnos | Revisar agenda |
| Trabajos finalizados con saldo | Cerrado con saldo > 0 | Registrar cobro |
| Trabajos atrasados | Ver definición pendiente | Reprogramar |
| Presupuestos vencidos | `valid_until` pasado | Actualizar o cerrar |

Cada alerta debe mostrar un número y un enlace a la lista filtrada. Si el número es cero, no se muestra.

## 5. Estados de carga, error y vacío

| Estado | Comportamiento actual | Evaluación |
|---|---|---|
| Carga | Las métricas muestran "…" (`display`, `dashboard/page.tsx:78`). | Correcto. |
| Error | Las métricas muestran "—" y hay un `role="alert"` con "No se pudo cargar el resumen. Probá recargar la página." | Correcto, pero el mensaje no ofrece reintento. Agregar botón "Reintentar". |
| Sin datos (empresa nueva) | Las métricas muestran `0`. No hay mensaje de primeros pasos. | Falta. MEJORAS §10.1 pide un estado vacío con acción: "Creá tu primera solicitud o cliente para empezar". |
| Actividad vacía | Mensaje explicativo. | Correcto. |
| Anillos sin datos | Con total 0, el anillo queda vacío y dice "Sin datos" sólo si hay error. | Con total 0 y sin error, muestra "0 de 0". Confuso. |

MEJORAS §17 P0 pide "Resolver estados de carga del dashboard". **Los estados de carga y error existen en código.** Lo que falta es el estado vacío y el reintento. No lo marco como resuelto sin probarlo en navegador.

## 6. Textos que prometen más de lo que hace

| Texto | Problema |
|---|---|
| "Operación en vivo" | No es tiempo real. Los datos se cargan al entrar. |
| "Salud operativa" | El cálculo no mide salud (sección 1.3). |
| "Datos reales" | Correcto en cuanto a origen, pero "real" no dice nada sobre la definición. |
| "Pendiente de cobro" | Es saldo a nivel empresa, no por orden (sección 1.2). |
| "Proporción de trabajo abierto y presupuestos sin responder" | "Sin responder" incluye `sent` aunque esté vencido. Cambiar a "enviados". |

## 7. Recomendaciones (en orden)

1. **Definir cada métrica** en un documento (qué cuenta, qué excluye, de dónde sale) y mostrar la definición en un tooltip. MEJORAS §7.2: "Cada indicador debe tener una definición exacta". Backlog `P0-06`.
2. **Quitar "En vivo" y "Salud operativa"** o reemplazarlos por rótulos que describan el cálculo. Backlog `P0-06`.
3. **Saldo por orden** y no a nivel empresa. Backlog `P1-02`.
4. **Bloque "Atención requerida"** con reglas deterministas (sección 4). Backlog `P1-04`.
5. **Separar por rol**: `dispatcher` sin finanzas globales (pendiente de decisión de permisos). Backlog `P1-04`.
6. **Acciones de creación** en lugar de navegación. Backlog `P1-03`.
7. **Estado vacío** y reintento en error. Backlog `P1-06`.
8. Recién después: rendimiento (conversión, ingresos por período), con filtros temporales y sin comparar períodos sin datos. Backlog `P3-04`.

## 8. Endpoints sugeridos (planificados, no implementados)

| Endpoint | Propósito | Notas |
|---|---|---|
| `GET /api/v1/dashboard/summary` | Ya existe. Agregar `service_requests_new` a la UI. | Sin cambio de contrato obligatorio. |
| `GET /api/v1/dashboard/attention` | Lista de alertas con conteo y enlace de filtro. | Nuevo. Reglas en servicio, tests por tenant. |
| `GET /api/v1/dashboard/today` | Órdenes de hoy con hora, técnico y dirección. | Nuevo. Usar zona `America/Argentina/Buenos_Aires`. |
| `GET /api/v1/payments?work_order_id=` | Saldo por orden. | Verificar si ya filtra por orden. |

Todos deben filtrar por `tenant_id` de la sesión y tener prueba de aislamiento, como el resto de los módulos ([`TENANT_SECURITY.md`](TENANT_SECURITY.md)).

## 9. Qué no se verificó

- Renderizado real, viewport, orden visual y contraste del dashboard.
- Tiempos de carga del summary con datos reales.
- Comportamiento con empresa vacía y con `viewer`.
- Ejecución de `test_dashboard.py`.
</content>
