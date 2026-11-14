import { describe, expect, it } from "vitest";

import { visibleNavigation } from "@/lib/navigation";
import { canSendPortalEmail, isSafePortalUrl } from "@/lib/portal-access";

const hrefsFor = (role: string) => visibleNavigation(role, false).map((item) => item.href);

describe("team navigation", () => {
  it("shows Equipo only to owner and admin", () => {
    expect(hrefsFor("owner")).toContain("/settings/team");
    expect(hrefsFor("admin")).toContain("/settings/team");
    expect(hrefsFor("dispatcher")).not.toContain("/settings/team");
    expect(hrefsFor("technician")).not.toContain("/settings/team");
    expect(hrefsFor("viewer")).not.toContain("/settings/team");
  });
});

describe("import and onboarding navigation", () => {
  it("shows Importar clientes to owner, admin and dispatcher (backend import roles)", () => {
    expect(hrefsFor("owner")).toContain("/settings/import");
    expect(hrefsFor("admin")).toContain("/settings/import");
    expect(hrefsFor("dispatcher")).toContain("/settings/import");
    expect(hrefsFor("technician")).not.toContain("/settings/import");
    expect(hrefsFor("viewer")).not.toContain("/settings/import");
  });

  it("shows Primeros pasos only to owner and admin", () => {
    expect(hrefsFor("owner")).toContain("/onboarding");
    expect(hrefsFor("admin")).toContain("/onboarding");
    expect(hrefsFor("dispatcher")).not.toContain("/onboarding");
    expect(hrefsFor("technician")).not.toContain("/onboarding");
    expect(hrefsFor("viewer")).not.toContain("/onboarding");
  });
});

describe("portal access helpers", () => {
  it("requires a non-empty customer email to send by email", () => {
    expect(canSendPortalEmail("ana@example.com")).toBe(true);
    expect(canSendPortalEmail("   ")).toBe(false);
    expect(canSendPortalEmail("")).toBe(false);
    expect(canSendPortalEmail(null)).toBe(false);
  });

  it("only treats http and https links as displayable", () => {
    expect(isSafePortalUrl("https://app.example.com/portal/abc?token=x")).toBe(true);
    expect(isSafePortalUrl("http://localhost:3000/portal?token=x")).toBe(true);
    expect(isSafePortalUrl("javascript:alert(1)")).toBe(false);
    expect(isSafePortalUrl("data:text/html,hola")).toBe(false);
    expect(isSafePortalUrl("no es una url")).toBe(false);
  });
});
