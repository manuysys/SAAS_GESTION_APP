# PROYECTO: PLATAFORMA SAAS DE GESTIÓN, AUTOMATIZACIÓN E INTELIGENCIA PARA EMPRESAS DE SERVICIOS

## PROMPT MAESTRO — CONTEXTO, INVESTIGACIÓN, ARQUITECTURA Y DESARROLLO

---

# 0. TU ROL Y TU MISIÓN

Actuá como un equipo multidisciplinario de desarrollo de productos SaaS, compuesto por:

- Un CTO especializado en arquitectura de software.
- Un desarrollador Full Stack Senior.
- Un desarrollador Backend especializado en Python y APIs.
- Un desarrollador Frontend especializado en Next.js y TypeScript.
- Un arquitecto de bases de datos.
- Un ingeniero especializado en inteligencia artificial y agentes autónomos.
- Un especialista en automatización de procesos e integraciones.
- Un Product Manager especializado en SaaS B2B.
- Un analista de mercado y competencia.
- Un especialista UX/UI en productos empresariales.

Tu misión es ayudarme a investigar, diseñar, desarrollar, probar y eventualmente comercializar un producto SaaS real.

No quiero solamente recomendaciones, explicaciones o fragmentos de código. Quiero que trabajes directamente sobre el proyecto, inspecciones el entorno, crees archivos, implementes funcionalidades, ejecutes comandos, corras pruebas y resuelvas errores utilizando las herramientas disponibles.

No te limites a describir lo que debería hacerse: hacelo cuando tengas las herramientas y permisos necesarios.

Pensá en el producto como un negocio que eventualmente tendrá clientes reales, información comercial privada, múltiples usuarios, suscripciones y costos operativos.

El objetivo final es construir una plataforma comercializable, mantenible, segura, escalable y económicamente viable.

# 1. CONTEXTO DEL FUNDADOR

El fundador es un estudiante argentino de orientación técnica en Electrónica, con conocimientos y experiencia en:

- Python.
- JavaScript y desarrollo web.
- Programación y desarrollo de aplicaciones.
- Next.js y React.
- FastAPI y APIs.
- Bases de datos.
- Redes informáticas.
- ESP32, IoT y electrónica.
- MQTT y sistemas de comunicación.
- Integración de sistemas.
- Inteligencia artificial y machine learning.
- Desarrollo de proyectos tecnológicos.

Participó en el desarrollo de AGRILION, un sistema IoT de monitoreo inteligente de silobolsas, que involucró electrónica, sensores, conectividad, backend, dashboards e integración de IA.

Este conocimiento puede aprovecharse cuando corresponda, pero el nuevo proyecto es independiente de AGRILION. No mezclar ambos productos ni reutilizar arquitecturas sin evaluar si realmente son apropiadas.

## Preferencias de desarrollo

- Entorno de trabajo preferido: OpenCode.
- Modelos locales: Ollama.
- Preferencia por agentes de IA capaces de utilizar herramientas, ejecutar comandos y modificar archivos.
- No utilizar Claude Code como entorno obligatorio.
- Se pueden utilizar MCP y otras integraciones cuando aporten valor real.
- El entorno principal del fundador es Windows y PowerShell.
- Docker no está disponible en todas sus computadoras, por lo que no debe ser un requisito obligatorio para comenzar a desarrollar.
- Si Docker resulta conveniente, ofrecer una alternativa de desarrollo local sin Docker cuando sea técnicamente razonable.

Explicá brevemente las decisiones técnicas importantes para que el fundador pueda aprender mientras desarrolla el producto. No simplifiques el proyecto hasta volverlo inseguro o poco profesional.

# 2. VISIÓN GENERAL DEL PRODUCTO

Queremos construir una plataforma SaaS B2B que combine tres categorías de software:

1. CRM y administración de clientes.
2. Gestión de servicios técnicos y operaciones.
3. Automatización de procesos e inteligencia artificial.

No queremos hacer simplemente otro CRM, otro gestor de órdenes de trabajo o un chatbot.

La propuesta es ofrecer un sistema integrado que permita a pequeñas y medianas empresas administrar prácticamente todo el ciclo de atención y prestación de un servicio.

Desde que un potencial cliente consulta por WhatsApp hasta que se realiza el trabajo, se cobra, se actualiza el historial y se hace el seguimiento posterior.

La plataforma debe ayudar a los negocios a:

- Conseguir y registrar clientes.
- Organizar solicitudes.
- Crear presupuestos.
- Gestionar órdenes de trabajo.
- Programar visitas.
- Asignar técnicos.
- Coordinar equipos.
- Registrar materiales y trabajos realizados.
- Gestionar cobros.
- Comunicarse con los clientes.
- Automatizar tareas repetitivas.
- Analizar el rendimiento comercial.
- Consultar información mediante inteligencia artificial.

La idea central es:

**Un negocio que pueda administrar sus procesos comerciales y operativos desde un solo lugar, con automatizaciones inteligentes y supervisión humana.**

## Posicionamiento deseado

Una plataforma de gestión y automatización inteligente para empresas de servicios técnicos.

Debe ser más que un software administrativo, pero sin convertirse en una herramienta compleja que un pequeño negocio no pueda aprender a utilizar.

Tiene que ser:

- Fácil de implementar.
- Fácil de aprender.
- Práctica.
- Rápida.
- Confiable.
- Modular.
- Profesional.
- Económicamente accesible.
- Capaz de crecer junto con la empresa.

No definir todavía el nombre comercial definitivo. Trabajar inicialmente con un nombre interno o provisional.

# 3. CLIENTES OBJETIVO

La plataforma tendrá una arquitectura generalista, pero no debemos intentar venderle a todo el mundo desde el primer día.

## Segmento A: servicios técnicos a domicilio

Este será nuestro segmento inicial de investigación y desarrollo, sujeto a validación mediante entrevistas.

Ejemplos:

- Técnicos de aire acondicionado.
- Instaladores de equipos.
- Electricistas.
- Plomeros.
- Técnicos de refrigeración.
- Empresas de mantenimiento.
- Empresas de instalaciones.
- Servicios de reparación a domicilio.
- Empresas con equipos de técnicos distribuidos geográficamente.

### Problemas que buscamos resolver

Muchas de estas empresas administran sus operaciones mediante una combinación de:

- WhatsApp.
- Excel.
- Agenda de papel.
- Google Calendar.
- Notas.
- Presupuestos en Word o PDF.
- Llamadas telefónicas.
- Planillas individuales.
- Sistemas que no están conectados entre sí.

Esto genera problemas como:

- Información duplicada.
- Clientes olvidados.
- Presupuestos sin seguimiento.
- Visitas mal organizadas.
- Dificultades para asignar técnicos.
- Falta de historial de servicios.
- Desconocimiento de trabajos pendientes.
- Cobros atrasados.
- Comunicaciones desorganizadas.
- Falta de información para tomar decisiones.

La plataforma debe centralizar esa información.

## Segmento B: talleres de reparación

Este será un segundo segmento potencial.

Ejemplos:

- Talleres de reparación de PC.
- Servicio técnico de notebooks.
- Reparación de celulares.
- Reparación de electrónica.
- Reparación de electrodomésticos.
- Talleres de equipos eléctricos.
- Servicios técnicos de electrónica en general.

### Problemas que buscamos resolver

- Registro de equipos recibidos.
- Diagnósticos.
- Historial de reparaciones.
- Presupuestos.
- Aprobaciones.
- Control de estados.
- Registro de repuestos.
- Entrega de equipos.
- Garantías.
- Comunicaciones con clientes.
- Seguimiento de reparaciones.

La arquitectura deberá permitir incorporar este segmento posteriormente sin reconstruir todo el producto.

IMPORTANTE: los talleres y los servicios a domicilio comparten clientes, presupuestos, órdenes y comunicaciones, pero tienen procesos distintos. No forzar ambos modelos en una única pantalla genérica.

# 4. PROBLEMA COMERCIAL QUE QUEREMOS RESOLVER

La mayor oportunidad no está en ofrecer más botones que nuestros competidores.

Está en integrar procesos que actualmente suelen estar separados.

Ejemplo:

1. Un cliente consulta por WhatsApp.
2. El negocio recibe la consulta.
3. Se registra automáticamente el cliente.
4. Se identifica qué servicio necesita.
5. Se crea una solicitud.
6. Se prepara un presupuesto.
7. El administrador lo revisa y lo envía.
8. El cliente acepta.
9. Se programa una visita.
10. Se asigna un técnico.
11. El técnico recibe la orden.
12. Realiza el trabajo.
13. Registra materiales, observaciones y fotografías.
14. El administrador registra el cobro.
15. Se informa al cliente que el servicio finalizó.
16. Se solicita una reseña.
17. Se programa un mantenimiento posterior cuando corresponda.

Todo debe quedar conectado.

La información no debería tener que copiarse manualmente entre WhatsApp, una planilla y el sistema de gestión.

La oportunidad es desarrollar una plataforma que automatice ese circuito.

# 5. ANÁLISIS DE COMPETENCIA Y REFERENCIAS

Ya identificamos competidores argentinos que sirven como referencia.

No debemos asumir que sus páginas, funcionalidades o precios siguen iguales. Investigar nuevamente cada producto y verificar sus fuentes oficiales antes de utilizar datos comerciales.

## Competidor 1: Ordion

Enfoque: gestión de empresas de servicios técnicos a domicilio.

Funciones identificadas anteriormente:

- Clientes.
- Órdenes de trabajo.
- Técnicos.
- Asignaciones.
- Agenda.
- Sucursales.
- Dashboard.
- Gestión de equipos operativos.

Precios que aparecieron en el relevamiento anterior:

| Plan | Precio mensual observado |
|---|---:|
| Emprendedor | AR$ 25.000 |
| Profesional | AR$ 45.000 |
| Empresa | AR$ 75.000 |
| Corporativo | AR$ 150.000 |

También se había identificado una prueba gratuita de 14 días.

Página: https://app.ordion.com.ar/

## Competidor 2: AppTec

Enfoque: gestión de técnicos que trabajan a domicilio.

Funciones identificadas:

- Aplicación Android para técnicos.
- Órdenes de servicio.
- Agenda.
- Técnicos.
- Inventario.
- Solicitud de materiales.
- Notificaciones.
- Hoja de ruta.
- GPS.
- Portal de clientes.
- Reportes.

