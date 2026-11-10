/*
 * Dataset único de la landing: una operación de ejemplo con un cliente, un
 * técnico, tres órdenes, dos presupuestos, un cobro parcial y dos turnos.
 * Hero, mockups, recorrido y pagos leen de acá, así ninguna pieza contradice a
 * otra. Todos los datos son ficticios. Fechas ISO (AAAA-MM-DD); importes en ARS
 * enteros. Las reglas de integridad están en demo-data.test.ts.
 */

/** Fecha "hoy" de la operación de ejemplo. */
export const DEMO_REFERENCE_DATE = "2026-11-09";

export type DemoOrderStatus = "pendiente" | "agendada" | "en_curso";
export type DemoQuoteStatus = "enviado" | "aprobado";

export type DemoCustomer = {
  readonly id: string;
  readonly name: string;
  readonly initials: string;
  readonly zone: string;
  readonly address: string;
  readonly equipment: readonly string[];
};

export type DemoTechnician = {
  readonly id: string;
  readonly firstName: string;
  readonly fullName: string;
};

export type DemoOrder = {
  readonly id: string;
  readonly title: string;
  readonly customerId: string;
  readonly technicianId: string | null;
  readonly status: DemoOrderStatus;
  readonly createdOn: string;
  readonly quoteId: string | null;
};

export type DemoQuoteItem = {
  readonly description: string;
  readonly amount: number;
};

/** Copia histórica: el total se guarda junto a los ítems, como en el producto real. */
export type DemoQuote = {
  readonly id: string;
  readonly orderId: string;
  readonly status: DemoQuoteStatus;
  readonly sentOn: string;
  readonly approvedOn: string | null;
  readonly items: readonly DemoQuoteItem[];
  readonly total: number;
};

export type DemoPayment = {
  readonly id: string;
  readonly orderId: string;
  readonly quoteId: string;
  readonly amount: number;
  readonly method: string;
  readonly paidOn: string;
};

export type DemoAppointment = {
  readonly id: string;
  readonly orderId: string;
  readonly technicianId: string;
  readonly date: string;
  /** Hora de inicio y fin en formato HH:MM, hora argentina. */
  readonly startTime: string;
  readonly endTime: string;
};

export type DemoOperation = {
  readonly referenceDate: string;
  readonly customers: readonly DemoCustomer[];
  readonly technicians: readonly DemoTechnician[];
  readonly orders: readonly DemoOrder[];
  readonly quotes: readonly DemoQuote[];
  readonly payments: readonly DemoPayment[];
  readonly appointments: readonly DemoAppointment[];
};

export const demoOperation: DemoOperation = {
  referenceDate: DEMO_REFERENCE_DATE,
  customers: [
    {
      id: "cli-laura-gomez",
      name: "Laura Gómez",
      initials: "LG",
      zone: "Zona norte",
      address: "Av. Ejemplo 1234, piso 2",
      equipment: ["A/C split", "Caldera mural"],
    },
  ],
  technicians: [{ id: "tec-martin-ruiz", firstName: "Martín", fullName: "Martín Ruiz" }],
  orders: [
    {
      id: "OT-2026-0001",
      title: "Instalación de A/C split",
      customerId: "cli-laura-gomez",
      technicianId: "tec-martin-ruiz",
      status: "en_curso",
      createdOn: "2026-11-06",
      quoteId: "QT-2026-0001",
    },
    {
      id: "OT-2026-0002",
      title: "Revisión de caldera",
      customerId: "cli-laura-gomez",
      technicianId: null,
      status: "pendiente",
      createdOn: "2026-11-07",
      quoteId: "QT-2026-0002",
    },
    {
      id: "OT-2026-0003",
      title: "Cambio de cañería",
      customerId: "cli-laura-gomez",
      technicianId: "tec-martin-ruiz",
      status: "agendada",
      createdOn: "2026-11-08",
      quoteId: null,
    },
  ],
  quotes: [
    {
      id: "QT-2026-0001",
      orderId: "OT-2026-0001",
      status: "aprobado",
      sentOn: "2026-11-06",
      approvedOn: "2026-11-08",
      items: [
        { description: "Mano de obra de instalación", amount: 45_000 },
        { description: "Kit de instalación y cañería", amount: 38_500 },
        { description: "Soporte y materiales", amount: 12_000 },
      ],
      total: 95_500,
    },
    {
      id: "QT-2026-0002",
      orderId: "OT-2026-0002",
      status: "enviado",
      sentOn: "2026-11-07",
      approvedOn: null,
      items: [
        { description: "Mano de obra de revisión", amount: 42_000 },
        { description: "Válvula de seguridad", amount: 28_500 },
        { description: "Gas y materiales", amount: 9_000 },
      ],
      total: 79_500,
    },
  ],
  payments: [
    {
      id: "PG-2026-0001",
      orderId: "OT-2026-0001",
      quoteId: "QT-2026-0001",
      amount: 50_000,
      method: "Transferencia",
      paidOn: "2026-11-08",
    },
  ],
  appointments: [
    {
      id: "TU-2026-0001",
      orderId: "OT-2026-0001",
      technicianId: "tec-martin-ruiz",
      date: "2026-11-09",
      startTime: "08:30",
      endTime: "11:00",
    },
    {
      id: "TU-2026-0002",
      orderId: "OT-2026-0003",
      technicianId: "tec-martin-ruiz",
      date: "2026-11-09",
      startTime: "15:00",
      endTime: "17:00",
    },
  ],
};

