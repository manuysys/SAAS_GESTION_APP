import { brand, plans } from "@/lib/brand";

/** Cuenta de demo pública (ver docs/DEMO.md). Datos de ejemplo, no reales. */
export const demoAccount = {
  email: "demo@saasgestion.com",
  password: "Demo12345!",
} as const;

export const navLinks = [
  { href: "#producto", label: "Producto" },
  { href: "#funciones", label: "Funciones" },
  { href: "#precios", label: "Precios" },
  { href: "#demo", label: "Demo" },
] as const;

export const heroCopy = {
  eyebrow: "Software para servicios técnicos a domicilio",
  title: "Del primer llamado al último cobro,",
  titleAccent: "todo en orden.",
  description: brand.description,
} as const;

/** Frases de la franja animada. Describen funciones, no clientes ni resultados. */
export const marqueeItems = [
  "Órdenes de trabajo",
  "Presupuestos con link público",
  "Agenda y asignación de técnicos",
  "PWA sin instalación",
  "Cobros y saldo pendiente",
  "Automatizaciones",
  "Asistente con datos reales",
] as const;

export const trustItems = [
  {
    id: "pwa",
    label: "PWA sin instalación",
    detail: "Se usa desde el navegador del celular; agregarla a la pantalla de inicio es opcional.",
  },
  {
    id: "ars",
    label: "Precios en ARS",
    detail: "Planes y cobros expresados en pesos argentinos.",
  },
  {
    id: "public-link",
    label: "Aprobación pública por link",
    detail: "El cliente aprueba el presupuesto sin crear cuenta.",
  },
  {
    id: "ar",
    label: "Hecho para Argentina",
    detail: "Español argentino, zona horaria y formatos locales.",
  },
] as const;

export const journeySteps = [
  {
    id: "consulta",
    title: "Consulta",
    text: "Se registra en la oficina en segundos, con los datos y la dirección del cliente.",
  },
  {
    id: "solicitud",
    title: "Solicitud",
    text: "Se convierte en solicitud para revisar en la oficina antes de comprometer una fecha.",
  },
  {
    id: "orden",
    title: "Orden de trabajo",
    text: "Se crea la orden, se asigna un técnico y el turno se controla contra la agenda para detectar solapamientos.",
  },
  {
    id: "presupuesto",
    title: "Presupuesto",
    text: "Ítems y precios se guardan como copia histórica, aunque el catálogo cambie después.",
  },
  {
    id: "aprobacion",
    title: "Aprobación",
    text: "El cliente aprueba o rechaza desde un link público, sin crear una cuenta.",
  },
  {
    id: "visita",
    title: "Visita",
    text: "El técnico ve su agenda y registra notas, materiales y fotos desde el celular.",
  },
  {
    id: "cobro",
    title: "Pago",
    text: "Se registra el cobro total o parcial. El saldo pendiente queda visible en la orden.",
  },
] as const;

export const featureCards = [
  {
    id: "clients",
    title: "Clientes e historial",
    text: "Datos de contacto, direcciones y todas las visitas en una sola ficha.",
  },
  {
    id: "orders",
    title: "Órdenes de trabajo",
    text: "Estados claros, historial de cambios y auditoría de cada transición.",
  },
  {
    id: "quotes",
    title: "Presupuestos con link público",
    text: "Ítems con precio histórico y aprobación desde el celular del cliente.",
  },
  {
    id: "agenda",
    title: "Agenda y técnicos",
    text: "Asigná visitas y detectá solapamientos antes de confirmar el horario.",
  },
  {
    id: "pwa",
    title: "Técnicos desde el celular",
    text: "Agenda del día, fotos, materiales y cierre de visita desde el navegador. Sin tienda de apps.",
  },
  {
    id: "payments",
    title: "Pagos y saldo",
    text: "Cobros totales o parciales, con saldo pendiente siempre visible.",
  },
  {
    id: "automations",
    title: "Automatizaciones",
    text: "Reglas por evento que avisan al equipo, por ejemplo cuando se aprueba un presupuesto. Las notificaciones se muestran dentro de la app.",
  },
  {
    id: "ai",
    title: "Asistente con datos reales",
    text: "Consulta los datos de tu negocio para responder. No ejecuta acciones ni escribe SQL.",
  },
  {
    id: "whatsapp",
    title: "WhatsApp Business oficial",
    text: "Integración con WhatsApp Cloud API de Meta para avisos y mensajes del negocio. Sin credenciales, no se envía nada.",
    badge: "Requiere credenciales de Meta",
  },
] as const;

