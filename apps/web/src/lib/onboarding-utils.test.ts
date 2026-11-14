import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api";
import type { OnboardingState, Weekday } from "@/lib/onboarding-api";
import {
  DEFAULT_TIMEZONE,
  WEEKDAYS,
  buildSchedulePayload,
  buildServicesPayload,
  clampStep,
  companyStepSchema,
  isOnboardingTimezone,
  normalizeOnboardingState,
  onboardingChecklist,
  onboardingErrorMessage,
  parsePriceInput,
  scheduleFormDefaults,
  servicesStepSchema,
  timeOrderError,
  validateScheduleDays,
  type ScheduleForm,
} from "@/lib/onboarding-utils";

function fullSchedule(enabled: Partial<Record<Weekday, boolean>>): ScheduleForm {
  const result = {} as ScheduleForm;
  for (const day of WEEKDAYS) {
    result[day] = { enabled: enabled[day] ?? false, start: "09:00", end: "18:00" };
  }
  return result;
}

describe("clampStep", () => {
  it("keeps valid steps and falls back to 1 otherwise", () => {
    expect(clampStep(3)).toBe(3);
    expect(clampStep(0)).toBe(1);
    expect(clampStep(9)).toBe(4);
    expect(clampStep(2.5)).toBe(1);
    expect(clampStep("2")).toBe(1);
    expect(clampStep(undefined)).toBe(1);
  });
});

describe("normalizeOnboardingState", () => {
  it("fills defaults when the backend returns null state", () => {
    expect(normalizeOnboardingState(null)).toEqual({
      step: 1,
      company: null,
      services: [],
      schedule: {},
      team_invited: false,
      first_customer: false,
    });
  });

  it("keeps saved progress so the wizard can resume", () => {
    const saved: OnboardingState = {
      step: 3,
      company: { name: "Servicios Demo", timezone: DEFAULT_TIMEZONE, currency: "ARS" },
      team_invited: true,
    };
    const normalized = normalizeOnboardingState(saved);
    expect(normalized.step).toBe(3);
    expect(normalized.company?.name).toBe("Servicios Demo");
    expect(normalized.team_invited).toBe(true);
    expect(normalized.first_customer).toBe(false);
  });
});

describe("parsePriceInput", () => {
  it("normalizes plain integers and comma or dot decimals to two decimals", () => {
    expect(parsePriceInput("15000")).toBe("15000.00");
    expect(parsePriceInput("15000,5")).toBe("15000.50");
    expect(parsePriceInput("15000.25")).toBe("15000.25");
    expect(parsePriceInput(" 0 ")).toBe("0.00");
  });

  it("rejects thousands separators, negatives, more decimals and empty values", () => {
    expect(parsePriceInput("15.000")).toBeNull();
    expect(parsePriceInput("-10")).toBeNull();
    expect(parsePriceInput("10,555")).toBeNull();
    expect(parsePriceInput("")).toBeNull();
    expect(parsePriceInput("abc")).toBeNull();
  });

  it("rejects more than 12 integer digits (NUMERIC(14,2))", () => {
    expect(parsePriceInput("1234567890123")).toBeNull();
    expect(parsePriceInput("123456789012")).toBe("123456789012.00");
  });
});

describe("timeOrderError", () => {
  it("requires HH:MM and an end after the start", () => {
    expect(timeOrderError("09:00", "18:00")).toBeNull();
    expect(timeOrderError("18:00", "09:00")).toBe(
      "La hora de fin debe ser posterior a la de inicio.",
    );
    expect(timeOrderError("09:00", "09:00")).toBe(
      "La hora de fin debe ser posterior a la de inicio.",
    );
    expect(timeOrderError("9:00", "18:00")).toMatch(/HH:MM/);
  });
});

describe("validateScheduleDays", () => {
  it("requires at least one enabled day", () => {
    expect(validateScheduleDays(fullSchedule({}))).toBe("Elegí al menos un día de atención.");
  });

  it("names the day with the invalid range", () => {
    const days = fullSchedule({ monday: true });
    days.monday = { enabled: true, start: "18:00", end: "09:00" };
    expect(validateScheduleDays(days)).toBe(
      "Lunes: La hora de fin debe ser posterior a la de inicio.",
    );
  });

  it("accepts a valid weekly schedule", () => {
    expect(validateScheduleDays(fullSchedule({ monday: true, friday: true }))).toBeNull();
  });
});

describe("buildSchedulePayload", () => {
  it("sends only enabled days", () => {
    expect(buildSchedulePayload(fullSchedule({ monday: true, saturday: true }))).toEqual({
      monday: { start: "09:00", end: "18:00" },
      saturday: { start: "09:00", end: "18:00" },
    });
  });
});

