/**
 * Identidad centralizada. DOVEXO es el nombre comercial del producto y ARVOKTA la
 * empresa titular. El dominio propio está pendiente: no se inventa aquí; la URL
 * pública actual es la del despliegue en Vercel.
 */
export const brand = {
  name: "DOVEXO",
  legalName: "ARVOKTA",
  company: "ARVOKTA",
  tagline: "Gestión para empresas de servicios técnicos.",
  description:
    "Recibí solicitudes, asigná técnicos, enviá presupuestos y cobrá. Todo en un solo lugar, desde la oficina o el celular.",
  /** URL pública vigente. Cambiar cuando el dominio propio esté confirmado. */
  appUrl: "https://saas-gestion-web.vercel.app",
  /** Dominio propio: pendiente de confirmar. No usar para enlaces ni emails. */
  domain: null,
  /** Pendiente de activación cuando ARVOKTA tenga dominio y buzón. */
  email: "hola@arvokta.com",
  colors: {
    ink: "#0B1F33",
    teal: "#0F766E",
    amber: "#F59E0B",
    paper: "#F7F5F0",
    mist: "#E7E2D8",
    slate: "#5B6B7A",
  },
} as const;

export type Plan = {
  code: "starter" | "professional" | "business";
  name: string;
  priceArs: number;
  tagline: string;
  limits: {
    users: number;
    technicians: number;
    ordersPerMonth: number;
    aiTokens: number;
  };
};

export const plans: Plan[] = [
  {
    code: "starter",
    name: "Starter",
    priceArs: 29_900,
    tagline: "Para el técnico que trabaja solo y quiere dejar las planillas.",
    limits: { users: 1, technicians: 1, ordersPerMonth: 100, aiTokens: 50_000 },
  },
  {
    code: "professional",
    name: "Professional",
    priceArs: 59_900,
    tagline: "Para empresas con equipo en la calle y oficina coordinando.",
    limits: { users: 5, technicians: 5, ordersPerMonth: 1_000, aiTokens: 200_000 },
  },
  {
    code: "business",
    name: "Business",
    priceArs: 99_900,
    tagline: "Para operaciones más grandes que necesitan escala y control.",
    limits: { users: 20, technicians: 20, ordersPerMonth: 10_000, aiTokens: 1_000_000 },
  },
];

export const planFeatures = [
  "Clientes e historial",
  "Solicitudes y órdenes",
  "Presupuestos con link público",
  "Agenda y asignación de técnicos",
  "PWA para técnicos, sin instalar app",
  "Pagos y saldo pendiente",
  "Automatizaciones y notificaciones",
  "Asistente de IA con datos reales",
] as const;
