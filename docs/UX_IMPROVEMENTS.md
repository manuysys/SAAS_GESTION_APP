# Mejoras de experiencia por pantalla

**Fecha:** 2026-11-09
**Referencia:** [`MEJORAS_Y_PROGRESO.txt`](../MEJORAS_Y_PROGRESO.txt) §4 (criterios de diseño), §7 (dashboard), §8 (técnico y PWA), §10 (estados, formularios, destructivas, accesibilidad).
**Backlog:** cada mejora tiene ID en [`PRIORITIZED_BACKLOG.md`](PRIORITIZED_BACKLOG.md).

## Alcance y límites

- **Revisado en código:** landing, dashboard, login, `mockups.tsx`, `hero-visual.tsx`, `pricing.tsx`, `marquee.tsx`.
- **Revisado sólo por nombre de archivo y endpoint:** clientes, órdenes, presupuestos, agenda, pagos, PWA técnico y `/q/[token]`. Las observaciones de esas pantallas son **hipótesis a verificar** en navegador, y así están marcadas.
- **No se hizo auditoría visual** en los cinco viewports de MEJORAS §4. Ninguna mejora asume un defecto visual que no se pudo ver.

Cada mejora indica: observación, cambio concreto y criterio de aceptación. "Verificar" significa que hay que confirmar el comportamiento actual antes de cambiar.

---

## 1. Dashboard (`/dashboard`)

Base de análisis: [`DASHBOARD_AUDIT.md`](DASHBOARD_AUDIT.md).

| # | Observación | Cambio concreto | Criterio de aceptación | Backlog |
|---|---|---|---|---|
| U-D1 | El encabezado dice "Operación en vivo" con un punto animado, aunque los datos no son en vivo. | Reemplazar por la fecha y hora del día ("Lunes 9 de noviembre · 14:20"), que sí son reales. | No aparece la palabra "en vivo". La fecha usa `America/Argentina/Buenos_Aires`. | `P0-06` |
| U-D2 | El anillo "Salud operativa" mide "trabajo abierto / total", no salud. | Reemplazar el bloque por "Atención requerida" con una lista de alertas y conteos (ver `DASHBOARD_AUDIT.md` §4). | Cada alerta muestra conteo y enlace a la lista filtrada. Sin conteo, la alerta no aparece. | `P1-04` |
| U-D3 | Las tres métricas del encabezado repiten las tarjetas de abajo. | Dejar el encabezado con el saludo y las dos acciones principales. Quitar la repetición. | Cada métrica aparece una sola vez. | `P1-04` |
| U-D4 | "Pendiente de cobro" es saldo de empresa, no por orden. | Mostrar "Por cobrar" con tooltip de definición. Cuando se implemente el saldo por orden, enlazar a pagos con filtro. | Tooltip con la definición exacta. El valor coincide con la suma de saldos por orden. | `P0-06`, `P1-02` |
| U-D5 | Los accesos rápidos son navegación, no acciones. | Cambiar a acciones de creación: "Nueva solicitud", "Nuevo cliente", "Nueva orden", "Nuevo presupuesto", "Agendar visita" (MEJORAS §7.2, "evitar un botón para cada operación menor"). Máximo cinco. | Cada acción abre el formulario correspondiente con el foco en el primer campo. | `P1-03` |
| U-D6 | El estado vacío no existe: una empresa nueva ve ceros sin explicación. | Con total cero, mostrar: "Todavía no tenés clientes ni órdenes. Empezá cargando tu primer cliente." con botón. | Aparece sólo cuando `customers_total = 0` y `work_orders_total = 0`. | `P1-06` |
| U-D7 | El error muestra un mensaje sin reintento. | Agregar botón "Reintentar" que vuelva a llamar el summary. | Un clic en "Reintentar" vuelve a pedir los datos y oculta el mensaje al recuperarse. | `P1-06` |
| U-D8 | Los pasos "Cliente → presupuesto → turno → pago" son texto estático con apariencia de estado. | Quitar la lista o convertirla en enlace a cada etapa con su conteo real. | No hay lista decorativa. Cada paso tiene conteo y enlace. | `P1-04` |
| U-D9 | `dispatcher` ve finanzas globales (saldo y presupuestos). | Decidir por permisos. Si `dispatcher` no debe ver finanzas, ocultar el saldo y el bloque de presupuestos para ese rol, en backend y frontend. | El rol `dispatcher` no recibe el campo `pending_balance` (verificar en API). | `P1-04` |
| U-D10 | Las etiquetas "Órdenes abiertas" y "Turnos de hoy" no indican qué cuentan. | Tooltip con la definición: "Órdenes con estado nuevo, programado, en curso o en espera". | Cada tarjeta tiene `title` o tooltip accesible con la definición. | `P0-06` |