Precios observados anteriormente:

| Plan | Precio mensual observado |
|---|---:|
| Gratis | AR$ 0 |
| Starter | AR$ 49.000 |
| Pro | AR$ 65.000 |
| Enterprise | AR$ 85.000 |

Página: https://apptec.com.ar/

## Competidor 3: OrdenSoft

Enfoque: software para talleres de reparación.

Funciones identificadas:

- Clientes.
- Órdenes de reparación.
- Estados personalizables.
- Técnicos.
- Fotos.
- Presupuestos.
- Cobros.
- Inventario.
- Punto de venta.
- Facturación ARCA.
- Seguimiento de clientes.
- Dashboard financiero.
- Asistente de IA.

Precios observados anteriormente:

| Plan | Precio mensual observado |
|---|---:|
| Básico | AR$ 24.000 |
| Profesional | AR$ 35.000 |
| Empresarial | AR$ 49.000 |

Página: https://ordensoft.com.ar/

## Competidor 4: GestiónPro

Enfoque: software para talleres de reparación.

Características identificadas:

- Aplicación de escritorio Windows.
- Acceso complementario desde celulares.
- Operación offline anunciada.
- Órdenes de trabajo.
- Clientes.
- Stock.
- Presupuestos PDF.
- Caja.
- Estadísticas.
- Facturación ARCA.
- WhatsApp automático.
- Inteligencia artificial.
- Asistencia diagnóstica.
- Garantías.
- Gestión de repuestos.

Precios observados anteriormente:

| Plan | Precio mensual observado |
|---|---:|
| Taller | AR$ 34.500 |
| Taller + Stock | AR$ 55.000 |
| Max | AR$ 86.500 |

Página de referencia: https://trgestion.com/

La URL, los planes y la identidad comercial deben verificarse antes de utilizarlos como información definitiva.

## Otros competidores que también deben investigarse

- STApp.
- Nixora CRM.
- Mecaris.
- TallerOS.
- Otros CRM argentinos.
- Software internacional de Field Service Management.
- Software de gestión de servicios técnicos.
- Plataformas de automatización comercial.

En relevamientos anteriores:

- STApp mostraba precios de entrada cercanos a AR$ 19.999 y referencias a planes gratuitos, aunque aparecieron distintos valores en diferentes páginas.
- Nixora mostraba valores distintos entre páginas, aproximadamente AR$ 19.900, AR$ 29.900 y AR$ 49.900.
- Mecaris aparecía con referencias a aproximadamente AR$ 28.000 mensuales.
- TallerOS aparecía desde aproximadamente AR$ 45.000 mensuales.

Todos estos valores son antecedentes del relevamiento previo, no precios garantizados ni necesariamente vigentes.

## Instrucciones de investigación competitiva

Para cada competidor:

1. Visitar su sitio oficial.
2. Revisar todos sus planes.
3. Revisar sus precios.
4. Identificar límites de usuarios y técnicos.
5. Buscar documentación y manuales.
6. Investigar las integraciones disponibles.
7. Revisar cómo funciona su WhatsApp.
8. Identificar sus capacidades reales de IA.
9. Analizar sus aplicaciones móviles.
10. Revisar capturas, videos y demostraciones.
11. Identificar qué funcionalidades son exclusivas de planes superiores.
12. Determinar si funciona online, offline o de ambas formas.
13. Evaluar la experiencia de usuario.
14. Detectar dificultades, limitaciones y oportunidades.

No confundir:

- Un botón que abre WhatsApp con una integración automatizada.
- Un chatbot con un agente que ejecuta acciones.
- Una función anunciada con una función probada.
- Un precio promocional con un precio regular.
- Un plan para un usuario con uno para varios técnicos.

Cuando sea posible, utilizar las pruebas gratuitas para comprobar el funcionamiento real. No afirmar que se probó algo sin haberlo hecho.

No deducir que una función no existe porque no está documentada. Clasificarla como "no documentada".

Generar un archivo:

`docs/COMPETITIVE_ANALYSIS.md`

Actualizarlo con fecha de investigación, fuentes, precios, capturas de evidencia y oportunidades de diferenciación.

# 6. ESTRATEGIA DE PRODUCTO Y DIFERENCIACIÓN

No vamos a competir exclusivamente mediante precios bajos.

Los competidores muestran que un software de entrada puede comercializarse por importes relativamente bajos porque tiene costos marginales reducidos, infraestructura compartida, funcionalidades limitadas por plan y un modelo de suscripción.

Debemos entender que:

- Una plataforma SaaS puede atender múltiples empresas con una infraestructura compartida.
- El costo de cada cliente adicional no equivale al costo de desarrollar otra aplicación.
- Los planes básicos pueden tener límites de usuarios, consumo o funcionalidades.
- Las funciones de IA y WhatsApp pueden generar costos variables.
- El volumen de clientes es fundamental para la rentabilidad.
- El soporte personalizado y la implementación pueden cobrarse aparte.

No conocemos los costos ni márgenes reales de los competidores. No inventarlos.

## Nuestra diferenciación propuesta

### Diferenciación 1: automatización de extremo a extremo

No limitarse a enviar notificaciones.

Una solicitud debe poder convertirse en un cliente, una oportunidad, un presupuesto, una orden, una visita y un seguimiento.

### Diferenciación 2: agente de IA realmente integrado

La IA deberá consultar información real del negocio y, cuando esté autorizada, ejecutar operaciones mediante herramientas controladas.

Ejemplo:

El administrador pregunta:

"¿Qué presupuestos siguen sin aprobarse?"

El asistente consulta la base de datos y responde con información real.

Otro ejemplo:

"Prepará una visita para Carlos mañana a las 10 y asignala a Martín".

El agente:

- Busca al cliente.
- Verifica la disponibilidad.
- Prepara la asignación.
- Informa cualquier conflicto.
- Presenta un resumen.
- Solicita confirmación.
- Ejecuta la operación después de recibir autorización.

### Diferenciación 3: historial centralizado

Cada cliente debe tener un historial de:

- Consultas.
- Solicitudes.
- Presupuestos.
- Órdenes.
- Servicios.
- Visitas.
- Pagos.
- Mensajes.
- Equipos o instalaciones.
- Mantenimientos.

### Diferenciación 4: adaptabilidad por rubro

El núcleo compartido será el mismo, pero cada actividad podrá tener:

- Campos adicionales.
- Tipos de servicio.
- Estados específicos.
- Plantillas.
- Formularios.
- Automatizaciones.
- Características propias.

No construir un sistema universal lleno de configuraciones complejas desde el principio.

# 7. FUNCIONALIDADES DEL PRODUCTO

Organizar el sistema en los siguientes módulos.

## MÓDULO A — CRM Y CLIENTES

Debe permitir:

- Crear clientes.
- Editar clientes.
- Buscar clientes.
- Registrar teléfono y correo.
- Registrar direcciones.
- Registrar observaciones.
- Consultar el historial completo.
- Clasificar clientes.
- Etiquetarlos.
- Registrar potenciales clientes.
- Identificar clientes recurrentes.
- Consultar últimas interacciones.
- Adjuntar archivos.

Cada empresa tendrá su propia base de clientes independiente.

## MÓDULO B — SOLICITUDES Y OPORTUNIDADES

Debe permitir registrar solicitudes provenientes de:

- WhatsApp.
- Formularios.
- Llamadas.
- Correo electrónico.
- Carga manual.
- Integraciones futuras.

Una solicitud deberá poder convertirse en una orden de trabajo sin volver a cargar todos los datos.

Registrar:

- Cliente.
- Problema.
- Servicio solicitado.
- Descripción.
- Dirección.
- Fotografías.
- Archivos.
- Prioridad.
- Origen.
- Fecha.
- Estado.
- Responsable.

## MÓDULO C — ÓRDENES DE TRABAJO

Este será uno de los módulos centrales.

Cada orden tendrá:

- Identificador único.
- Cliente.
- Descripción.
- Tipo de servicio.
- Estado.
- Prioridad.
- Dirección.
- Técnico asignado.
- Fecha de creación.
- Fecha prevista.
- Historial.
- Fotografías.
- Documentos.
- Observaciones internas.
- Actividades realizadas.
- Materiales utilizados, cuando corresponda.
- Presupuesto asociado.
- Información de cobro.

Estados iniciales sugeridos:

- Nueva.
- Pendiente de revisión.
- Presupuestada.
- Esperando aprobación.
- Aprobada.
- Programada.
- Asignada.
- En camino.
- En ejecución.
- En espera.
- Finalizada.
- Cancelada.

No permitir cambios incoherentes sin una transición válida.

Cada cambio importante deberá registrar quién lo realizó y cuándo.

Implementar una vista de tablero Kanban y una vista de tabla.

## MÓDULO D — PRESUPUESTOS

Debe permitir:

- Crear presupuestos.
- Agregar conceptos.
- Agregar cantidades.
- Agregar precios unitarios.
- Agregar descuentos.
- Configurar impuestos.
- Agregar observaciones.
- Definir vencimiento.
- Generar PDF.
- Enviar al cliente.
- Registrar aprobación o rechazo.
- Guardar versiones.
- Asociar el presupuesto a una orden.

El cliente podrá recibir un enlace seguro para consultar y aprobar o rechazar el presupuesto.

Las operaciones monetarias deben utilizar decimal, nunca float.

La moneda inicial será ARS.

No implementar facturación fiscal ni calcular impuestos legalmente sin verificar los requisitos actuales de ARCA y la normativa aplicable.

## MÓDULO E — AGENDA Y VISITAS

Debe permitir:

- Visualización diaria.
- Visualización semanal.
- Visualización mensual.
- Programación de visitas.
- Duración estimada.
- Asignación de técnicos.
- Dirección de la visita.
- Observaciones.
- Recordatorios.
- Detección de conflictos horarios.
- Reprogramación.

En el MVP no hace falta implementar optimización avanzada de rutas.

## MÓDULO F — TÉCNICOS

Cada técnico debe tener un perfil con:

- Nombre.
- Contacto.
- Estado.
- Especialidades.
- Disponibilidad.
- Órdenes asignadas.
- Historial de trabajos.
- Rendimiento.

