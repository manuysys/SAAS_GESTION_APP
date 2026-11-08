import { describe, expect, it } from "vitest";

import { calculateQuoteTotals, roundMoney } from "@/lib/quote-totals";

describe("calculateQuoteTotals", () => {
  it("returns zeros for an empty quote", () => {
    expect(calculateQuoteTotals([])).toEqual({
      subtotal: 0,
      discountTotal: 0,
      taxTotal: 0,
      total: 0,
    });
  });

  it("applies discount before tax on each line", () => {
    const totals = calculateQuoteTotals([
      { quantity: "2", unit_price: "1000", discount_rate: "10", tax_rate: "21" },
    ]);
    expect(totals).toEqual({
      subtotal: 2000,
      discountTotal: 200,
      taxTotal: 378,
      total: 2178,
    });
  });

  it("sums several lines with different rates", () => {
    const totals = calculateQuoteTotals([
      { quantity: "1", unit_price: "100.10", discount_rate: "0", tax_rate: "21" },
      { quantity: "3", unit_price: "50", discount_rate: "5", tax_rate: "10.5" },
    ]);
    // Línea 1: bruto 100.10, sin descuento, IVA 21 % = 21.021 → 21.02.
    // Línea 2: bruto 150, descuento 5 % = 7.50, neto 142.50, IVA 10.5 % = 14.9625 → 14.96.
    expect(totals.subtotal).toBe(250.1);
    expect(totals.discountTotal).toBe(7.5);
    expect(totals.taxTotal).toBe(35.98);
    expect(totals.total).toBe(278.58);
  });

  it("treats invalid numeric input as zero instead of NaN", () => {
    const totals = calculateQuoteTotals([
      { quantity: "", unit_price: "abc", discount_rate: "", tax_rate: "" },
    ]);
    expect(totals.total).toBe(0);
    expect(Number.isNaN(totals.total)).toBe(false);
  });

  it("rounds to centavos", () => {
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
    expect(roundMoney(1.005)).toBe(1.01);
  });
});
