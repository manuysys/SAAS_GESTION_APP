import { describe, expect, it } from "vitest";

import {
  AGENDA_DAY_MINUTES,
  DEMO_REFERENCE_DATE,
  daysBetween,
  demoOperation,
  demoRefs,
  getDemoSummary,
  getQuote,
  getQuoteBalance,
  getQuoteTotalPaid,
  timeToMinutes,
} from "./demo-data";

const { customers, technicians, orders, quotes, payments, appointments } = demoOperation;

function ids(items: readonly { readonly id: string }[]) {
  return items.map((item) => item.id);
}

function hasDuplicates(values: readonly string[]) {
  return new Set(values).size !== values.length;
}

const minutes = timeToMinutes;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;

describe("demo dataset: identificadores", () => {
  it("no repite IDs dentro de cada entidad", () => {
    expect(hasDuplicates(ids(customers))).toBe(false);
    expect(hasDuplicates(ids(technicians))).toBe(false);
    expect(hasDuplicates(ids(orders))).toBe(false);
    expect(hasDuplicates(ids(quotes))).toBe(false);
    expect(hasDuplicates(ids(payments))).toBe(false);
    expect(hasDuplicates(ids(appointments))).toBe(false);
  });

  it("usa códigos con formato de la plataforma", () => {
    for (const order of orders) expect(order.id).toMatch(/^OT-\d{4}-\d{4}$/);
    for (const quote of quotes) expect(quote.id).toMatch(/^QT-\d{4}-\d{4}$/);
  });

  it("no reutiliza el mismo código de orden en distintos registros", () => {
    const orderCodes = new Set(orders.map((order) => order.id));
    for (const quote of quotes) expect(orderCodes.has(quote.id)).toBe(false);
  });
});

describe("demo dataset: relaciones", () => {
  it("toda orden apunta a un cliente existente", () => {
    const customerIds = new Set(ids(customers));
    for (const order of orders) expect(customerIds.has(order.customerId)).toBe(true);
  });

  it("toda orden asignada apunta a un técnico existente", () => {
    const technicianIds = new Set(ids(technicians));
    for (const order of orders) {
      if (order.technicianId !== null) {
        expect(technicianIds.has(order.technicianId)).toBe(true);
      }
    }
  });

  it("el vínculo orden-presupuesto es bidireccional", () => {
    for (const order of orders) {
      if (order.quoteId === null) continue;
      const quote = getQuote(order.quoteId);
      expect(quote.orderId).toBe(order.id);
    }
    for (const quote of quotes) {
      const order = orders.find((item) => item.id === quote.orderId);
      expect(order?.quoteId).toBe(quote.id);
    }
  });

  it("cada cobro referencia un presupuesto y una orden coherentes", () => {
    for (const payment of payments) {
      const quote = getQuote(payment.quoteId);
      expect(quote.orderId).toBe(payment.orderId);
    }
  });

  it("cada turno referencia una orden y un técnico existentes, y coincide con la orden", () => {
    const technicianIds = new Set(ids(technicians));
    for (const appointment of appointments) {
      const order = orders.find((item) => item.id === appointment.orderId);
      expect(order).toBeDefined();
      expect(technicianIds.has(appointment.technicianId)).toBe(true);
      expect(order?.technicianId).toBe(appointment.technicianId);
    }
  });
});

