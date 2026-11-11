import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api";
import { SESSION_EXPIRED_MESSAGE, userFacingError } from "@/lib/errors";

const FALLBACK = "No se pudo completar la acción.";

describe("userFacingError", () => {
  it("shows the business detail for 4xx errors", () => {
    expect(
      userFacingError(new ApiError(409, "Ya existe una invitación para ese email"), FALLBACK),
    ).toBe("Ya existe una invitación para ese email");
  });

  it("hides internal details for 5xx errors", () => {
    expect(userFacingError(new ApiError(500, "KeyError: tenant_id"), FALLBACK)).toBe(FALLBACK);
  });

  it("asks to sign in again on 401", () => {
    expect(userFacingError(new ApiError(401, "Not authenticated"), FALLBACK)).toBe(
      SESSION_EXPIRED_MESSAGE,
    );
  });

  it("uses the fallback for non-API errors and empty details", () => {
    expect(userFacingError(new TypeError("Failed to fetch"), FALLBACK)).toBe(FALLBACK);
    expect(userFacingError(new ApiError(400, "   "), FALLBACK)).toBe(FALLBACK);
    expect(userFacingError(undefined, FALLBACK)).toBe(FALLBACK);
  });
});