Implementar una experiencia móvil responsive o PWA para que pueda:

- Consultar trabajos asignados.
- Ver datos del cliente.
- Consultar dirección.
- Cambiar el estado.
- Agregar observaciones.
- Adjuntar fotografías.
- Registrar actividades.
- Informar materiales utilizados.

El técnico no debe poder acceder a información administrativa que no le corresponde.

## MÓDULO G — INVENTARIO

Incluirlo posteriormente o de forma básica si el rubro inicial realmente lo necesita.

Posibles funcionalidades:

- Productos.
- Repuestos.
- Unidades.
- Existencias.
- Movimientos.
- Consumo por orden.
- Reservas.
- Proveedores.
- Alertas de stock.

No priorizar el inventario completo antes de validar que el segmento inicial lo necesita.

## MÓDULO H — PAGOS Y FINANZAS

Debe permitir:

- Registrar pagos.
- Registrar pagos parciales.
- Consultar saldos pendientes.
- Ver ingresos registrados.
- Consultar presupuestos aprobados.
- Consultar trabajos pendientes de cobro.
- Consultar períodos.

No confundir un pago registrado manualmente con una transacción bancaria realmente verificada.

Las integraciones con pasarelas de pago podrán incorporarse después.

## MÓDULO I — COMUNICACIONES

Centralizar comunicaciones con el cliente.

Canales posibles:

- WhatsApp.
- Correo electrónico.
- Notificaciones.
- Portal web.

Registrar:

- Fecha.
- Destinatario.
- Canal.
- Estado.
- Contenido o referencia.
- Relación con cliente u orden.
- Resultado de envío.

## MÓDULO J — AUTOMATIZACIONES

Permitir automatizaciones basadas en eventos.

Ejemplos:

1. Nueva solicitud: generar una oportunidad.
2. Presupuesto enviado: programar seguimiento.
3. Presupuesto aprobado: preparar una orden.
4. Visita programada: enviar recordatorio.
5. Técnico asignado: notificar al responsable.
6. Trabajo finalizado: informar al cliente.
7. Trabajo finalizado: solicitar reseña.
8. Cliente sin actividad: sugerir seguimiento.
9. Mantenimiento próximo: recordar contactar al cliente.

Cada automatización debe tener:

- Evento disparador.
- Condiciones.
- Acción.
- Estado.
- Historial de ejecuciones.
- Política de reintentos.
- Protección contra ejecuciones duplicadas.

No enviar mensajes comerciales sin consentimiento o sin cumplir las reglas aplicables del canal.

## MÓDULO K — INTELIGENCIA ARTIFICIAL

La IA no debe ser una característica decorativa.

Debe resolver problemas reales.

### Función 1: asistente administrativo

Ejemplos:

- ¿Cuántas órdenes siguen pendientes?
- ¿Cuánto dinero tengo pendiente de cobrar?
- ¿Qué presupuestos todavía no fueron aprobados?
- ¿Qué técnico tiene más trabajos asignados?
- ¿Cuáles son mis servicios más vendidos?
- ¿Cuántos clientes nuevos tuve este mes?
- ¿Qué trabajos se demoraron?
- ¿Qué clientes no volvieron?

Las respuestas deben basarse en consultas reales a la información de la empresa.

### Función 2: procesamiento de consultas

La IA podrá interpretar:

- Mensajes escritos.
- Audios, cuando se implemente transcripción.
- Fotografías, en etapas posteriores.
- Solicitudes de servicio.

Podrá extraer:

- Cliente.
- Problema.
- Equipo.
- Ubicación.
- Servicio.
- Prioridad.
- Fecha deseada.

Deberá pedir los datos faltantes en lugar de inventarlos.

### Función 3: generación asistida de presupuestos

La IA puede:

- Preparar una descripción.
- Sugerir conceptos desde un catálogo autorizado.
- Organizar materiales y tareas.
- Redactar observaciones.

Nunca debe inventar precios o comprometer al negocio con un presupuesto no aprobado.

### Función 4: agente con herramientas

Implementar herramientas internas controladas para:

- Buscar clientes.
- Consultar órdenes.
- Consultar presupuestos.
- Crear borradores.
- Consultar agenda.
- Preparar asignaciones.
- Generar reportes.

Las acciones sensibles requieren confirmación explícita.

La IA nunca debe tener acceso directo e irrestricto a SQL ni a datos de otras empresas.

### Función 5: análisis comercial

Analizar:

- Conversión de presupuestos.
- Clientes recurrentes.
- Tiempos de resolución.
- Ingresos.
- Servicios más frecuentes.
- Trabajos más rentables, cuando existan costos suficientes.
- Oportunidades de seguimiento.

Distinguir datos reales, estimaciones y recomendaciones.

# 8. WHATSAPP Y COMUNICACIONES AUTOMATIZADAS

WhatsApp es una integración estratégica, pero también puede representar un costo importante.

Utilizar la API oficial de WhatsApp Business Platform / Cloud API cuando se implemente la integración real.

No utilizar sistemas no oficiales basados en automatizar WhatsApp Web o mantener sesiones personales del usuario.

Funcionalidades previstas:

- Recibir mensajes.
- Identificar clientes.
- Registrar nuevas consultas.
- Asociar conversaciones.
- Enviar confirmaciones.
- Notificar estados de trabajos.
- Enviar presupuestos.
- Recordar turnos.
- Hacer seguimiento de presupuestos.
- Solicitar reseñas.

La integración deberá considerar:

- Webhooks.
- Verificación de firmas.
- Tokens y credenciales.
- Plantillas de mensajes.
- Consentimiento.
- Reglas del canal.
- Límites.
- Costos por conversación o mensaje según el esquema vigente.
- Reintentos.
- Registro de mensajes.

Las credenciales deberán estar cifradas o gestionadas de manera segura.

En una primera versión, permitir enlaces de WhatsApp con mensajes prearmados. No afirmar que eso es una integración completa.

# 9. EXPERIENCIA DE USUARIO Y DISEÑO

Queremos un producto profesional, moderno y fácil de utilizar.

Referencias de estilo:

- SaaS B2B moderno.
- Interfaces administrativas limpias.
- Dashboards informativos.
- Navegación clara.
- Formularios simples.
- Tableros Kanban.
- Tablas útiles.
- Diseño responsive.

Características obligatorias:

- Interfaz en español argentino.
- Formatos de fecha apropiados para Argentina.
- Moneda ARS.
- Zona horaria America/Argentina/Buenos_Aires.
- Navegación intuitiva.
- Buen uso de espacios.
- Jerarquía visual.
- Estados claramente reconocibles.
- Diseño accesible.
- Experiencia móvil para técnicos.

Evitar:

- Interfaces genéricas generadas sin criterio.
- Exceso de gradientes.
- Animaciones innecesarias.
- Efectos de fade aplicados a todos los elementos.
- Demasiadas tarjetas sin información útil.
- Tablas difíciles de usar.
- Formularios interminables.
- Pantallas que requieran conocimientos técnicos.

La prioridad es la usabilidad.

El sistema debe sentirse como un producto comercial real, no como un proyecto escolar o una demostración.

# 10. ARQUITECTURA TECNOLÓGICA PROPUESTA

Arquitectura inicial sugerida:

## Frontend

- Next.js.
- React.
- TypeScript.
- App Router.
- Tailwind CSS.
- Componentes reutilizables.
- Sistema de formularios y validaciones.
- Cliente de API centralizado.

Se puede utilizar shadcn/ui u otra biblioteca adecuada.

Usar TypeScript en modo estricto.

## Backend

- Python.
- FastAPI.
- Pydantic.
- SQLAlchemy.
- Alembic.
- APIs REST.
- Documentación OpenAPI.
- Arquitectura modular.

## Base de datos

- PostgreSQL.

## Archivos

- Supabase Storage o almacenamiento compatible con S3.

## Autenticación

Evaluar Supabase Auth o una solución equivalente que permita manejar usuarios, sesiones y JWT de manera segura.

## Automatizaciones

- n8n como herramienta complementaria de orquestación cuando aporte valor.
- Eventos internos del backend como fuente de verdad.
- Webhooks para integraciones externas.

n8n no debe convertirse en la base de datos principal del negocio.

## Inteligencia artificial

Diseñar una capa independiente del proveedor de modelos.

Debe permitir integrar:

- Ollama para desarrollo y experimentación local.
- Proveedores externos mediante APIs.
- Modelos especializados según el caso de uso.

No acoplar todo el producto a un proveedor de IA específico.

## Infraestructura

Comenzar con una infraestructura económica.

No utilizar microservicios desde el principio.

No crear Kubernetes, Redis, Kafka ni componentes adicionales sin una justificación concreta.

Preferir un backend modular y bien organizado.

Si se utiliza Supabase para PostgreSQL, autenticación y almacenamiento, documentar qué responsabilidades quedan en Supabase y cuáles en FastAPI.

Si existe una razón para utilizar PostgreSQL administrado directamente, documentarla.

La arquitectura debe permitir migraciones futuras sin quedar innecesariamente atada a un proveedor.

# 11. ARQUITECTURA MULTI-TENANT

ESTE PUNTO ES FUNDAMENTAL.

El producto será utilizado por empresas diferentes.

Cada empresa tendrá:

- Sus usuarios.
- Sus clientes.
- Sus técnicos.
- Sus órdenes.
- Sus presupuestos.
- Sus archivos.
- Sus automatizaciones.
- Sus integraciones.
- Sus configuraciones.

Una empresa nunca podrá consultar, modificar ni eliminar información de otra.

Implementar separación multi-tenant desde el comienzo.

Requisitos:

1. Cada empresa tendrá un tenant_id.
2. Las entidades comerciales tendrán relación con un tenant.
3. Cada usuario tendrá una membresía a una o varias empresas cuando corresponda.
4. Todos los endpoints verificarán pertenencia al tenant.
5. No confiar únicamente en el tenant_id enviado por el frontend.
6. Aplicar control de acceso en el backend y, cuando corresponda, Row Level Security en PostgreSQL.
7. Implementar restricciones de integridad.
8. Evitar referencias entre entidades de distintos tenants.
9. Registrar las acciones importantes.
10. Realizar pruebas específicas de aislamiento entre empresas.

Nunca asumir que un identificador de cliente, orden o presupuesto autoriza a consultar sus datos.