describe("demo dataset: estados", () => {
  it("una orden pendiente no tiene técnico ni turno", () => {
    for (const order of orders.filter((item) => item.status === "pendiente")) {
      expect(order.technicianId).toBeNull();
      expect(appointments.some((item) => item.orderId === order.id)).toBe(false);
    }
  });

  it("una orden agendada o en curso tiene técnico y al menos un turno", () => {
    for (const order of orders.filter((item) => item.status !== "pendiente")) {
      expect(order.technicianId).not.toBeNull();
      expect(appointments.some((item) => item.orderId === order.id)).toBe(true);
    }
  });

  it("el presupuesto aprobado solo corresponde a órdenes que ya no están pendientes", () => {
    for (const order of orders) {
      if (order.quoteId === null) continue;
      const quote = getQuote(order.quoteId);
      if (order.status === "pendiente") {
        expect(quote.status).toBe("enviado");
      } else {
        expect(quote.status).toBe("aprobado");
      }
    }
  });

  it("solo se cobra sobre presupuestos aprobados", () => {
    for (const payment of payments) {
      expect(getQuote(payment.quoteId).status).toBe("aprobado");
    }
  });

  it("no hay turnos superpuestos para el mismo técnico", () => {
    const byTechnicianAndDay = new Map<string, { start: number; end: number }[]>();
    for (const appointment of appointments) {
      const key = `${appointment.technicianId}|${appointment.date}`;
      const list = byTechnicianAndDay.get(key) ?? [];
      list.push({ start: minutes(appointment.startTime), end: minutes(appointment.endTime) });
      byTechnicianAndDay.set(key, list);
    }
    for (const slots of byTechnicianAndDay.values()) {
      const sorted = [...slots].sort((a, b) => a.start - b.start);
      for (let index = 1; index < sorted.length; index += 1) {
        const previous = sorted[index - 1];
        const current = sorted[index];
        if (!previous || !current) continue;
        expect(current.start).toBeGreaterThanOrEqual(previous.end);
      }
    }
  });
});