/** Atajos a los registros que usan los mockups. Deben existir (ver tests). */
export const demoRefs = {
  customerId: "cli-laura-gomez",
  technicianId: "tec-martin-ruiz",
  activeOrderId: "OT-2026-0001",
  pendingOrderId: "OT-2026-0002",
  scheduledOrderId: "OT-2026-0003",
  approvedQuoteId: "QT-2026-0001",
  pendingQuoteId: "QT-2026-0002",
  paymentId: "PG-2026-0001",
} as const;

/** Franja horaria visible en la agenda de ejemplo, en minutos desde medianoche. */
export const AGENDA_DAY_MINUTES = { start: 8 * 60, end: 18 * 60 } as const;

/** Convierte "HH:MM" a minutos desde medianoche. */
export function timeToMinutes(time: string): number {
  const [hours = 0, minutes = 0] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export const orderStatusLabel: Record<DemoOrderStatus, string> = {
  pendiente: "Pendiente",
  agendada: "Agendada",
  en_curso: "En curso",
};

export const quoteStatusLabel: Record<DemoQuoteStatus, string> = {
  enviado: "Enviado",
  aprobado: "Aprobado",
};

const DAY_MS = 86_400_000;

/** Días enteros entre dos fechas ISO (to - from). */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

function findById<T extends { readonly id: string }>(
  items: readonly T[],
  id: string,
  kind: string,
) {
  const found = items.find((item) => item.id === id);
  if (!found) throw new Error(`Dataset demo: no existe ${kind} "${id}"`);
  return found;
}

export function getCustomer(id: string) {
  return findById(demoOperation.customers, id, "cliente");
}

export function getTechnician(id: string) {
  return findById(demoOperation.technicians, id, "técnico");
}

export function getOrder(id: string) {
  return findById(demoOperation.orders, id, "orden");
}

export function getQuote(id: string) {
  return findById(demoOperation.quotes, id, "presupuesto");
}

export function getQuoteTotalPaid(quoteId: string): number {
  return demoOperation.payments
    .filter((payment) => payment.quoteId === quoteId)
    .reduce((sum, payment) => sum + payment.amount, 0);
}

export function getQuoteBalance(quoteId: string): number {
  return getQuote(quoteId).total - getQuoteTotalPaid(quoteId);
}

/** Indicadores del panel de ejemplo, calculados desde el dataset. */
export function getDemoSummary() {
  const ordersToday = new Set(
    demoOperation.appointments
      .filter((appointment) => appointment.date === demoOperation.referenceDate)
      .map((appointment) => appointment.orderId),
  );
  const approvedQuotes = demoOperation.quotes.filter((quote) => quote.status === "aprobado");

  return {
    ordersToday: ordersToday.size,
    quotesAwaitingResponse: demoOperation.quotes.filter((quote) => quote.status === "enviado")
      .length,
    /** Saldo pendiente de presupuestos aprobados (no suma presupuestos sin aceptar). */
    pendingBalance: approvedQuotes.reduce((sum, quote) => sum + getQuoteBalance(quote.id), 0),
  };
}