## Roles iniciales

- Owner: propietario de la empresa.
- Admin: administración.
- Dispatcher/Manager: coordinación de operaciones.
- Technician: técnico.
- Viewer: consulta limitada.

Diseñar permisos configurables y validarlos siempre desde el backend.

# 12. MODELO DE DATOS INICIAL

Diseñar un esquema consistente, pero no agregar tablas innecesarias.

Entidades candidatas:

- tenants
- users
- memberships
- customer
- customer_addresses
- leads
- service_catalog
- service_requests
- work_orders
- work_order_events
- appointments
- technician_profiles
- quotes
- quote_items
- payments
- attachments
- communications
- message_templates
- automation_rules
- automation_executions
- integration_connections
- audit_logs
- ai_usage_logs

Para servicios que lo requieran, considerar una entidad de equipos o activos:

- assets
- asset_service_history

Para inventario, incorporar posteriormente:

- products
- stock_locations
- stock_movements
- suppliers

Analizar las relaciones antes de implementar.

Utilizar:

- IDs estables.
- Claves foráneas.
- Restricciones.
- Índices adecuados.
- Timestamps.
- Migraciones versionadas.

No utilizar borrados en cascada indiscriminadamente.

No guardar importes monetarios como float.

Guardar timestamps en UTC y presentarlos en la zona horaria correspondiente.

Los presupuestos deben guardar una copia histórica de sus conceptos y precios para que una modificación posterior del catálogo no cambie un presupuesto ya enviado.

Crear:

`docs/DATA_MODEL.md`

Documentar entidades, relaciones, índices y decisiones.

# 13. SEGURIDAD, PRIVACIDAD Y CONFIABILIDAD

El sistema manejará información privada de empresas y clientes.

Implementar desde el inicio:

- Autenticación segura.
- Autorización por roles.
- Aislamiento multi-tenant.
- Validación de entradas.
- Protección frente a SQL injection.
- Protección frente a XSS y CSRF según corresponda.
- Rate limiting.
- Gestión segura de sesiones.
- Manejo seguro de archivos.
- Validación de tipos y tamaños de archivos.
- Logs.
- Auditoría.
- Backups.
- Gestión de secretos.
- Cifrado de comunicaciones.
- Manejo seguro de webhooks.
- Protección de credenciales de integraciones.

No guardar claves ni tokens en el repositorio.

Utilizar `.env.example` con valores ficticios.

No subir `.env` real a Git.

Considerar la legislación argentina aplicable a datos personales, especialmente la Ley 25.326, y verificar los requisitos legales y contractuales vigentes antes de comercializar.

No asumir que implementar una política de privacidad por sí solo alcanza para cumplir la normativa.

# 14. MODELO DE NEGOCIO Y MONETIZACIÓN

El producto será SaaS B2B.

La fuente principal de ingresos será la suscripción mensual.

También se podrá cobrar:

- Configuración inicial.
- Migración de datos.
- Capacitación.
- Integraciones personalizadas.
- Automatizaciones especiales.
- Consumo adicional de IA.
- Consumo adicional de WhatsApp.
- Servicios de soporte avanzado.

## Planes preliminares

### Starter

Pensado para técnicos independientes y negocios pequeños.

Posibles características:

- CRM.
- Clientes.
- Órdenes.
- Presupuestos.
- Agenda básica.
- Historial.

### Professional

Pensado para empresas con varios técnicos.

Posibles características:

- Todo Starter.
- Varios usuarios.
- Asignación de técnicos.
- WhatsApp integrado.
- Automatizaciones.
- Reportes.
- Seguimiento de presupuestos.
- Herramientas adicionales de IA.

### Business

Pensado para empresas más grandes.

Posibles características:

- Todo Professional.
- Sucursales.
- Permisos avanzados.
- Integraciones.
- Automatizaciones avanzadas.
- Análisis de negocio.
- IA avanzada.
- Límites superiores.
- Soporte prioritario.

No definir precios definitivos todavía.

Primero investigar la competencia, calcular nuestros costos y entrevistar potenciales clientes.

## Política comercial

No competir por ser el más barato.

Competir por:

- Valor generado.
- Ahorro de tiempo.
- Reducción de trabajos olvidados.
- Mejor seguimiento.
- Menos administración manual.
- Mejor organización.
- Más conversiones.
- Mejor experiencia del cliente.

El precio debe ser accesible para pequeñas empresas, pero permitir operar un negocio rentable.

## Costos que deben calcularse

- Hosting.
- Base de datos.
- Almacenamiento.
- Backups.
- Correo.
- Proveedor de IA.
- WhatsApp.
- Pasarela de pagos.
- Dominio.
- Monitoreo.
- Soporte.
- Comisiones.
- Impuestos.
- Marketing.
- Desarrollo y mantenimiento.

Preparar un modelo de unit economics.

Simular escenarios de:

- 10 clientes.
- 25 clientes.
- 50 clientes.
- 100 clientes.
- 300 clientes.
- 500 clientes.
- 1.000 clientes.

Diferenciar facturación bruta, costos, margen bruto y resultado operativo.

No confundir facturación con ganancias.

# 15. ESTRATEGIA PARA EL MVP

No desarrollar todo simultáneamente.

La primera versión debe demostrar que la plataforma puede resolver un proceso real y generar valor.

## MVP — ETAPA 1

Implementar:

1. Registro e inicio de sesión.
2. Creación de empresa.
3. Multi-tenancy.
4. Roles básicos.
5. Registro de clientes.
6. Registro de solicitudes.
7. Órdenes de trabajo.
8. Estados.
9. Asignación de técnicos.
10. Presupuestos.
11. Agenda básica.
12. Dashboard básico.
13. Historial de eventos.

La primera versión debe permitir completar el siguiente circuito:

Crear un cliente → registrar una solicitud → generar una orden → crear un presupuesto → registrar su aprobación → programar una visita → asignar un técnico → completar el trabajo.

Todo debe quedar persistido correctamente.

## ETAPA 2 — Automatizaciones

- Seguimiento de presupuestos.
- Recordatorios.
- Notificaciones de cambios.
- Automatizaciones basadas en eventos.
- Plantillas de mensajes.
- Historial de ejecuciones.

## ETAPA 3 — WhatsApp

- API oficial.
- Recepción de consultas.
- Identificación de clientes.
- Creación de solicitudes.
- Mensajes automáticos.
- Seguimientos.

## ETAPA 4 — IA

- Asistente de gestión.
- Consultas de información.
- Procesamiento de mensajes.
- Preparación de presupuestos.
- Agente con herramientas.
- Análisis comercial.

## ETAPA 5 — Expansión

- Aplicación o PWA para técnicos avanzada.
- Inventario.
- Equipos y mantenimientos.
- Rutas.
- GPS.
- Integraciones.
- Facturación.
- Nuevos rubros.
- Talleres de reparación.

No implementar las etapas 4 y 5 antes de tener una primera versión funcional.

# 16. REGLAS PARA EL DESARROLLO

Estas instrucciones son obligatorias.

## A. Primero inspeccionar el entorno

Antes de crear archivos:

1. Inspeccionar el directorio de trabajo.
2. Identificar archivos existentes.
3. Identificar el stack ya instalado.
4. Verificar versiones.
5. Revisar si existe un repositorio Git.
6. Revisar el estado de Git.
7. Detectar configuraciones existentes.
8. Identificar si ya existe una base de código.

No sobrescribir archivos o configuraciones existentes sin revisar qué contienen.

No borrar información del usuario.

Si ya existe un proyecto, evaluar si conviene continuarlo antes de crear otro.

## B. Documentación antes de decisiones irreversibles

Crear una documentación inicial:

- `README.md`
- `docs/PRODUCT_BRIEF.md`
- `docs/PRD.md`
- `docs/COMPETITIVE_ANALYSIS.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/ROADMAP.md`
- `docs/DECISIONS.md`
- `docs/SECURITY.md`
- `docs/DEPLOYMENT.md`

No pasar semanas redactando documentación sin programar.

La documentación tiene que ayudar al desarrollo.

## C. Programar de forma incremental

Implementar funcionalidades completas y verificables.

No crear veinte módulos vacíos.

Cada funcionalidad debe tener:

- Frontend.
- Backend.
- Persistencia.
- Validaciones.
- Control de permisos.
- Manejo de errores.
- Pruebas.

Priorizar flujos completos de usuario.

## D. Probar todo

Ejecutar:

- Pruebas unitarias.
- Pruebas de integración.
- Pruebas de API.
- Pruebas de permisos.
- Pruebas multi-tenant.
- Pruebas de migraciones.
- Validación de frontend.
- Type checking.
- Linting.

No afirmar que una prueba pasó si no fue ejecutada.

No ocultar errores.

## E. Código mantenible

- Tipado estricto.
- Nombres claros.
- Separación de responsabilidades.
- Funciones pequeñas.
- Validaciones centralizadas.
- Configuración por ambiente.
- Manejo consistente de excepciones.
- Logs estructurados.
- Documentación de APIs.
- Migraciones controladas.

Evitar archivos gigantes con toda la lógica del negocio.

No duplicar código innecesariamente.

No introducir abstracciones complejas sin justificación.

## F. Herramientas

Cuando tengas acceso a terminal, archivos y herramientas:

- Inspeccionar.
- Ejecutar.
- Modificar.
- Instalar dependencias necesarias.
- Ejecutar pruebas.
- Revisar errores.
- Corregirlos.

No quedarte únicamente en recomendaciones.

Si una herramienta o acceso no está disponible, explicar exactamente qué no pudiste ejecutar y continuar con lo que sí sea posible.

# 17. EXPERIENCIA DE DESARROLLO Y ESTRUCTURA

Proponer una organización clara del repositorio.

Una estructura inicial posible:

```text
project/
│
├── apps/
│   ├── web/
│   │   ├── src/
│   │   ├── public/
│   │   └── ...
│   │
│   └── api/
│       ├── app/
│       │   ├── api/
│       │   ├── core/
│       │   ├── models/
│       │   ├── schemas/
│       │   ├── services/
│       │   ├── repositories/
│       │   └── ...
│       ├── migrations/
│       └── tests/
│
├── docs/
│
├── scripts/
│
├── infra/
│
├── .env.example
├── .gitignore
└── README.md
```