export const tourTabs = [
  {
    id: "panel",
    label: "Panel",
    title: "Lo que pasa hoy, en una pantalla.",
    text: "El dueño y la oficina ven órdenes, presupuestos y cobros pendientes sin abrir planillas.",
    bullets: [
      "Órdenes del día y técnicos asignados",
      "Presupuestos pendientes de respuesta",
      "Saldo pendiente de cobro",
    ],
  },
  {
    id: "orders",
    label: "Órdenes",
    title: "Del pedido al cierre, con responsables.",
    text: "Cada orden tiene estado, técnico, materiales y adjuntos. Cada cambio queda registrado.",
    bullets: [
      "Transiciones de estado válidas según el flujo",
      "Historial con actor y fecha",
      "Materiales y fotos asociados a la orden",
    ],
  },
  {
    id: "quote",
    label: "Presupuesto público",
    title: "El cliente lo ve y lo aprueba desde un link.",
    text: "El enlace no requiere login. La aprobación actualiza la orden automáticamente.",
    bullets: [
      "Sin cuenta ni contraseña para el cliente",
      "Ítems y totales en ARS",
      "Estado sincronizado con la orden de trabajo",
    ],
  },
  {
    id: "tech",
    label: "PWA técnico",
    title: "La agenda del día, en el bolsillo del técnico.",
    text: "Se agrega a la pantalla de inicio. Si se corta la conexión, muestra el shell y una pantalla offline; los datos se actualizan al volver.",
    bullets: [
      "Se usa desde el navegador, sin tienda de aplicaciones",
      "Cierre de visita con notas y materiales",
      "Fotos con validación de tipo y tamaño",
    ],
  },
] as const;

export type TourTabId = (typeof tourTabs)[number]["id"];

/** Respuestas breves y verificables contra el comportamiento actual de la plataforma. */
export const faqItems = [
  {
    question: "¿Los técnicos tienen que instalar una app?",
    answer:
      "No. Usan la PWA desde el navegador del celular. Pueden agregarla a la pantalla de inicio; el paso exacto depende del sistema operativo y del navegador.",
  },
  {
    question: "¿El cliente necesita cuenta para aprobar un presupuesto?",
    answer:
      "No. Cada presupuesto tiene un link público con un token aleatorio. Quien tiene el link puede verlo y aprobarlo, así que conviene compartirlo solo con el cliente.",
  },
  {
    question: "¿Cómo se protegen mis datos?",
    answer:
      "Cada empresa opera en su propio espacio y el backend valida la pertenencia en cada operación. Las contraseñas se guardan con Argon2id, las sesiones usan cookies HttpOnly con tokens de corta duración y las acciones importantes quedan auditadas. La política de privacidad es un borrador en revisión legal; la región de alojamiento y los plazos de backups todavía no están definidos.",
  },
  {
    question: "¿Cómo funciona el asistente de IA y qué datos envía?",
    answer:
      "Consulta los datos de tu empresa para responder, pero no ejecuta acciones ni escribe SQL. Con el modo local, los datos no salen de la plataforma. Con un proveedor externo (hoy Groq) se envía un resumen: nombres de clientes, números y montos de presupuestos, títulos y estados de órdenes, técnicos del día y saldo pendiente. No se envían contraseñas ni direcciones.",
  },
  {
    question: "¿Qué pasa cuando consumo mi cuota de IA?",
    answer:
      "Cada empresa tiene un límite mensual de tokens del asistente, que hoy es igual en todos los planes. Al alcanzarlo, el asistente deja de responder hasta el mes siguiente. Si se agota solo la cuota del proveedor externo, responde en modo local y lo indica. El resto de la plataforma no se ve afectado.",
  },
  {
    question: "¿Qué necesito para conectar WhatsApp?",
    answer:
      "Una cuenta de WhatsApp Business y credenciales de la API oficial de Meta (WhatsApp Cloud API), que se cargan por empresa. Sin credenciales no se envía ningún mensaje y el resto de la plataforma funciona igual. Los mensajes que inicia el negocio pueden requerir plantillas aprobadas por Meta. Todavía no probamos el flujo completo con un número real.",
  },
  {
    question: "¿Cuánto cuesta y hay prueba gratis?",
    answer:
      "Los precios son de lanzamiento, en ARS por mes. La prueba gratuita de 14 días está en implementación. Hoy no se cobra al registrarse, y los medios de pago y la facturación se informarán antes de cualquier cobro.",
  },
  {
    question: "¿Puedo cambiar de plan?",
    answer:
      "Sí, desde Facturación podés cambiar de plan. Como todavía no hay cobros, el cambio no genera cargos.",
  },
  {
    question: "¿Puedo cancelar?",
    answer:
      "Hoy no se cobra, así que no hay cargos que cancelar. Todavía no existe un flujo de cancelación de suscripción en la app; se definirá antes del primer cobro.",
  },
  {
    question: "¿Puedo exportar mi información?",
    answer:
      "Podés descargar el PDF de cada presupuesto. La exportación completa de clientes, órdenes y pagos (por ejemplo, en CSV) todavía no está disponible.",
  },
  {
    question: "¿Tengo soporte?",
    answer: `Podés escribirnos a ${brand.email}. Todavía no definimos tiempos de respuesta ni un canal de soporte formal.`,
  },
] as const;

export const pricingCopy = {
  title: "Precios de lanzamiento",
  description:
    "Montos en pesos argentinos por mes. La prueba gratuita de 14 días está en implementación. Hoy no se cobra al registrarse.",
  limitsNote:
    "Los límites por plan todavía no se aplican en toda la plataforma. Hoy el límite mensual del asistente de IA es el mismo para todas las empresas.",
  included: "Incluido en todos los planes",
} as const;

/** Cifras del producto (conteos de contenido), no métricas de clientes. */
export const productStats = [
  { value: journeySteps.length, label: "etapas", detail: "Del primer llamado al cobro" },
  { value: featureCards.length, label: "módulos", detail: "Con los mismos datos" },
  { value: tourTabs.length, label: "pantallas", detail: "Recorridas en esta página" },
  { value: plans.length, label: "planes", detail: "De lanzamiento, en ARS" },
] as const;