describe("scheduleFormDefaults", () => {
  it("enables Monday to Friday when nothing was saved", () => {
    const days = scheduleFormDefaults(undefined);
    expect(days.monday.enabled).toBe(true);
    expect(days.friday.enabled).toBe(true);
    expect(days.saturday.enabled).toBe(false);
    expect(days.sunday.enabled).toBe(false);
  });

  it("restores the saved schedule exactly", () => {
    const days = scheduleFormDefaults({ monday: { start: "10:00", end: "14:00" } });
    expect(days.monday).toEqual({ enabled: true, start: "10:00", end: "14:00" });
    expect(days.tuesday.enabled).toBe(false);
  });
});

describe("services payload", () => {
  it("converts validated form values to the API contract with Decimal strings", () => {
    expect(
      buildServicesPayload([{ name: "Instalación", duration: "60", price: "15000,5" }]),
    ).toEqual([{ name: "Instalación", duration_minutes: 60, price: "15000.50" }]);
  });

  it("validates service rows", () => {
    const valid = {
      services: [{ name: "Instalación", duration: "60", price: "15000" }],
      days: fullSchedule({ monday: true }),
    };
    expect(servicesStepSchema.safeParse(valid).success).toBe(true);

    const noServices = { ...valid, services: [] };
    expect(servicesStepSchema.safeParse(noServices).success).toBe(false);

    const badDuration = {
      ...valid,
      services: [{ name: "Instalación", duration: "10", price: "15000" }],
    };
    expect(servicesStepSchema.safeParse(badDuration).success).toBe(false);

    const badPrice = {
      ...valid,
      services: [{ name: "Instalación", duration: "60", price: "15.000" }],
    };
    expect(servicesStepSchema.safeParse(badPrice).success).toBe(false);
  });
});

describe("companyStepSchema", () => {
  it("requires a name and a supported timezone", () => {
    expect(
      companyStepSchema.safeParse({ name: "Mi Empresa", timezone: DEFAULT_TIMEZONE }).success,
    ).toBe(true);
    expect(companyStepSchema.safeParse({ name: "A", timezone: DEFAULT_TIMEZONE }).success).toBe(
      false,
    );
    expect(
      companyStepSchema.safeParse({ name: "Mi Empresa", timezone: "Europe/Madrid" }).success,
    ).toBe(false);
  });

  it("recognizes supported timezones", () => {
    expect(isOnboardingTimezone(DEFAULT_TIMEZONE)).toBe(true);
    expect(isOnboardingTimezone("UTC")).toBe(false);
  });
});

describe("onboardingChecklist", () => {
  it("reflects the real saved state", () => {
    const items = onboardingChecklist(
      normalizeOnboardingState({
        step: 4,
        company: { name: "Servicios Demo", timezone: DEFAULT_TIMEZONE, currency: "ARS" },
        services: [{ name: "Instalación", duration_minutes: 60, price: "15000.00" }],
        schedule: { monday: { start: "09:00", end: "18:00" } },
        team_invited: false,
        first_customer: true,
      }),
    );
    expect(items.map((item) => [item.key, item.done])).toEqual([
      ["company", true],
      ["services", true],
      ["team", false],
      ["customers", true],
    ]);
    expect(items.find((item) => item.key === "team")?.href).toBe("/settings/team");
    expect(items.find((item) => item.key === "customers")?.href).toBe("/settings/import");
  });

  it("does not treat backend default services and schedule as configured", () => {
    // El backend siempre devuelve defaults (Instalación, lun–vie) aunque nadie los haya cargado.
    const items = onboardingChecklist(
      normalizeOnboardingState({
        step: 1,
        company: { name: "Mi Empresa", timezone: DEFAULT_TIMEZONE, currency: "ARS" },
        services: [{ name: "Instalación", duration_minutes: 60, price: "15000.00" }],
        schedule: { monday: { start: "09:00", end: "18:00" } },
      }),
    );
    expect(items.map((item) => [item.key, item.done])).toEqual([
      ["company", false],
      ["services", false],
      ["team", false],
      ["customers", false],
    ]);
  });

  it("marks a step done only once the wizard moved past it", () => {
    const items = onboardingChecklist(normalizeOnboardingState({ step: 3 }));
    expect(items.find((item) => item.key === "company")?.done).toBe(true);
    expect(items.find((item) => item.key === "services")?.done).toBe(true);
    expect(items.find((item) => item.key === "team")?.done).toBe(false);
  });
});

describe("onboardingErrorMessage", () => {
  it("explains a missing endpoint without claiming progress", () => {
    expect(onboardingErrorMessage(new ApiError(404, "Not Found"), "Fallback")).toBe(
      "La configuración inicial todavía no está disponible en este entorno.",
    );
  });

  it("shows business detail for 4xx and the fallback for 5xx", () => {
    expect(onboardingErrorMessage(new ApiError(403, "Sin permisos"), "Fallback")).toBe(
      "Sin permisos",
    );
    expect(onboardingErrorMessage(new ApiError(500, "interno"), "Fallback")).toBe("Fallback");
    expect(onboardingErrorMessage(new TypeError("Failed to fetch"), "Fallback")).toMatch(
      /No pudimos conectar/,
    );
  });
});
