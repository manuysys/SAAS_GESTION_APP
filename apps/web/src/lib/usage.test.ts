import { describe, expect, it } from "vitest";

import { readLimit, usagePercent } from "@/lib/usage";

describe("usagePercent", () => {
  it("calcula el porcentaje redondeado", () => {
    expect(usagePercent(25, 100)).toBe(25);
    expect(usagePercent(1, 3)).toBe(33);
  });

  it("acota entre 0 y 100", () => {
    expect(usagePercent(150, 100)).toBe(100);
    expect(usagePercent(0, 100)).toBe(0);
  });

  it("sin límite configurado devuelve null", () => {
    expect(usagePercent(10, null)).toBeNull();
  });

  it("límite cero: 100 si hay consumo, 0 si no", () => {
    expect(usagePercent(0, 0)).toBe(0);
    expect(usagePercent(2, 0)).toBe(100);
  });
});

describe("readLimit", () => {
  it("lee números y descarta valores no numéricos", () => {
    const limits = { max_users: 5, max_technicians: "10", ai_monthly_tokens: null };
    expect(readLimit(limits, "max_users")).toBe(5);
    expect(readLimit(limits, "max_technicians")).toBeNull();
    expect(readLimit(limits, "ai_monthly_tokens")).toBeNull();
    expect(readLimit(limits, "inexistente")).toBeNull();
    expect(readLimit(null, "max_users")).toBeNull();
  });
});