## 2. Clientes (`/customers`)

Observaciones basadas en código y endpoints. **Verificar en navegador.**

| # | Observación | Cambio concreto | Criterio de aceptación | Backlog |
|---|---|---|---|---|
| U-C1 | La búsqueda existe (`customers/page.tsx`). Sin test de UI. | Verificar que busca por nombre, teléfono, email y dirección. Agregar test de UI. | Búsqueda por teléfono y dirección devuelve el cliente. | `P1-16` |
| U-C2 | Borrar un cliente es lógico (`deleted_at`), pero la UI debe confirmarlo y decir que es un archivado. | Usar "Archivar" con confirmación: "El cliente deja de aparecer en listados. Sus órdenes y presupuestos se conservan." | El texto del botón es "Archivar". La confirmación explica qué se conserva. | `P1-07` |
| U-C3 | Sin "última visita" ni "saldo" en la fila. | Agregar columna "Última visita" y "Saldo" (desde el saldo por orden). Verificar si el endpoint lo devuelve; si no, agregarlo. | La columna muestra la fecha de la última orden finalizada o "—". | `P1-02`, `P1-16` |
| U-C4 | Sin estado vacío explicativo (verificar). | "Acá vas a encontrar tus clientes. Cargá el primero para empezar." con botón "Nuevo cliente". | Aparece con cero clientes. | `P1-06` |
| U-C5 | El formulario de alta (verificar) puede perder datos si una validación falla. | Conservar los valores ingresados y marcar sólo los campos con error. Validación inmediata en cliente y en backend (Pydantic). | Un error de teléfono no borra el nombre ni la dirección. | `P1-07` |
| U-C6 | Dirección del cliente como texto libre. | Sin cambio inmediato. Documentar el modelo `customer_addresses` (en `DATA_MODEL.md`) como próximo paso para el despacho a domicilio. | Decisión registrada. | `P2-07` (importación) |

## 3. Órdenes (`/orders`, `/orders/[id]`)

| # | Observación | Cambio concreto | Criterio de aceptación | Backlog |
|---|---|---|---|---|
| U-O1 | Hay vista de tablero y de tabla (`lib/order-status.ts` con test). Verificar que el cambio de vista se recuerda. | Recordar la última vista en `localStorage`. | Al volver a `/orders`, aparece la última vista usada. | `P1-16` |
| U-O2 | Faltan filtros de operación: "Sin técnico", "Hoy" y "Atrasadas". MEJORAS §7.2 los considera prioritarios. | Agregar filtros de estado y de asignación. Verificar si `GET /work-orders` acepta esos parámetros; si no, agregarlos. | Con el filtro "Sin técnico" aparecen sólo órdenes abiertas sin técnico. | `P1-16` |
| U-O3 | El tablero muestra columnas por estado. Sin conteo por columna ni límite de tarjetas. | Mostrar el conteo en cada columna y "Ver más" al pasar de 10 tarjetas. | El conteo coincide con el filtro de la tabla. | `P1-16` |
| U-O4 | El detalle de orden tiene historial (`work_order_events`). Verificar que muestre actor y fecha en ARS y zona argentina. | Mostrar "Juan · 9 nov 14:20 · Pasó a En curso". | Cada evento tiene actor, fecha y transición. | `P1-06` |
| U-O5 | Las transiciones de estado deben mostrar sólo las válidas (la regla es backend). | El selector de estado lista sólo las transiciones permitidas desde el estado actual. | No aparece una transición que el backend rechazaría. | `P1-07` |
| U-O6 | Crear una orden sin cliente o sin solicitud previa. Verificar el flujo. | Preferir "Crear desde solicitud" y dejar "Orden directa" como acción secundaria. | El flujo principal enlaza solicitud y orden (`service_request_id`). | `P1-16` |
| U-O7 | Cerrar orden con saldo pendiente sin aviso. | Al pasar a "Finalizada" con saldo mayor a cero, mostrar aviso "Quedan $X por cobrar. ¿Registrar cobro?" sin bloquear. | Aviso visible; no bloquea el cambio de estado. | `P1-02` |

