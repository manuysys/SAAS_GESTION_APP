import { describe, expect, it } from "vitest";

import { brand } from "@/lib/brand";

describe("brand identity", () => {
  it("uses DOVEXO as product name and ARVOKTA as the legal company", () => {
    expect(brand.name).toBe("DOVEXO");
    expect(brand.legalName).toBe("ARVOKTA");
    expect(brand.company).toBe("ARVOKTA");
  });

  it("does not expose the previous provisional name in visible copy", () => {
    const visibleCopy = [brand.name, brand.legalName, brand.tagline, brand.description].join(" ");
    expect(visibleCopy.toLowerCase()).not.toContain("arreglo");
  });

  it("uses an existing public URL instead of an unconfirmed domain", () => {
    expect(brand.domain).toBeNull();
    expect(brand.appUrl).toMatch(/^https:\/\//);
  });
});
