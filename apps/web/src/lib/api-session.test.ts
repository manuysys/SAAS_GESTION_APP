import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, refreshSession, setAccessToken } from "@/lib/api";
import { readJsonOrThrow, sessionFetch } from "@/lib/api-session";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    refreshSession: vi.fn(),
    setAccessToken: vi.fn(),
  };
});

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("sessionFetch", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    vi.mocked(refreshSession).mockReset();
    vi.mocked(setAccessToken).mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends the tenant header and returns the response", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    const response = await sessionFetch("/api/v1/onboarding", { method: "GET", tenantId: "t1" });

    expect(response.status).toBe(200);
    const init = fetchMock.mock.calls[0]?.[1];
    expect(new Headers(init?.headers).get("X-Tenant-ID")).toBe("t1");
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it("refreshes once on 401 and retries the same request", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { detail: "expired" }))
      .mockResolvedValueOnce(jsonResponse(200, { completed: false, state: null }));
    vi.mocked(refreshSession).mockResolvedValueOnce({
      access_token: "new-token",
      token_type: "bearer",
      expires_in: 900,
    });

    const response = await sessionFetch("/api/v1/onboarding", {
      method: "PATCH",
      tenantId: "t1",
      json: { step: 2 },
    });

    expect(response.status).toBe(200);
    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(setAccessToken).toHaveBeenCalledWith("new-token");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("turns a failed refresh into a session error for the user", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { detail: "expired" }));
    vi.mocked(refreshSession).mockRejectedValueOnce(new ApiError(401, "expired"));

    await expect(
      sessionFetch("/api/v1/onboarding", { method: "GET", tenantId: "t1" }),
    ).rejects.toMatchObject({ status: 401, detail: "Tu sesión venció. Volvé a ingresar." });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sends multipart bodies without forcing a JSON content type", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, {}));
    const body = new FormData();
    body.append("file", new File(["name"], "a.csv", { type: "text/csv" }));

    await sessionFetch("/api/v1/imports/customers/preview", {
      method: "POST",
      tenantId: "t1",
      body,
    });

    const init = fetchMock.mock.calls[0]?.[1];
    expect(new Headers(init?.headers).get("Content-Type")).toBeNull();
    expect(init?.body).toBe(body);
  });
});

describe("readJsonOrThrow", () => {
  it("throws ApiError with the server detail when the response fails", async () => {
    await expect(
      readJsonOrThrow(jsonResponse(422, { detail: "Falta la columna name" }), "Fallback"),
    ).rejects.toMatchObject({ status: 422, detail: "Falta la columna name" });
  });

  it("uses the fallback when the detail is not a string (validation arrays)", async () => {
    await expect(
      readJsonOrThrow(jsonResponse(422, { detail: [{ msg: "x" }] }), "Fallback"),
    ).rejects.toMatchObject({ status: 422, detail: "Fallback" });
  });
});