## 4. Presupuestos (`/quotes`, `/quotes/[id]`)

| # | Observación | Cambio concreto | Criterio de aceptación | Backlog |
|---|---|---|---|---|
| U-Q1 | Hay filtros por estado y métricas (`quote-status.ts`, test). | Agregar la columna "Enviado hace" con días y resaltar en ámbar los de más de 72 h sin respuesta. | El resaltado coincide con `sent_at < now() − 72 h`. | `P1-04`, `P2-01` |
| U-Q2 | No hay acción de "Reenviar enlace". | Acción "Copiar enlace" y "Reenviar por WhatsApp" (cuando exista WhatsApp). Mientras tanto, "Copiar enlace". | Copiar el enlace deja el portapapeles con la URL completa. | `P1-16` |
| U-Q3 | La fecha de vencimiento es opcional y no se avisa. | Obligar a elegir vencimiento (por defecto, 15 días) y mostrar "Vence en 3 días". | Un presupuesto nuevo siempre tiene `valid_until`. Verificar la regla en backend. | `P0-10` |
| U-Q4 | El envío de un presupuesto no muestra a quién llega ni cómo. | Mostrar en la confirmación de envío: "El cliente recibe un enlace. Quien lo tenga puede ver el presupuesto." | El texto es visible antes de confirmar. | `P0-10` |
| U-Q5 | Aprobar o rechazar desde la oficina (acción interna) debe pedir confirmación y motivo. | Confirmación con texto explícito. Registrar el motivo en `quote_events`. | No se aprueba con un solo clic. | `P1-07` |
| U-Q6 | El PDF se genera desde el detalle. Verificar que se descarga con nombre legible. | Nombre de archivo: `QT-2026-0001-cliente.pdf`. | El archivo se descarga con ese nombre. | `P1-16` |

## 5. Agenda (`/agenda`)

Observaciones basadas en código (`appointment-form.tsx`, `lib/agenda.ts` con test). **Verificar en navegador.**

| # | Observación | Cambio concreto | Criterio de aceptación | Backlog |
|---|---|---|---|---|
| U-A1 | El conflicto se detecta al guardar (409). Verificar si el formulario lo muestra antes de enviar. | Consultar disponibilidad al elegir técnico y horario, y mostrar el conflicto en línea. | Al elegir un horario ocupado aparece "Juan ya tiene una visita de 08:30 a 10:00". | `P1-16` |
| U-A2 | La vista de día (timeline) es la principal. Verificar si existe vista de semana por técnico. | Agregar vista semanal con una fila por técnico. Sin drag and drop en esta etapa. | La carga de cada técnico se ve por día. | `P1-16` |
| U-A3 | Reprogramar requiere entrar al formulario (verificar). | Acción "Reprogramar" en la tarjeta del turno. | Reprogramar mantiene la orden y registra el cambio. | `P1-16` |
| U-A4 | Cancelar un turno sin motivo. | Confirmación con motivo opcional, registrado en `appointments.notes`. | El motivo queda guardado. | `P1-07` |
| U-A5 | Hora y fecha en zona argentina. | Verificar que el formulario convierte a UTC al guardar y muestra zona. | Un turno a las 08:30 locales se guarda a las 11:30 UTC y se muestra a las 08:30. | `P1-16` |

## 6. Pagos (`/payments`)

