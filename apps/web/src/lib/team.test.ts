import { describe, expect, it } from "vitest";

import {
  assignableRoles,
  canManageTeam,
  canResendInvitation,
  canRevokeInvitation,
  homePathForRole,
  invitationDisplayStatus,
  publicInvitationMessage,
  roleLabel,
} from "@/lib/team";

const NOW = new Date("2026-11-10T12:00:00Z");

describe("canManageTeam", () => {
  it("allows only owner and admin", () => {
    expect(canManageTeam("owner")).toBe(true);
    expect(canManageTeam("admin")).toBe(true);
    expect(canManageTeam("dispatcher")).toBe(false);
    expect(canManageTeam("technician")).toBe(false);
    expect(canManageTeam("viewer")).toBe(false);
    expect(canManageTeam("")).toBe(false);
    expect(canManageTeam(null)).toBe(false);
    expect(canManageTeam(undefined)).toBe(false);
  });
});

describe("assignableRoles", () => {
  it("lets owner invite every role except owner", () => {
    expect(assignableRoles("owner")).toEqual(["admin", "dispatcher", "technician", "viewer"]);
  });

  it("does not let admin invite admin or owner", () => {
    const roles = assignableRoles("admin");
    expect(roles).toEqual(["dispatcher", "technician", "viewer"]);
    expect(roles).not.toContain("admin");
    expect(roles).not.toContain("owner");
  });

  it("gives no roles to non-managers", () => {
    expect(assignableRoles("dispatcher")).toEqual([]);
    expect(assignableRoles("technician")).toEqual([]);
    expect(assignableRoles(null)).toEqual([]);
  });

  it("never offers owner to anyone", () => {
    for (const role of ["owner", "admin", "dispatcher", "technician", "viewer", "x"]) {
      expect(assignableRoles(role)).not.toContain("owner");
    }
  });
});

describe("invitationDisplayStatus", () => {
  it("keeps pending invitations that have not expired", () => {
    expect(
      invitationDisplayStatus({ status: "pending", expires_at: "2026-11-17T12:00:00Z" }, NOW),
    ).toBe("pending");
  });

  it("derives expired from a pending invitation whose expires_at already passed", () => {
    expect(
      invitationDisplayStatus({ status: "pending", expires_at: "2026-11-09T12:00:00Z" }, NOW),
    ).toBe("expired");
  });

  it("treats the exact expiry instant as expired", () => {
    expect(invitationDisplayStatus({ status: "pending", expires_at: NOW.toISOString() }, NOW)).toBe(
      "expired",
    );
  });

  it("passes through accepted, revoked and expired", () => {
    expect(
      invitationDisplayStatus({ status: "accepted", expires_at: "2020-01-01T00:00:00Z" }, NOW),
    ).toBe("accepted");
    expect(
      invitationDisplayStatus({ status: "revoked", expires_at: "2099-01-01T00:00:00Z" }, NOW),
    ).toBe("revoked");
    expect(
      invitationDisplayStatus({ status: "expired", expires_at: "2099-01-01T00:00:00Z" }, NOW),
    ).toBe("expired");
  });

  it("returns null for unknown statuses and invalid dates", () => {
    expect(
      invitationDisplayStatus({ status: "weird", expires_at: "2099-01-01T00:00:00Z" }, NOW),
    ).toBeNull();
    expect(
      invitationDisplayStatus({ status: "pending", expires_at: "no-es-fecha" }, NOW),
    ).toBeNull();
  });
});

describe("resend and revoke rules", () => {
  it("allows resend and revoke only for open invitations", () => {
    expect(canResendInvitation("pending")).toBe(true);
    expect(canResendInvitation("expired")).toBe(true);
    expect(canResendInvitation("accepted")).toBe(false);
    expect(canResendInvitation("revoked")).toBe(false);
    expect(canResendInvitation(null)).toBe(false);

    expect(canRevokeInvitation("pending")).toBe(true);
    expect(canRevokeInvitation("expired")).toBe(true);
    expect(canRevokeInvitation("accepted")).toBe(false);
    expect(canRevokeInvitation("revoked")).toBe(false);
    expect(canRevokeInvitation(null)).toBe(false);
  });
});

describe("roleLabel", () => {
  it("uses Spanish labels and a fallback for unknown roles", () => {
    expect(roleLabel("technician")).toBe("Técnico");
    expect(roleLabel("dispatcher")).toBe("Coordinador");
    expect(roleLabel("hacker")).toBe("Sin rol");
  });
});

describe("homePathForRole", () => {
  it("sends technicians to /tech and everyone else to /dashboard", () => {
    expect(homePathForRole("technician")).toBe("/tech");
    expect(homePathForRole("owner")).toBe("/dashboard");
    expect(homePathForRole("admin")).toBe("/dashboard");
    expect(homePathForRole("dispatcher")).toBe("/dashboard");
    expect(homePathForRole("viewer")).toBe("/dashboard");
  });
});

describe("publicInvitationMessage", () => {
  it("has no message for pending invitations", () => {
    expect(publicInvitationMessage("pending")).toBeNull();
  });

  it("explains why the other states cannot be accepted, without leaking data", () => {
    expect(publicInvitationMessage("expired")).toContain("venció");
    expect(publicInvitationMessage("accepted")).toContain("ya fue aceptada");
    expect(publicInvitationMessage("revoked")).toContain("revocada");
  });
});