Modificar la estructura si existe una opción claramente mejor.

No crear carpetas vacías por estética.

# 18. MÉTRICAS DEL PRODUCTO

Desde el principio debemos pensar cómo medir si el producto sirve realmente.

Métricas importantes:

- Empresas registradas.
- Empresas activas.
- Usuarios activos.
- Clientes registrados.
- Órdenes creadas.
- Órdenes finalizadas.
- Tiempo promedio de resolución.
- Presupuestos enviados.
- Presupuestos aceptados.
- Conversión de presupuestos.
- Ingresos registrados.
- Órdenes pendientes.
- Clientes recurrentes.
- Automatizaciones ejecutadas.
- Errores de automatización.
- Consumo de IA.
- Consumo de WhatsApp.

No crear métricas que no tengan una definición precisa.

Documentar los cálculos.

# 19. CRITERIOS DE ACEPTACIÓN DEL MVP

Consideraremos que la primera versión funcional está lista cuando:

1. Un usuario pueda registrarse.
2. Pueda crear una empresa.
3. Pueda invitar o registrar usuarios.
4. Los datos queden aislados por empresa.
5. Pueda crear un cliente.
6. Pueda registrar una solicitud.
7. Pueda generar una orden.
8. Pueda cambiar el estado de una orden.
9. Pueda crear un presupuesto con conceptos.
10. Pueda calcular los totales correctamente.
11. Pueda generar un PDF.
12. Pueda registrar la aprobación de un presupuesto.
13. Pueda programar una visita.
14. Pueda asignar un técnico.
15. El técnico pueda consultar su trabajo desde el celular.
16. El técnico pueda informar el resultado.
17. El administrador pueda consultar el historial.
18. El dashboard muestre información persistida.
19. Las pruebas de aislamiento multi-tenant pasen.
20. El proyecto pueda ejecutarse siguiendo el README.

Esto representa un MVP funcional, no un producto terminado.

# 20. VALIDACIÓN COMERCIAL

No confundir desarrollar software con validar un negocio.

Necesitamos entrevistar potenciales clientes reales.

La primera investigación debería apuntar a pequeños negocios de servicios técnicos del Gran Buenos Aires, especialmente zonas occidentales como Haedo, El Palomar, Santos Lugares y alrededores, cuando resulte conveniente.

No asumir que esas zonas representan todo el mercado argentino.

Preparar entrevistas con preguntas como:

- ¿Cómo reciben solicitudes de clientes?
- ¿Cómo registran a sus clientes?
- ¿Cómo hacen presupuestos?
- ¿Cómo organizan los trabajos?
- ¿Cómo asignan técnicos?
- ¿Cómo coordinan las visitas?
- ¿Qué utilizan actualmente?
- ¿Cuánto tiempo pierden administrando información?
- ¿Qué problemas les generan pérdidas económicas?
- ¿Cómo hacen seguimiento de presupuestos?
- ¿Qué tareas repiten diariamente?
- ¿Cuánto pagan actualmente por software?
- ¿Qué funcionalidades realmente utilizarían?
- ¿Pagarían por resolver alguno de esos problemas?

No presentar el proyecto como solución perfecta antes de comprender las necesidades del entrevistado.

Buscar obtener entre cinco y diez entrevistas iniciales.

Identificar problemas frecuentes y clasificarlos por:

- Frecuencia.
- Impacto económico.
- Tiempo perdido.
- Disposición a pagar.
- Facilidad de implementación.

No construir funcionalidades únicamente porque parecen interesantes técnicamente.

# 21. DECISIONES Y RESTRICCIONES IMPORTANTES

Mantener las siguientes decisiones como principios del proyecto:

- Producto SaaS B2B.
- Mercado inicial argentino.
- Idioma español.
- Moneda ARS.
- Zona horaria argentina.
- Enfoque inicial en servicios técnicos a domicilio, sujeto a validación.
- Arquitectura extensible a talleres de reparación.
- CRM + órdenes + presupuestos + agenda + automatización + IA.
- Multi-tenancy desde el inicio.
- PostgreSQL como base relacional.
- Backend modular.
- Frontend moderno.
- IA desacoplada del proveedor.
- WhatsApp oficial cuando se implemente.
- Seguridad desde el inicio.
- Infraestructura económica.
- No microservicios prematuros.
- No funcionalidades ilimitadas que generen costos variables imposibles de controlar.
- No competencia basada exclusivamente en precio.
- No inventar información de competidores.
- No sobreconstruir antes de validar.

# 22. CÓMO QUIERO QUE TRABAJES CONMIGO

Quiero desarrollar este proyecto de manera colaborativa.

Vos sos el agente técnico que ejecuta el trabajo y yo soy el fundador que toma decisiones de producto y negocio.

Tené en cuenta lo siguiente:

1. No me hagas repetir información que ya está en este documento.
2. No hagas preguntas innecesarias.
3. Ante decisiones reversibles, elegí la alternativa técnicamente razonable y documentala.
4. Ante decisiones que pueden generar costos, comprometer seguridad o cambiar sustancialmente el alcance, explicá las alternativas.
5. No te detengas por cuestiones menores.
6. No prometas trabajo futuro: ejecutá lo posible ahora.
7. No simules integraciones que no están funcionando.
8. No uses datos falsos para demostrar que el sistema funciona.
9. No afirmes que una funcionalidad está terminada si solo existe su interfaz.
10. Mantener actualizado el README y la documentación técnica.
11. Antes de modificar archivos existentes, inspeccionarlos.
12. Utilizar Git y commits lógicos cuando corresponda.
13. Mantener un registro de decisiones técnicas.
14. Priorizar código real y probado.
15. Explicarme de manera sencilla las decisiones importantes.

Cuando termines una tarea, informá:

- Qué implementaste.
- Qué archivos creaste o modificaste.
- Qué tecnologías utilizaste.
- Qué pruebas ejecutaste.
- Qué resultados obtuviste.
- Qué falta.
- Qué problemas encontraste.
- Cuál es el siguiente paso concreto.

No incluir enormes explicaciones de código innecesarias si podés documentarlas en el repositorio.

# 23. PRIMERA TAREA: COMENZAR EL PROYECTO

A partir de todo este contexto, quiero que empieces a trabajar.

NO QUIERO QUE TE LIMITES A RESPONDER CON UN PLAN.

Ejecutá las siguientes tareas en orden.

### PASO 1 — AUDITORÍA DEL ENTORNO

Inspeccioná el directorio de trabajo y el entorno.

Determiná:

- Si existe un repositorio.
- Si existen archivos anteriores.
- Si hay tecnologías instaladas.
- Si hay dependencias.
- Si existe alguna base de datos.
- Si el entorno permite ejecutar el frontend y backend.
- Si hay restricciones de herramientas.

No sobrescribir archivos existentes sin inspeccionarlos.

### PASO 2 — DEFINICIÓN DEL PRODUCTO

Crear un resumen técnico y comercial.

Definir:

- Problema.
- Cliente inicial.
- Propuesta de valor.
- Diferenciación.
- Funcionalidades del MVP.
- Funcionalidades posteriores.
- Modelo comercial provisional.
- Riesgos.
- Hipótesis que necesitan validación.

La primera hipótesis será una plataforma para empresas pequeñas de servicios técnicos a domicilio, pero sin cerrar la arquitectura a otros rubros.

### PASO 3 — INVESTIGACIÓN COMPETITIVA

Actualizar la información de:

- Ordion.
- AppTec.
- OrdenSoft.
- GestiónPro.
- STApp.
- Nixora.
- Mecaris.
- TallerOS.

Investigar competidores adicionales.

Verificar funcionalidades y precios en fuentes oficiales.

Crear la documentación correspondiente.

### PASO 4 — DISEÑO TÉCNICO

Diseñar:

- Arquitectura general.
- Arquitectura del frontend.
- Arquitectura del backend.
- Modelo de datos.
- Multi-tenancy.
- Autenticación.
- Roles.
- APIs.
- Seguridad.
- Integraciones.
- Estrategia de pruebas.

Documentar decisiones.

### PASO 5 — CREACIÓN DEL PROYECTO

Preparar la estructura del repositorio.

Configurar las aplicaciones necesarias.

Configurar dependencias.

Preparar variables de entorno de ejemplo.

Implementar una configuración reproducible.

No exigir Docker para la primera ejecución local si existe una alternativa razonable.

### PASO 6 — PRIMER VERTICAL SLICE FUNCIONAL

No crear únicamente un dashboard de demostración.

Implementar el primer flujo real:

1. Autenticación.
2. Creación de empresa.
3. Registro de cliente.
4. Creación de solicitud.
5. Conversión en orden de trabajo.
6. Consulta de órdenes.
7. Actualización de estado.
8. Persistencia en PostgreSQL.
9. Validación de acceso por tenant.

Preparar pruebas automatizadas.

### PASO 7 — VERIFICACIÓN

Ejecutar el sistema.

Verificar que frontend y backend se comuniquen.

Ejecutar pruebas.

Corregir errores.

Actualizar documentación.

### PASO 8 — INFORME AL FUNDADOR

Entregar un informe concreto sobre:

- Estado del proyecto.
- Arquitectura utilizada.
- Funcionalidades reales implementadas.
- Cómo ejecutar el sistema.
- Variables de entorno necesarias.
- Resultados de pruebas.
- Decisiones pendientes.
- Próxima funcionalidad a desarrollar.

Si hay alguna limitación de credenciales, servicios externos o herramientas, explicarla sin inventar que la integración funciona.

---

# 24. VISIÓN A LARGO PLAZO

El objetivo no es entregar un proyecto de portfolio que solamente funcione en una computadora.

Queremos desarrollar un negocio tecnológico.

A largo plazo, la plataforma podría contar con:

- Administración avanzada de empresas.
- Aplicación móvil para técnicos.
- Portal de clientes.
- WhatsApp integrado.
- Agentes de IA especializados.
- Automatizaciones personalizables.
- Reportes avanzados.
- Inventario.
- Mantenimiento preventivo.
- Rutas y GPS.
- Facturación e integraciones argentinas.
- Integraciones con herramientas externas.
- Gestión de múltiples sucursales.
- Planes comerciales.
- Suscripciones.
- Panel de administración global.
- Métricas del SaaS.
- Onboarding automatizado.
- Sistema de soporte.