| # | Observación | Cambio concreto | Criterio de aceptación | Backlog |
|---|---|---|---|---|
| U-P1 | El listado de pagos es la vista principal. Un pago se entiende mejor por orden. | Vista principal "Saldos por orden" (orden, total, cobrado, saldo) y el listado de movimientos como secundaria. | Cada fila muestra saldo. Sin saldo, dice "Cobrada". | `P1-02` |
| U-P2 | Registrar un cobro requiere elegir la orden. | Acción "Registrar cobro" desde la orden y desde el saldo. El monto viene precargado con el saldo. | El monto precargado es igual al saldo. | `P1-16` |
| U-P3 | Anular un pago es destructivo. | Confirmación con motivo obligatorio. El pago anulado queda visible como anulado, no desaparece. | El pago anulado aparece tachado con motivo y fecha. | `P1-07` |
| U-P4 | El método de pago (efectivo, transferencia) debe ser visible en el listado. | Columna método y referencia. | Cada cobro muestra método y referencia. | `P1-16` |
| U-P5 | Los importes usan `Intl.NumberFormat('es-AR')`. Correcto (ADR-005). | Sin cambio. | — | — |

## 7. PWA del técnico (`/tech`, `/tech/orders/[id]`)

Base: MEJORAS §8 y [`PWA_TECHNICIANS.md`](PWA_TECHNICIANS.md). **Verificar en Android e iOS.**

| # | Observación | Cambio concreto | Criterio de aceptación | Backlog |
|---|---|---|---|---|
| U-T1 | La pantalla inicial es la lista de órdenes. MEJORAS §8 pide el **próximo trabajo** primero. | Tarjeta grande "Próximo trabajo" con hora, cliente, dirección y botón "Cómo llegar". | La primera tarjeta es la siguiente visita pendiente del día. | `P1-05` |
| U-T2 | Las acciones de la visita deben ser de pocos toques: iniciar, fotos y notas, cerrar. | Barra inferior fija con tres acciones: "Iniciar visita", "Fotos y notas", "Cerrar visita". | Las tres acciones están visibles sin scroll en 360×800. | `P1-05` |
| U-T3 | El manifest se llama "SaaS Gestión · Técnicos". | Renombrar a "Arreglo · Técnicos" y revisar íconos. | El nombre instalado coincide con la marca. | `P1-12` |
| U-T4 | No hay estado de conexión visible en la app. | Indicador "Sin conexión" y bloqueo de acciones que requieren red, con mensaje: "Sin conexión: esto no se guardó. Probá de nuevo cuando vuelva la señal." | Al cortar la red, el indicador aparece y las acciones muestran el mensaje. | `P1-12` |
| U-T5 | Las fotos se suben sin control de tamaño previo. El límite de 5 MB se valida en backend. | Comprimir la imagen en el cliente antes de subirla (lado máximo 2048 px, JPEG 80 %) y mostrar el tamaño. | Una foto de 8 MB se sube bajo 5 MB sin error. | `P1-12` |
| U-T6 | El botón "Cerrar visita" no pide confirmación ni resumen. | Pantalla de cierre con resumen (notas, materiales, fotos) y confirmación. | El cierre muestra el resumen antes de confirmar. | `P1-05` |
| U-T7 | La dirección es texto. | Enlace "Cómo llegar" que abre el mapa del sistema con la dirección. | El enlace abre la aplicación de mapas del celular. | `P1-05` |
| U-T8 | Sin mensaje claro cuando el técnico no tiene órdenes. | "No tenés visitas para hoy. Cuando la oficina te asigne una, va a aparecer acá." | Estado vacío con texto. | `P1-06` |
| U-T9 | La sesión del técnico puede expirar en medio de una visita. | Renovación silenciosa del refresh y, si falla, guardar el borrador de notas en `localStorage` antes de redirigir al login. | Una sesión vencida no pierde las notas escritas. | `P1-12` |

## 8. Portal del cliente (`/q/[token]`)

Es la pantalla que ve el cliente final, sin cuenta. Prioridad alta porque es pública. **Verificar en navegador y con el token de prueba.**

