import { describe, expect, it } from "vitest";

import { plans } from "@/lib/brand";

import { formatCount, formatPlanPrice, planLimitItems } from "./pricing";

describe("formatPlanPrice", () => {
  it("formats ARS without decimals", () => {
    const formatted = formatPlanPrice(29_900);
    expect(formatted).toContain("29.900");
    expect(formatted).not.toContain(",00");
  });
});

describe("formatCount", () => {
  it("uses es-AR thousands separators", () => {
    expect(formatCount(50_000)).toBe("50.000");
  });
});

describe("planLimitItems", () => {
  it("uses singular for a single user or technician", () => {
    const starter = plans.find((plan) => plan.code === "starter");
    expect(starter).toBeDefined();
    if (!starter) return;
    const items = planLimitItems(starter);
    expect(items[0]).toBe("1 usuario");
    expect(items[1]).toBe("1 técnico");
    expect(items[2]).toBe("100 órdenes por mes");
  });

  it("uses plural for larger plans", () => {
    const professional = plans.find((plan) => plan.code === "professional");
    expect(professional).toBeDefined();
    if (!professional) return;
    const items = planLimitItems(professional);
    expect(items[0]).toBe("5 usuarios");
    expect(items[1]).toBe("5 técnicos");
  });
});
