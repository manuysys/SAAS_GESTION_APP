import { describe, expect, it } from "vitest";

import { SUBSCRIPTION_STATUS_LABELS, isSubscriptionStatus, periodLabel } from "@/lib/billing";

describe("isSubscriptionStatus", () => {
  it("acepta solo los estados conocidos", () => {
    expect(isSubscriptionStatus("trialing")).toBe(true);
    expect(isSubscriptionStatus("past_due")).toBe(true);
    expect(isSubscriptionStatus("paused")).toBe(false);
    expect(isSubscriptionStatus(null)).toBe(false);
  });
});

describe("etiquetas de billing", () => {
  it("traduce cada estado al español", () => {
    expect(SUBSCRIPTION_STATUS_LABELS).toEqual({
      trialing: "En prueba",
      active: "Activa",
      past_due: "Pago pendiente",
      cancelled: "Cancelada",
    });
  });

  it("muestra el período mensual como mes", () => {
    expect(periodLabel("monthly")).toBe("mes");
    expect(periodLabel("yearly")).toBe("yearly");
  });
});