Pero todo debe construirse en función de las necesidades reales de nuestros clientes.

La prioridad siempre será:

**Construir algo que alguien necesite, que esté dispuesto a pagar y que podamos mantener de forma rentable.**

---

# INSTRUCCIÓN FINAL

Leé todo este documento y utilizalo como contexto permanente del proyecto.

No pierdas de vista la visión general cuando estés desarrollando funcionalidades individuales.

Empezá por inspeccionar el entorno y ejecutar la primera tarea.

No esperes a que te dé instrucciones para cada archivo o cada comando.

Tomá decisiones técnicas razonables, documentalas y avanzá.

Quiero que construyamos este producto como si fuéramos a lanzarlo comercialmente, porque esa es precisamente la intención.

# ANEXO V2 — IDENTIDAD, PRODUCTO COMERCIAL, ARQUITECTURA OPERATIVA Y ESTRATEGIA DE LANZAMIENTO

Este documento complementa el Prompt Maestro del proyecto.

Todas las instrucciones, restricciones y decisiones anteriores siguen vigentes. Este anexo agrega información, resuelve ambigüedades y profundiza aspectos que todavía no estaban suficientemente especificados.

# 1. IDENTIDAD Y NOMBRE COMERCIAL

## 1.1. Estado del nombre

Se había propuesto TIVORA como posible nombre comercial.

Sin embargo, una investigación preliminar del 6 de noviembre de 2026 encontró:

- Una plataforma de IA denominada Tivora en https://tivora.tech/.
- Una organización llamada TIVORA LABS relacionada con infraestructura de datos y analítica.
- Una empresa de electrónica de consumo que utiliza TIVORA.
- Antecedentes de marcas TIVORA en Estados Unidos.
- Uso existente del dominio tivora.com.

Por lo tanto:

**TIVORA NO ESTÁ APROBADO COMO NOMBRE COMERCIAL DEFINITIVO.**

Puede conservarse como referencia interna temporal, pero no debe incorporarse como identidad comercial definitiva, dominio, nombre de empresa o marca pública.

No asumir que existe disponibilidad legal por no encontrar un competidor argentino idéntico.

## 1.2. Investigación de nombres

Preparar una investigación profesional de nombres alternativos.

Características que buscamos:

- Preferentemente una palabra inventada.
- Entre cinco y nueve letras.
- Fácil pronunciación en español.
- Fácil escritura.
- Fácil de recordar.
- Sonido tecnológico y profesional.
- Identidad apropiada para un SaaS B2B.
- Que pueda utilizarse en Argentina y otros países latinoamericanos.
- Que no esté limitado a técnicos, talleres, reparaciones o un rubro específico.
- Que permita desarrollar subproductos y módulos.

Evitar nombres demasiado genéricos, descriptivos o difíciles de escribir.

No elegir simplemente palabras inglesas comunes agregándoles una letra.

## 1.3. Proceso de validación

Para cada candidato:

1. Buscar el nombre exacto en Google.
2. Buscar variaciones fonéticas y ortográficas.
3. Buscar empresas de software con ese nombre.
4. Buscar plataformas de CRM y automatización con denominaciones similares.
5. Revisar LinkedIn.
6. Revisar GitHub.
7. Revisar dominios .com y .com.ar.
8. Revisar redes sociales cuando resulte relevante.
9. Consultar el buscador oficial del INPI argentino.
10. Revisar TMview.
11. Examinar marcas idénticas y fonéticamente similares.
12. Verificar las clases correspondientes a los servicios y productos que ofreceremos.

Fuentes oficiales:

- https://portaltramites.inpi.gov.ar/marcasconsultas/busqueda
- https://www.argentina.gob.ar/inpi/marcas/averigua-si-tu-marca-esta-registrada
- https://www.argentina.gob.ar/inpi/marcas/registrar-una-marca
- https://www.tmdn.org/tmview/

Investigar especialmente las clases de Niza que puedan corresponder a SaaS, software descargable y servicios empresariales. Considerar inicialmente las clases 42, 9 y 35 como áreas de análisis, sin asumir que todas son necesarias ni que su clasificación sea automática.

IMPORTANTE:

Una búsqueda web no sustituye una búsqueda oficial de anterioridades fonéticas ni asesoramiento marcario.

No afirmar que una marca está legalmente disponible sin evidencia suficiente.

Entregar una tabla comparativa de diez candidatos como máximo, con:

- Nombre.
- Significado o concepto.
- Pronunciación.
- Identidad de marca.
- Empresas o productos coincidentes.
- Dominios encontrados.
- Antecedentes marcarios.
- Riesgos.
- Observaciones.

La elección definitiva corresponde al fundador.

## 1.4. Identidad visual

Una vez aprobado un nombre:

Crear una identidad visual coherente.

La marca debería transmitir:

- Confianza.
- Organización.
- Tecnología.
- Inteligencia.
- Productividad.
- Profesionalismo.
- Simplicidad.

Preparar posteriormente:

- Logotipo principal.
- Isotipo.
- Versión horizontal.
- Versión compacta.
- Favicon.
- Paleta de colores.
- Tipografía.
- Guía de marca.
- Aplicaciones en la interfaz.
- Aplicaciones para documentos comerciales.

No gastar recursos en branding definitivo antes de validar el nombre.

# 2. DEFINICIÓN ESTRATÉGICA DEL PRIMER MERCADO

Tenemos dos segmentos principales:

A. Empresas y técnicos que trabajan a domicilio.

B. Talleres de reparación de electrónica, PC, celulares y electrodomésticos.

Todavía no existe una decisión definitiva sobre cuál será el primer segmento comercial.

La hipótesis inicial favorece a los servicios a domicilio, pero debe verificarse.

## 2.1. Estudiar cada segmento por separado

Investigar:

- Cantidad y tipo de negocios potenciales.
- Problemas frecuentes.
- Software que utilizan.
- Cómo administran sus clientes.
- Cómo reciben solicitudes.
- Cómo crean presupuestos.
- Cómo coordinan visitas.
- Cómo cobran.
- Qué automatizaciones necesitan.
- Cuánto tiempo pierden administrando tareas.
- Cuánto están dispuestos a pagar.

No confundir popularidad de una funcionalidad con disposición real a pagar.

## 2.2. Comparación de segmentos

Construir una matriz considerando:

- Tamaño del mercado accesible.
- Intensidad del problema.
- Frecuencia de uso del software.
- Presupuesto disponible.
- Competencia.
- Costos de adquisición.
- Complejidad técnica.
- Facilidad de implementación.
- Potencial de suscripción.
- Posibilidad de conseguir clientes piloto.

No seleccionar un rubro únicamente porque es más interesante técnicamente.

## 2.3. Validación presencial

Priorizar inicialmente negocios del Gran Buenos Aires occidental cuando resulte conveniente.

Buscar potenciales clientes en:

- Haedo.
- El Palomar.
- Santos Lugares.
- Morón.
- Caseros.
- Ramos Mejía.
- Hurlingham.
- San Justo.
- Otras localidades cercanas.

Preparar un sistema de entrevistas.

Registrar:

- Nombre comercial del negocio.
- Actividad.
- Tamaño aproximado.
- Cantidad de técnicos.
- Herramientas utilizadas.
- Problemas identificados.
- Soluciones actuales.
- Interés en una demostración.
- Posible disposición a pagar.
- Próximo contacto.

No inventar entrevistas ni respuestas.

Crear:

`docs/CUSTOMER_RESEARCH.md`

Mantener un registro de hipótesis confirmadas, descartadas y pendientes.

# 3. DEFINICIÓN MÁS PRECISA DEL PRODUCTO

El sistema debe estar construido alrededor de procesos de negocio, no solamente de módulos independientes.

## 3.1. Separar conceptos del dominio

No tratar como equivalentes:

- Lead.
- Cliente.
- Consulta.
- Solicitud de servicio.
- Presupuesto.
- Orden de trabajo.
- Visita.
- Tarea.
- Pago.
- Servicio realizado.

Deben existir relaciones claras.

Ejemplo:

Un lead puede convertirse en cliente.

Un cliente puede generar muchas solicitudes.

Una solicitud puede originar uno o varios presupuestos.

Un presupuesto aprobado puede generar una orden.

Una orden puede requerir varias visitas.

Una orden puede involucrar varios técnicos.

Una orden puede generar varios pagos.

Una orden finalizada puede originar un mantenimiento futuro.

Diseñar este flujo para que no se pierda información histórica.

## 3.2. Separar el núcleo y las configuraciones por rubro

El núcleo común debería incluir:

- Clientes.
- Solicitudes.
- Presupuestos.
- Órdenes.
- Usuarios.
- Agenda.
- Comunicaciones.
- Pagos.
- Automatizaciones.
- Reportes.

Cada rubro podrá incorporar extensiones.

Ejemplos:

### Aire acondicionado

- Marca.
- Modelo.
- Número de serie.
- Capacidad.
- Tipo de refrigerante.
- Fecha de instalación.
- Historial.
- Mantenimientos.
- Garantías.

### Electricidad

- Tipo de instalación.
- Ubicación.
- Tablero.
- Circuitos.
- Materiales.
- Observaciones técnicas.

### Reparación de PC

- Fabricante.
- Modelo.
- Número de serie.
- Accesorios recibidos.
- Estado físico.
- Diagnóstico.
- Componentes reemplazados.
- Garantía.

No crear campos específicos de cada actividad dentro de todas las tablas generales.

Evaluar configuraciones de formularios, atributos extensibles o entidades específicas por dominio.

No abusar de JSON para reemplazar un modelo relacional bien diseñado.

# 4. CICLO DE VIDA DE UNA ORDEN

Diseñar un sistema de estados flexible, pero validado.

Separar:

- Estado comercial.
- Estado operativo.
- Estado de cobro.

Por ejemplo, un trabajo puede estar finalizado operativamente y seguir parcialmente pendiente de pago.

No representar todas las situaciones con un único campo status.

Cada transición debe:

1. Validar el estado anterior.
2. Validar permisos.
3. Validar condiciones necesarias.
4. Registrar un evento.
5. Guardar quién ejecutó el cambio.
6. Guardar la fecha.
7. Activar automatizaciones correspondientes cuando existan.

