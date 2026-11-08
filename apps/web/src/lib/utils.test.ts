import { describe, expect, it } from "vitest";

import { formatCurrency, formatDate } from "@/lib/utils";

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
});