describe("demo dataset: fechas", () => {
  it("todas las fechas son ISO válidas", () => {
    const dates = [
      DEMO_REFERENCE_DATE,
      ...orders.map((order) => order.createdOn),
      ...quotes.map((quote) => quote.sentOn),
      ...quotes.flatMap((quote) => (quote.approvedOn ? [quote.approvedOn] : [])),
      ...payments.map((payment) => payment.paidOn),
      ...appointments.map((appointment) => appointment.date),
    ];
    for (const date of dates) {
      expect(date).toMatch(ISO_DATE);
      expect(Number.isNaN(Date.parse(`${date}T00:00:00Z`))).toBe(false);
    }
  });

  it("el flujo de fechas va de la orden al presupuesto, la aprobación y el cobro", () => {
    for (const order of orders) {
      if (order.quoteId === null) continue;
      const quote = getQuote(order.quoteId);
      expect(daysBetween(order.createdOn, quote.sentOn)).toBeGreaterThanOrEqual(0);
      if (quote.approvedOn !== null) {
        expect(daysBetween(quote.sentOn, quote.approvedOn)).toBeGreaterThanOrEqual(0);
      }
    }
    for (const payment of payments) {
      const quote = getQuote(payment.quoteId);
      expect(quote.approvedOn).not.toBeNull();
      expect(
        daysBetween(quote.approvedOn ?? payment.paidOn, payment.paidOn),
      ).toBeGreaterThanOrEqual(0);
    }
  });

  it("ningún hecho ocurre después de la fecha de referencia", () => {
    for (const order of orders) {
      expect(daysBetween(order.createdOn, DEMO_REFERENCE_DATE)).toBeGreaterThanOrEqual(0);
    }
    for (const quote of quotes) {
      expect(daysBetween(quote.sentOn, DEMO_REFERENCE_DATE)).toBeGreaterThanOrEqual(0);
      if (quote.approvedOn !== null) {
        expect(daysBetween(quote.approvedOn, DEMO_REFERENCE_DATE)).toBeGreaterThanOrEqual(0);
      }
    }
    for (const payment of payments) {
      expect(daysBetween(payment.paidOn, DEMO_REFERENCE_DATE)).toBeGreaterThanOrEqual(0);
    }
  });

  it("los turnos son posteriores a la creación de su orden y tienen horario válido", () => {
    for (const appointment of appointments) {
      expect(appointment.startTime).toMatch(TIME);
      expect(appointment.endTime).toMatch(TIME);
      expect(minutes(appointment.startTime)).toBeLessThan(minutes(appointment.endTime));
      // Franja de la agenda de ejemplo: 08:00 a 18:00.
      expect(minutes(appointment.startTime)).toBeGreaterThanOrEqual(8 * 60);
      expect(minutes(appointment.endTime)).toBeLessThanOrEqual(18 * 60);

      const order = orders.find((item) => item.id === appointment.orderId);
      expect(order).toBeDefined();
      if (order) {
        expect(daysBetween(order.createdOn, appointment.date)).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe("demo dataset: importes", () => {
  it("cada total de presupuesto es la suma exacta de sus ítems", () => {
    for (const quote of quotes) {
      const sum = quote.items.reduce((acc, item) => acc + item.amount, 0);
      expect(quote.total).toBe(sum);
    }
  });

  it("los importes son enteros positivos en ARS", () => {
    for (const quote of quotes) {
      for (const item of quote.items) {
        expect(Number.isInteger(item.amount)).toBe(true);
        expect(item.amount).toBeGreaterThan(0);
      }
    }
    for (const payment of payments) {
      expect(Number.isInteger(payment.amount)).toBe(true);
      expect(payment.amount).toBeGreaterThan(0);
    }
  });

  it("los cobros no superan el total del presupuesto", () => {
    for (const quote of quotes) {
      expect(getQuoteTotalPaid(quote.id)).toBeLessThanOrEqual(quote.total);
      expect(getQuoteBalance(quote.id)).toBeGreaterThanOrEqual(0);
    }
  });

  it("el saldo pendiente del ejemplo coincide con total menos cobros", () => {
    const summary = getDemoSummary();
    const approved = quotes.filter((quote) => quote.status === "aprobado");
    const expected = approved.reduce((sum, quote) => sum + getQuoteBalance(quote.id), 0);
    expect(summary.pendingBalance).toBe(expected);
    expect(summary.pendingBalance).toBe(45_500);
  });
});

describe("demo dataset: referencias de mockups", () => {
  it("demoRefs apunta a registros existentes con el tipo correcto", () => {
    expect(ids(customers)).toContain(demoRefs.customerId);
    expect(ids(technicians)).toContain(demoRefs.technicianId);
    expect(ids(orders)).toContain(demoRefs.activeOrderId);
    expect(ids(orders)).toContain(demoRefs.pendingOrderId);
    expect(ids(orders)).toContain(demoRefs.scheduledOrderId);
    expect(getQuote(demoRefs.approvedQuoteId).status).toBe("aprobado");
    expect(getQuote(demoRefs.pendingQuoteId).status).toBe("enviado");
    expect(ids(payments)).toContain(demoRefs.paymentId);
  });

  it("los turnos de la agenda de ejemplo están dentro de la franja visible", () => {
    const todays = appointments.filter((item) => item.date === DEMO_REFERENCE_DATE);
    expect(todays.length).toBeGreaterThan(0);
    for (const appointment of todays) {
      expect(timeToMinutes(appointment.startTime)).toBeGreaterThanOrEqual(AGENDA_DAY_MINUTES.start);
      expect(timeToMinutes(appointment.endTime)).toBeLessThanOrEqual(AGENDA_DAY_MINUTES.end);
    }
  });
});

describe("demo dataset: indicadores derivados", () => {
  it("calcula órdenes de hoy y presupuestos sin respuesta", () => {
    const summary = getDemoSummary();
    expect(summary.ordersToday).toBe(2);
    expect(summary.quotesAwaitingResponse).toBe(1);
  });

  it("el cliente de ejemplo tiene exactamente las tres órdenes que muestra la ficha", () => {
    const customerOrders = orders.filter((order) => order.customerId === customers[0]?.id);
    expect(customerOrders).toHaveLength(3);
  });
});