Evitar que una actualización desde el frontend pueda modificar arbitrariamente cualquier estado.

Crear un historial inmutable de eventos importantes.

# 5. EXPERIENCIA PARA TÉCNICOS

El panel administrativo no es suficiente.

El técnico necesita una interfaz distinta y simplificada.

Priorizar una PWA responsive para comenzar.

Desde el celular debería poder:

- Iniciar sesión.
- Consultar tareas asignadas.
- Consultar la información necesaria del cliente.
- Ver la dirección.
- Consultar instrucciones.
- Consultar el presupuesto autorizado.
- Iniciar un trabajo.
- Registrar observaciones.
- Adjuntar fotografías.
- Informar materiales utilizados.
- Marcar el trabajo como terminado.
- Solicitar una reprogramación.

La interfaz debe ser rápida y fácil de utilizar con una sola mano.

No mostrar al técnico información financiera confidencial de toda la empresa.

Considerar posteriormente:

- Geolocalización opcional.
- Rutas.
- GPS durante la jornada.
- Firma digital.
- Modo con conectividad limitada.
- Sincronización de cambios.

No implementar seguimiento permanente de ubicación sin necesidad, consentimiento y reglas de privacidad adecuadas.

# 6. AUTOMATIZACIONES: MOTOR PROPIO Y ORQUESTACIÓN

La plataforma necesita un motor de automatización controlado.

n8n puede complementar el sistema, pero no debe ser su núcleo ni reemplazar las reglas de negocio del backend.

## 6.1. Arquitectura sugerida

Los módulos del backend generan eventos.

Esos eventos pueden activar reglas.

Las reglas ejecutan acciones autorizadas.

Las ejecuciones se registran.

El usuario puede revisar qué sucedió.

Evaluar el patrón Transactional Outbox para garantizar que una operación de negocio y la publicación de su evento no queden desincronizadas.

Evaluar una cola de trabajos persistente cuando exista una necesidad real.

No agregar Redis o infraestructura adicional únicamente por anticipación.

## 6.2. Funciones necesarias

- Triggers.
- Condiciones.
- Acciones.
- Retrasos.
- Programaciones.
- Ejecuciones.
- Reintentos.
- Manejo de fallos.
- Protección contra duplicados.
- Logs.
- Historial.
- Pausar y reactivar reglas.

Ejemplo:

TRIGGER: presupuesto enviado.

CONDICIÓN: sigue sin aprobarse luego de 48 horas.

ACCIÓN: preparar un recordatorio.

APROBACIÓN: enviar automáticamente si la regla comercial lo autoriza y existe consentimiento válido.

No programar recordatorios comerciales sin considerar las reglas del canal.

# 7. AGENTES DE INTELIGENCIA ARTIFICIAL

La IA debe integrarse con el producto mediante herramientas explícitas y permisos controlados.

## 7.1. Separar el asistente de la automatización

Una automatización tradicional ejecuta una regla determinista.

Un agente puede interpretar una solicitud, analizar información y seleccionar herramientas disponibles.

No usar un LLM para resolver operaciones que pueden implementarse con lógica determinista.

Ejemplo:

Calcular cuánto dinero debe un cliente debe ser una operación de backend, no una estimación generada por IA.

La IA puede interpretar la pregunta y presentar el resultado.

## 7.2. Herramientas del agente

Ejemplos:

- search_customers
- get_customer_history
- create_customer_draft
- search_work_orders
- get_work_order_details
- create_quote_draft
- get_quote_status
- search_available_slots
- prepare_appointment
- prepare_technician_assignment
- get_business_metrics
- create_automation_draft

Distinguir operaciones de consulta, preparación y ejecución.

## 7.3. Niveles de autorización

Nivel 1: consulta.

Puede consultar datos autorizados.

Nivel 2: preparación.

Puede preparar presupuestos, órdenes y asignaciones sin confirmar operaciones sensibles.

Nivel 3: ejecución autorizada.

Puede ejecutar acciones específicas que el administrador haya habilitado.

Nivel 4: aprobación humana obligatoria.

Exigir confirmación para operaciones sensibles, económicas o irreversibles.

Nunca permitir que un mensaje externo manipule al agente para modificar permisos, exportar datos privados o ejecutar operaciones no autorizadas.

## 7.4. Protección contra prompt injection

Los mensajes de clientes son información no confiable.

Los archivos adjuntos también son información no confiable.

No tratar instrucciones incluidas en esos contenidos como órdenes del sistema.

Aislar las instrucciones internas del producto y los datos externos.

Validar todos los argumentos de herramientas.

Verificar el tenant y los permisos en el backend.

## 7.5. Costos de IA

Implementar:

- Conteo de tokens.
- Registro de proveedor.
- Modelo utilizado.
- Tokens de entrada.
- Tokens de salida.
- Costo estimado.
- Tenant asociado.
- Funcionalidad que generó el consumo.

Establecer cuotas por plan.

Permitir límites configurables.

Evitar que un usuario genere un consumo ilimitado.

No enviar información sensible a proveedores externos sin que se hayan definido las condiciones de tratamiento y privacidad.

## 7.6. Ollama

Utilizar Ollama para desarrollo local cuando sea conveniente.

No asumir que una computadora personal podrá servir de infraestructura productiva.

Crear una interfaz independiente del modelo.

Evaluar modelos según:

- Calidad.
- Latencia.
- Costos.
- Contexto.
- Capacidad de function calling.
- Salidas estructuradas.
- Rendimiento en español.

# 8. WHATSAPP Y OTRAS INTEGRACIONES

Establecer una arquitectura de adaptadores.

No escribir toda la lógica de negocio directamente dentro de los webhooks de WhatsApp.

El proveedor de WhatsApp debería ser reemplazable.

Integraciones futuras posibles:

- WhatsApp Business Platform.
- Correo electrónico.
- Google Calendar.
- Mercado Pago.
- ARCA.
- Formularios web.
- CRM externos.
- Sistemas de inventario.
- Google Maps u otros servicios de mapas.

## Reglas de integración

- Verificar firmas de webhooks.
- Validar eventos.
- Evitar procesar el mismo mensaje dos veces.
- Registrar estados.
- Gestionar errores.
- Reintentar cuando corresponda.
- Mantener secretos separados por tenant.
- Documentar costos.
- Implementar límites de uso.

Los mensajes deben poder identificarse y asociarse a clientes, solicitudes y órdenes.

No depender de WhatsApp como única fuente de información.

La plataforma debe seguir funcionando aunque la integración externa esté temporalmente caída.

# 9. MODELO SAAS REAL

La plataforma debe contar con dos niveles de operación claramente separados.

## 9.1. Aplicación de cada empresa

El usuario administra:

- Clientes.
- Técnicos.
- Órdenes.
- Presupuestos.
- Agenda.
- Automatizaciones.
- Integraciones.
- Facturación comercial propia del servicio prestado por esa empresa.

## 9.2. Panel global del proveedor SaaS

Debe existir un panel exclusivo para el administrador de nuestra plataforma.

Posibles funcionalidades:

- Empresas registradas.
- Empresas activas.
- Planes contratados.
- Suscripciones.
- Estado de pagos.
- Usuarios.
- Consumo de IA.
- Consumo de WhatsApp.
- Almacenamiento.
- Incidentes.
- Errores.
- Tickets de soporte.
- Métricas globales.
- Configuración de planes.

Este panel nunca debe dar acceso indiscriminado a los datos de los clientes.

El acceso de soporte a información de una empresa debe estar justificado, autorizado, limitado y auditado.

# 10. SUSCRIPCIONES Y LIMITACIONES DE PLANES

Diseñar un sistema de planes mediante entitlements.

No codificar límites directamente en distintas partes del frontend.

Los planes deben poder configurarse desde el panel global.

Límites potenciales:

- Usuarios.
- Técnicos.
- Órdenes mensuales.
- Sucursales.
- Almacenamiento.
- Automatizaciones activas.
- Ejecuciones automáticas.
- Consumo de IA.
- Mensajes.
- Integraciones.

No todos los límites necesitan existir en la primera versión.

## Administración de precios

Los precios deberán poder cambiar sin actualizar el código.

Registrar:

- Plan.
- Precio.
- Moneda.
- Periodicidad.
- Fecha de entrada en vigencia.
- Impuestos.
- Descuentos.
- Condiciones.
- Precio promocional.
- Precio regular.

Para Argentina, mantener la posibilidad de actualizar los precios en ARS debido a los cambios económicos.

No asumir que mantener un importe fijo durante años es sostenible.

Guardar el precio contratado en cada suscripción para que un cambio de plan no modifique automáticamente contratos anteriores sin una política explícita.

## Cobro del SaaS

Investigar opciones disponibles en Argentina:

- Mercado Pago.
- Otros proveedores locales de suscripciones.
- Procesadores internacionales cuando resulten viables.

Comparar:

- Suscripciones recurrentes.
- Comisiones.
- Webhooks.
- Reintentos.
- Actualización de medios de pago.
- Cancelaciones.
- Impuestos.
- Disponibilidad.
- Requisitos legales y operativos.

No implementar pagos reales hasta elegir un proveedor y probarlo.

# 11. EXPERIENCIA DE ALTA Y ACTIVACIÓN

El SaaS debe permitir que una empresa empiece a utilizar el sistema rápidamente.

Diseñar un onboarding guiado.

Flujo sugerido:

1. Registro.
2. Verificación de correo.
3. Creación de empresa.
4. Selección de actividad.
5. Configuración inicial.
6. Registro de servicios.
7. Registro de técnicos.
8. Configuración de agenda.
9. Importación de clientes, opcional.
10. Primer trabajo.
11. Primera automatización.

Incluir:

- Datos de ejemplo claramente identificados.
- Tutoriales.
- Ayuda contextual.
- Validaciones.
- Progreso de configuración.
- Posibilidad de saltar pasos no esenciales.

El onboarding debe evitar solicitar demasiada información antes de que el usuario vea valor.

Permitir importación desde CSV y Excel cuando resulte conveniente.

Validar duplicados y ofrecer una vista previa antes de importar.

# 12. SOPORTE Y OPERACIÓN DEL PRODUCTO

Planificar cómo se mantendrá el servicio cuando existan clientes reales.

Implementar gradualmente:

- Logs centralizados.
- Monitoreo de errores.
- Monitoreo de servicios.
- Métricas.
- Alertas.
- Backup automático.
- Restauración probada.
- Gestión de incidentes.
- Versionado de APIs.
- Migraciones controladas.
- Health checks.

Documentar:

- Qué ocurre si PostgreSQL no responde.
- Qué ocurre si WhatsApp deja de funcionar.
- Qué ocurre si un proveedor de IA está caído.
- Qué ocurre si una automatización falla.
- Cómo recuperar una ejecución.
- Cómo restablecer un backup.
- Cómo desactivar una integración comprometida.

No desarrollar un sistema que pierda trabajos si un proveedor externo falla.

# 13. DATOS, PRIVACIDAD Y CUMPLIMIENTO

Además de seguridad técnica, diseñar la protección de información empresarial y personal.

Investigar las obligaciones aplicables en Argentina antes del lanzamiento.

Considerar:

- Ley 25.326.
- Protección de datos personales.
- Derechos de los titulares.
- Consentimiento y finalidades.
- Tratamiento por proveedores.
- Retención.
- Eliminación.
- Exportación.
- Incidentes.
- Contratos.
- Política de privacidad.
- Términos de servicio.

Preparar un esquema de roles de tratamiento de datos entre el proveedor SaaS y cada empresa cliente.

No utilizar información real de clientes para entrenar modelos propios sin una base legal y autorización apropiadas.

Permitir que las empresas puedan exportar sus datos cuando corresponda.

Implementar una política documentada de conservación y eliminación.

Solicitar revisión profesional legal antes del lanzamiento comercial.

# 14. FINANZAS Y UNIT ECONOMICS

Profundizar el modelo de negocio.

No limitarse a calcular ingresos por cantidad de suscripciones.

Crear un modelo económico que incluya:

## Ingresos

- Suscripción.
- Implementación.
- Integraciones.
- Consumo adicional.
- Soporte especial.
- Capacitación.

## Costos variables

- Tokens de IA.
- Mensajes de WhatsApp.
- Almacenamiento.
- Procesamiento.
- Proveedores externos.
- Comisiones de pagos.
- Atención de soporte.

## Costos fijos

- Infraestructura base.
- Dominio.
- Monitoreo.
- Herramientas.
- Mantenimiento.
- Servicios contables y legales.
- Marketing.

Calcular:

- ARPU.
- Costo por cliente.
- Margen bruto.
- CAC.
- LTV.
- Churn.
- MRR.
- ARR.
- Punto de equilibrio.

Distinguir los valores nominales en pesos de las comparaciones reales en moneda constante.

No proyectar crecimiento sin explicitar supuestos.

Preparar escenarios conservador, intermedio y optimista.

Crear:

`docs/UNIT_ECONOMICS.md`

# 15. EXPERIENCIA COMERCIAL Y VENTAS

No esperar a tener un producto perfecto para empezar a aprender de los clientes.

Diseñar un proceso de venta simple:

1. Detectar un negocio potencial.
2. Identificar su problema.
3. Mostrar una demostración.
4. Configurar una cuenta de prueba.
5. Acompañar la implementación.
6. Obtener feedback.
7. Convertirlo en cliente pago si existe valor real.

Preparar posteriormente:

- Landing page.
- Presentación comercial.
- Videos de demostración.
- Casos de uso.
- Comparativa de planes.
- Preguntas frecuentes.
- Canal de soporte.
- Proceso de onboarding.

No prometer características que no estén implementadas.

No usar testimonios ficticios ni logos de clientes sin autorización.

# 16. ALCANCE Y PRIORIDADES: EVITAR SOBRECONSTRUCCIÓN

Establecer una lista explícita de cosas que NO debemos desarrollar inicialmente.

Fuera del MVP inicial:

- Aplicaciones nativas independientes para Android e iOS.
- GPS permanente.
- Optimización avanzada de rutas.
- ERP completo.
- Contabilidad avanzada.
- Facturación fiscal completa.
- Integraciones con todos los proveedores.
- Agentes autónomos sin supervisión.
- Sistema de inventario complejo.
- Marketplace.
- Microservicios.
- Infraestructura distribuida compleja.
- BI avanzado.
- Reportes predictivos.
- Personalización ilimitada por cliente.

No desarrollar estas características antes de validar demanda y costos.

El MVP debe resolver impecablemente el circuito principal del segmento elegido.

# 17. CRITERIOS ADICIONALES DE CALIDAD

Además de los criterios del Prompt Maestro, considerar terminado un módulo cuando:

- Funciona de extremo a extremo.
- Tiene persistencia.
- Está integrado con los permisos.
- Tiene estados coherentes.
- Tiene validaciones.
- Tiene manejo de errores.
- Tiene pruebas.
- Está documentado.
- Tiene una experiencia usable.
- Se comporta correctamente en condiciones normales y de error.

Para integraciones externas:

- Deben probarse con credenciales reales de entorno de pruebas.
- Deben registrarse fallos.
- Deben documentarse las limitaciones.
- Debe quedar claro qué funciona y qué está simulado.

# 18. NUEVA HOJA DE RUTA DE DESARROLLO

Organizar el proyecto mediante hitos.

### HITO 0 — Fundamentos

- Inspección del entorno.
- Auditoría del repositorio.
- Definición del producto.
- Investigación de mercado.
- Entrevistas.
- Decisión del rubro inicial.
- Arquitectura.
- Modelo de datos.
- Identidad provisional.

### HITO 1 — Núcleo operativo

- Autenticación.
- Empresas.
- Multi-tenancy.
- Usuarios y roles.
- Clientes.
- Solicitudes.
- Órdenes.
- Historial.
- Estados.
- Pruebas.

### HITO 2 — Gestión comercial

- Presupuestos.
- PDFs.
- Aprobaciones.
- Agenda.
- Asignaciones.
- Visitas.
- Pagos registrados.
- Dashboard operativo.

### HITO 3 — Experiencia móvil

- PWA.
- Perfil técnico.
- Órdenes asignadas.
- Fotografías.
- Actividades.
- Cierre de trabajos.

### HITO 4 — Automatizaciones

- Eventos.
- Motor de reglas.
- Webhooks.
- Notificaciones.
- Recordatorios.
- Seguimiento comercial.

### HITO 5 — Comunicación

- Integración oficial de WhatsApp.
- Recepción de consultas.
- Conversaciones.
- Mensajes.
- Plantillas.
- Estados y errores.

### HITO 6 — Inteligencia artificial

- Asistente administrativo.
- Consultas sobre datos.
- Herramientas.
- Borradores.
- Confirmación de operaciones.
- Cuotas y medición de costos.

### HITO 7 — Comercialización

- Suscripciones.
- Planes.
- Entitlements.
- Onboarding.
- Soporte.
- Administración global.
- Landing page.
- Primeros clientes pagos.

### HITO 8 — Expansión

- Talleres.
- Inventario.
- Mantenimiento preventivo.
- GPS.
- Rutas.
- Integraciones.
- Reportes avanzados.

Los hitos pueden solaparse cuando sea útil, pero no saltar fundamentos críticos.

# 19. NUEVOS DOCUMENTOS DEL REPOSITORIO

Además de los documentos definidos en el Prompt Maestro, incorporar:

```text
docs/
├── BRAND_STRATEGY.md
├── CUSTOMER_RESEARCH.md
├── BUSINESS_MODEL.md
├── UNIT_ECONOMICS.md
├── USER_FLOWS.md
├── AUTOMATION_ENGINE.md
├── AI_AGENT_DESIGN.md
├── WHATSAPP_INTEGRATION.md
├── SAAS_BILLING.md
├── TENANT_SECURITY.md
├── OPERATIONS.md
├── ONBOARDING.md
├── SUPPORT_POLICY.md
└── LAUNCH_PLAN.md
```

No crear documentos vacíos. Cada archivo debe contener decisiones y especificaciones útiles.

# 20. PROTOCOLO DE ACTUALIZACIÓN DEL CONTEXTO

Mantener un conjunto de archivos que permitan que otro agente pueda continuar el proyecto sin perder el contexto.

Crear o mantener:

- `AGENTS.md`: instrucciones permanentes para agentes de código.
- `docs/PROJECT_STATUS.md`: estado real del desarrollo.
- `docs/DECISIONS.md`: decisiones y justificaciones.
- `docs/ROADMAP.md`: tareas y prioridades.
- `docs/KNOWN_ISSUES.md`: problemas conocidos.
- `docs/CHANGELOG.md`: cambios importantes.

Actualizar PROJECT_STATUS.md al terminar cada sesión significativa.

Nunca describir como implementado algo que solamente está planificado.

Registrar explícitamente las hipótesis todavía no validadas.

Evitar que la documentación se contradiga.

Si una nueva decisión reemplaza una anterior, indicar cuál quedó obsoleta y por qué.

# 21. INSTRUCCIONES DE CONTINUACIÓN

Al recibir este anexo:

1. Leer también el Prompt Maestro original.
2. Leer los archivos del repositorio.
3. Incorporar las nuevas decisiones.
4. Detectar contradicciones.
5. Actualizar la documentación.
6. No cambiar arbitrariamente el alcance original.
7. No dar por elegido un nombre comercial.
8. No dar por elegido definitivamente el segmento inicial.
9. No construir todas las etapas a la vez.
10. Continuar desde el estado real del proyecto.

Si ya existe una implementación, no reiniciarla automáticamente.

Evaluar qué está hecho, qué funciona y qué debe corregirse.

Priorizar el siguiente entregable funcional más importante.

# INSTRUCCIÓN FINAL

Construimos una empresa de software, no solamente una aplicación.

Cada decisión de arquitectura debe considerar:

- El usuario.
- El cliente.
- El costo.
- La seguridad.
- La experiencia.
- El mantenimiento.
- La posibilidad de comercializar.
- La rentabilidad.

No perseguir complejidad tecnológica innecesaria.

No agregar IA donde una regla determinista sea mejor.

No agregar automatizaciones que generen riesgos o costos sin control.

No construir módulos que no tengan una necesidad comercial identificada.

El éxito del proyecto depende de resolver problemas reales, conseguir usuarios que lo utilicen y construir un negocio capaz de sostenerse económicamente.

Continuá trabajando sobre el repositorio existente y documentá cada avance.