| # | Observación | Cambio concreto | Criterio de aceptación | Backlog |
|---|---|---|---|---|
| U-X1 | El enlace no vence si `valid_until` está vacío. | Vencimiento por defecto y mensaje claro al vencer: "Este presupuesto venció el 2 de noviembre. Pedile a la empresa uno actualizado." | Un enlace vencido no permite aprobar y muestra el mensaje. | `P0-10` |
| U-X2 | Aprobar sin confirmación puede ser un clic accidental. | Botón "Aprobar presupuesto" con confirmación de una línea: "Vas a aprobar $95.500. ¿Confirmás?" | Confirmación antes de la llamada. | `P1-07` |
| U-X3 | Tras aprobar, la pantalla debe confirmar sin ambigüedad. | Estado "Aprobado el 9 de noviembre a las 14:20. La empresa va a coordinar la visita." | La fecha y hora son las del servidor. | `P1-16` |
| U-X4 | Si el presupuesto ya fue aprobado, el botón no debe reaparecer. | Mostrar el estado final, sin botones. | Recargar la página no vuelve a mostrar "Aprobar". | `P0-08` |
| U-X5 | El enlace debe mostrar sólo lo necesario (MEJORAS §11.2). | Verificar que la respuesta pública no incluya IDs internos (ver S-17). Mostrar: empresa, número, ítems, totales, vencimiento y contacto. | El JSON público coincide con la lista blanca de campos. | `P0-08` |
| U-X6 | No hay forma de contactar a la empresa desde el enlace. | Teléfono o email de la empresa (si está cargado), con enlace `tel:` o `mailto:`. | Si hay teléfono, aparece el enlace. | `P1-16` |
| U-X7 | El enlace se comparte por WhatsApp o mail. Sin vista previa de la empresa. | Metadatos `og:title` con el nombre de la empresa y el número, sin datos sensibles. | El título compartido no incluye montos. | `P1-13` |
| U-X8 | El botón "Rechazar" tiene el mismo peso que "Aprobar". | "Rechazar" secundario, con campo opcional de motivo. | Rechazar requiere un clic de confirmación. | `P1-07` |

## 9. Landing (`/`)

Detalle en [`LANDING_AUDIT.md`](LANDING_AUDIT.md).

| # | Observación | Cambio concreto | Criterio de aceptación | Backlog |
|---|---|---|---|---|
| U-L1 | OT-0141 duplicado, OT-0142 con tres significados y QT-2026-0001 contradictorio. | Dataset compartido y validación. | Ver `LANDING_AUDIT.md` §6. | `P0-02`, `P0-03` |
| U-L2 | "En vivo" en un ejemplo. | "Ejemplo de operación". | El texto no dice "en vivo". | `P0-03` |
| U-L3 | "Probar la demo" lleva al login, no a un recorrido. | Renombrar a "Entrar a la demo" o crear recorrido guiado de solo lectura (ver `DEMO_ENVIRONMENT.md`). | El texto describe el destino. | `P0-07` |
| U-L4 | Las credenciales están en el hero. | Quitarlas del hero y dejarlas en una página "Demo" con aviso. | El hero no muestra contraseña. | `P0-07` |
| U-L5 | Las tarjetas flotantes del hero no están ocultas para lectores de pantalla. | `aria-hidden="true"` en el contenedor de tarjetas, con un texto alternativo breve en un elemento oculto visualmente. | El lector de pantalla no lee "En vivo · OT-0142". | `P1-10` |
| U-L6 | Hay nueve "módulos" y uno no funciona todavía (WhatsApp). | Separar "Disponible hoy" y "Próximamente". | Ningún módulo "disponible" depende de credenciales. | `P0-04` |
| U-L7 | Las siete etapas no muestran qué queda preparado en cada una. | Agregar en cada tarjeta una línea "Queda listo para: ..." (MEJORAS §5.3). | Cada etapa tiene esa línea. | `P1-13` |
| U-L8 | Las funciones no están agrupadas por beneficio. | Agrupar en A–F de MEJORAS §5.4. | Seis grupos con títulos orientados al beneficio. | `P1-13` |
| U-L9 | "Datos ilustrativos" aparece unas diez veces. | Una etiqueta por composición, no por tarjeta interna. | Hay una etiqueta por bloque visual. | `P0-03` |
| U-L10 | El precio de Professional tiene un marcador "Recomendado" sin justificar. | Justificar en una línea ("Para equipos con técnicos en la calle") o quitar. | El texto del marcador explica el motivo. | `P1-13` |
| U-L11 | La FAQ no responde cancelación, exportación, cuota ni soporte. | Agregar las preguntas de MEJORAS §5.7 con respuesta real o "Todavía no está disponible". | Cada pregunta tiene respuesta verdadera. | `P1-13` |
| U-L12 | Los límites de planes muestran "tokens de IA". | Traducir a "consultas de asistente por mes" y mantener los tokens internamente. | La landing no muestra la palabra "tokens". | `P0-05` |

