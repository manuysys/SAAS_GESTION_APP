import { describe, expect, it } from "vitest";

import { sumMoney } from "@/lib/money";

describe("sumMoney", () => {
  it("returns zero for an empty list", () => {
    expect(sumMoney([])).toBe("0.00");
  });

  it("adds decimal strings without float drift", () => {
    expect(sumMoney(["0.1", "0.2"])).toBe("0.30");
    expect(sumMoney(["1500.50", "250"])).toBe("1750.50");
  });

  it("keeps two decimals and handles negatives", () => {
    expect(sumMoney(["10.05", "0.5"])).toBe("10.55");
    expect(sumMoney(["-10.5", "3"])).toBe("-7.50");
  });

  it("accepts surrounding spaces", () => {
    expect(sumMoney([" 12.00 "])).toBe("12.00");
  });

  it("rejects values that are not money amounts", () => {
    expect(() => sumMoney(["abc"])).toThrow(RangeError);
    expect(() => sumMoney(["1.234"])).toThrow(RangeError);
    expect(() => sumMoney([""])).toThrow(RangeError);
  });
});
