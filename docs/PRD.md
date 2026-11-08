# PRD — MVP

## Objetivo

Permitir que una empresa de servicios técnicos complete el circuito:

cliente → solicitud → orden → presupuesto → aprobación → visita → asignación →
trabajo finalizado → historial.

## Historias de usuario

### Autenticación y empresa

- Como visitante puedo registrarme con email y contraseña.
- Como usuario puedo verificar mi email.
- Como usuario puedo iniciar y cerrar sesión.
- Como usuario puedo crear una empresa y quedar como `owner`.
- Como owner puedo invitar usuarios y asignar roles.

### Clientes

- Como dispatcher puedo crear, editar, buscar y archivar clientes.
- Como dispatcher puedo registrar direcciones y observaciones.
- Como dispatcher puedo ver el historial de un cliente.

### Solicitudes

- Como dispatcher puedo registrar una solicitud con origen, prioridad y descripción.
- Como dispatcher puedo convertir una solicitud en orden sin recargar datos.

### Órdenes

- Como dispatcher puedo crear una orden, asignar técnico y programar visita.
- Como dispatcher puedo cambiar el estado solo por transiciones válidas.
- Como técnico puedo ver mis órdenes y actualizar el estado operativo.
- Como admin puedo ver el historial de eventos de una orden.

### Presupuestos

- Como dispatcher puedo crear un presupuesto asociado a un cliente y,
  opcionalmente, a una orden de trabajo.
- Puedo agregar conceptos con descripción, cantidad, precio unitario, descuento
  porcentual e IVA porcentual.
- El sistema calcula línea, subtotal, descuentos, impuestos y total con
  `Decimal`/`Numeric`, nunca `float`.
- Como dispatcher puedo editar un presupuesto mientras está en borrador.
- Como dispatcher puedo enviarlo, lo que genera un enlace público seguro.
- Como cliente puedo ver el presupuesto en el enlace público y aprobarlo o
  rechazarlo sin iniciar sesión.
- Como dispatcher puedo descargar un PDF con el detalle y los totales.
- El presupuesto guarda una copia histórica de sus ítems, aunque el catálogo de
  servicios cambie después.
- Al enviar, aprobar o rechazar, se actualiza el estado comercial de la orden
  asociada.

### Agenda

- Como dispatcher puedo ver agenda diaria, semanal y mensual.
- Puedo detectar conflictos de horario al asignar un técnico.
- Puedo reprogramar una visita.

### Dashboard

- Como admin puedo ver órdenes pendientes, presupuestos sin aprobar, trabajos
  del día, cobros pendientes y clientes nuevos.

### Aislamiento

- Ningún usuario puede ver ni modificar datos de otra empresa.
- Las pruebas de aislamiento cubren lectura, escritura y archivos.

## Requisitos no funcionales

- TypeScript estricto y Python tipado.
- Respuestas API < 300 ms p95 en operaciones locales.
- Logs estructurados con request ID.
- Errores consistentes con códigos estables.
- Accesibilidad WCAG AA en flujos principales.
- Responsive desde 360 px.
- Cobertura de pruebas de backend ≥ 70% en módulos del MVP.
- Migraciones versionadas y reversibles.

## Criterios de aceptación del MVP

1. Registro y login funcionan.
2. Se crea una empresa y se aísla por tenant.
3. Se invitan usuarios con roles.
4. Se crea un cliente.
5. Se registra una solicitud.
6. Se genera una orden.
7. Se cambia el estado con validación.
8. Se crea un presupuesto con conceptos, cantidades, descuentos e impuestos.
9. Los totales se calculan correctamente con `Decimal`.
10. Se genera un PDF y un enlace público seguro.
11. El cliente aprueba o rechaza el presupuesto desde el enlace público.
12. Se programa una visita.
13. Se asigna un técnico.
14. El técnico consulta su trabajo desde el celular.
15. El técnico informa el resultado.
16. El admin consulta el historial.
17. El dashboard muestra datos persistidos.
18. Pasan las pruebas de aislamiento multi-tenant.
19. El proyecto se ejecuta siguiendo el README.
20. `scripts/verify.ps1` pasa sin errores.

## Fuera de alcance

Todo lo listado en `docs/PRODUCT_BRIEF.md` como fuera del MVP.