## 10. Login y registro (`/login`, `/register`)

| # | Observación | Cambio concreto | Criterio de aceptación | Backlog |
|---|---|---|---|---|
| U-G1 | El login muestra la cuenta demo con contraseña (`login/page.tsx:84-91`). | Quitar la contraseña. Dejar un enlace "Ver la demo" a una página con aviso. | El login no muestra contraseñas. | `P0-07` |
| U-G2 | No hay enlace "Olvidé mi contraseña". | Agregar el enlace y la página de recuperación cuando exista el backend. Mientras tanto, no mostrarlo. | No aparece un enlace que no funciona. | `P1-08` |
| U-G3 | El mensaje de error de login (verificar) puede revelar si el email existe. | Mensaje genérico: "Email o contraseña incorrectos". | Mismo mensaje para email inexistente y contraseña incorrecta. | `P1-07` |
| U-G4 | El registro no explica qué pasa después. | Texto breve: "Creamos tu empresa y te dejamos en el panel. Podés cargar clientes y presupuestos ya." | El texto no promete prueba ni cobro que no existen. | `P0-04` |
| U-G5 | Sin indicación de la política de contraseña. | Mostrar requisitos (largo mínimo) antes de escribir. | Los requisitos coinciden con la validación de backend. | `P1-07` |

## 11. Accesibilidad transversal

| # | Tema | Cambio | Backlog |
|---|---|---|---|
| U-A11Y-1 | Contraste de textos `white/55`, `/60`, `/65` sobre fondo oscuro. | Medir con herramienta y subir a 4,5:1 en texto normal. | `P1-10` |
| U-A11Y-2 | Tamaño de controles y área de toque. | Mínimo 24×24 px (WCAG 2.2, 2.5.8), 44 px en la PWA. | `P1-10` |
| U-A11Y-3 | Mensajes de error en formularios. | Asociar cada error al campo con `aria-describedby` y foco en el primer error. | `P1-07` |
| U-A11Y-4 | Estados que dependen sólo del color (tags de estado). | Texto además del color (ya lo tienen en la mayoría). Revisar la PWA. | `P1-10` |
| U-A11Y-5 | Navegación por teclado del `command palette` (⌘K). | Verificar apertura con teclado y foco en el campo. | `P1-10` |

## 12. Rendimiento y estados de carga

| # | Tema | Cambio | Backlog |
|---|---|---|---|
| U-R1 | Las listas no tienen estado de carga explícito en todas las pantallas (verificar). | Esqueletos (`skeleton.tsx` ya existe) en todas las listas. | `P1-06` |
| U-R2 | No se midió INP en la PWA ni en la landing. | Medir antes de optimizar (MEJORAS §10.5). | `P1-11` |
| U-R3 | Tres librerías de movimiento en la landing (GSAP, Lenis, Motion). | Medir el costo y eliminar lo que no aporte. | `P1-11` |

## 13. Qué no tocar

- El concepto "Del primer llamado al último cobro, todo en orden" (MEJORAS §5.1).
- El tono argentino y los importes en ARS con `es-AR`.
- La transparencia sobre WhatsApp y sobre la prueba.
- La identidad visual ink, teal, amber y paper (`brand.ts`). MEJORAS §4 pide mantenerla si es buena.
- La separación de la experiencia de técnico en `/tech`.
</content>
