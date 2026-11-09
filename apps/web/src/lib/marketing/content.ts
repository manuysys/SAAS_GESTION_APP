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
    detail: "Los técnicos la usan desde el navegador del celular.",
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
    text: "Llega por teléfono, mail o formulario. Queda registrada en segundos, con datos y dirección del cliente.",
  },
  {
    id: "solicitud",
    title: "Solicitud",
    text: "Se convierte en solicitud para revisar en la oficina antes de comprometer una fecha.",
  },
  {
    id: "orden",
    title: "Orden de trabajo",
    text: "Se crea la orden, se asigna un técnico y el horario se valida contra la agenda.",
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
    text: "Se registra el cobro total o parcial, y el saldo pendiente queda visible para todo el equipo.",
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
    title: "App para técnicos sin instalar",
    text: "Agenda del día, fotos, materiales y cierre de visita desde el navegador.",
  },
  {
    id: "payments",
    title: "Pagos y saldo",
    text: "Cobros totales o parciales, con saldo pendiente siempre visible.",
  },
  {
    id: "automations",
    title: "Automatizaciones",
    text: "Reglas por evento que avisan al equipo cuando algo cambia en una orden.",
  },
  {
    id: "ai",
    title: "Asistente con datos reales",
    text: "Responde con el estado de tu negocio. No ejecuta acciones ni escribe SQL.",
  },
  {
    id: "whatsapp",
    title: "WhatsApp Business oficial",
    text: "Integración con WhatsApp Cloud API de Meta, para avisos y mensajes del negocio.",
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

export const faqItems = [
  {
    question: "¿Los técnicos tienen que instalar una app?",
    answer:
      "No. La experiencia para técnicos es una PWA: se abre desde el navegador del celular y se puede agregar a la pantalla de inicio. Funciona en Android y iPhone.",
  },
  {
    question: "¿El cliente necesita cuenta para aprobar un presupuesto?",
    answer:
      "No. Cada presupuesto tiene un link público con un token aleatorio. Ese link funciona como un secreto: quien lo tenga puede verlo, así que conviene compartirlo solo con el cliente.",
  },
  {
    question: "¿Cómo se separan los datos de cada empresa?",
    answer:
      "Cada empresa opera en su propio espacio. El backend valida la pertenencia a la empresa en cada operación, y no confía en datos enviados desde el navegador.",
  },
  {
    question: "¿WhatsApp ya está disponible?",
    answer:
      "La integración usa la API oficial WhatsApp Cloud API de Meta y requiere credenciales de Meta para activarse. Hoy se configura por empresa; no se simulan envíos.",
  },
  {
    question: "¿La IA envía datos de mi empresa a terceros?",
    answer:
      "El asistente puede funcionar con un proveedor determinista local o con un proveedor externo configurado (hoy Groq). La app muestra qué proveedor está activo y registra el consumo por empresa. No ejecuta acciones ni escribe SQL.",
  },
  {
    question: "¿Cuánto cuesta y hay prueba gratis?",
    answer:
      "Los precios son de lanzamiento, en ARS por mes. La prueba gratuita de 14 días está en implementación: hoy el registro crea una suscripción en prueba y todavía no se cobra.",
  },
] as const;

export const pricingCopy = {
  title: "Precios de lanzamiento",
  description:
    "Montos en pesos argentinos por mes. La prueba gratuita de 14 días está en implementación; hoy el registro crea una suscripción en prueba y todavía no se cobra.",
  included: "Incluido en todos los planes",
} as const;

/** Cifras del producto (conteos de contenido), no métricas de clientes. */
export const productStats = [
  { value: journeySteps.length, label: "etapas", detail: "Del primer llamado al cobro" },
  { value: featureCards.length, label: "módulos", detail: "Con los mismos datos" },
  { value: tourTabs.length, label: "pantallas", detail: "Recorridas en esta página" },
  { value: plans.length, label: "planes", detail: "De lanzamiento, en ARS" },
] as const;
