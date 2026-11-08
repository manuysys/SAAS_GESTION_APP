import { describe, expect, it } from "vitest";

import { formatCurrency, formatDate, formatDateOnly, formatNumber } from "@/lib/utils";

describe("utils", () => {
  it("formats ARS currency for Argentina", () => {
    const value = formatCurrency(1234.5);
    expect(value).toContain("1.234,50");
    expect(value).toContain("$");
  });

  it("formats dates in Argentina timezone", () => {
    const value = formatDate("2026-01-15T12:00:00Z");
    expect(value).toContain("15");
    expect(value).toContain("2026");
  });

  it("keeps civil dates (YYYY-MM-DD) on the same day", () => {
    expect(formatDateOnly("2026-12-01")).toBe("01/12/2026");
  });

  it("formats decimal strings with Argentine separators", () => {
    expect(formatNumber("1500.5")).toBe("1.500,5");
  });
});
