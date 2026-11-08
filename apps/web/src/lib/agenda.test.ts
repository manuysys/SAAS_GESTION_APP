import { describe, expect, it } from "vitest";

import type { Appointment } from "@/lib/api";
import {
  appointmentStatusLabel,
  appointmentsOnDay,
  argentinaDayKey,
  dateTimeLocalFromDay,
  formatDateTimeLocal,
  localDateTimeToIso,
  shiftDay,
} from "@/lib/agenda";
import { paymentMethodLabel, paymentStatusLabel } from "@/lib/payment-status";

function appointment(id: string, startsAt: string): Appointment {
  return {
    id,
    tenant_id: "tenant",
    work_order_id: "order",
    technician_id: "technician",
    starts_at: startsAt,
    ends_at: startsAt,
    status: "scheduled",
    notes: null,
    created_at: startsAt,
    updated_at: startsAt,
  };
}

describe("shiftDay", () => {
  it("moves civil days across month and year boundaries", () => {
    expect(shiftDay("2026-01-31", 1)).toBe("2026-02-01");
    expect(shiftDay("2026-03-01", -1)).toBe("2026-02-28");
    expect(shiftDay("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("argentinaDayKey", () => {
  it("uses the Argentina calendar day, not UTC", () => {
    // 02:30 UTC del 8 es 23:30 del 7 en Buenos Aires (UTC-3, sin horario de verano).
    expect(argentinaDayKey("2026-11-08T02:30:00Z")).toBe("2026-11-07");
    expect(argentinaDayKey("2026-11-08T15:00:00Z")).toBe("2026-11-08");
  });
});

describe("appointmentsOnDay", () => {
  it("keeps only appointments starting on the day, sorted by start", () => {
    const items = [
      appointment("late", "2026-11-08T15:00:00Z"),
      appointment("other-day", "2026-11-09T14:00:00Z"),
      appointment("early", "2026-11-08T12:00:00Z"),
    ];
    const result = appointmentsOnDay(items, "2026-11-08");
    expect(result.map((item) => item.id)).toEqual(["early", "late"]);
  });
});

describe("datetime-local helpers", () => {
  it("builds a datetime-local value from a day and a time", () => {
    expect(dateTimeLocalFromDay("2026-11-08", "09:00")).toBe("2026-11-08T09:00");
  });

  it("formats a Date as datetime-local in the browser zone", () => {
    expect(formatDateTimeLocal(new Date(2026, 10, 8, 9, 5))).toBe("2026-11-08T09:05");
  });

  it("converts datetime-local values to ISO instants", () => {
    expect(localDateTimeToIso("2026-11-08T09:00")).toBe(new Date(2026, 10, 8, 9, 0).toISOString());
  });
});

describe("labels", () => {
  it("falls back to the raw code for unknown statuses", () => {
    expect(appointmentStatusLabel("scheduled")).toBe("Programado");
    expect(appointmentStatusLabel("rescheduled")).toBe("rescheduled");
  });

  it("labels payment methods and statuses", () => {
    expect(paymentMethodLabel("transfer")).toBe("Transferencia");
    expect(paymentMethodLabel("crypto")).toBe("crypto");
    expect(paymentStatusLabel("voided")).toBe("Anulado");
  });
});
