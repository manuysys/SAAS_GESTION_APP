import type {
  PortalAppointment,
  PortalCustomer,
  PortalOrder,
  PortalOrderDetail,
  PortalPayment,
  PortalQuote,
  PortalRequest,
  PortalSession,
  PortalSummary,
  PortalTenant,
  TechSession,
  TechWorkOrder,
  Tenant,
  WorkOrderAttachment,
  WorkOrderMaterial,
} from "@/src/lib/types";

export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL ?? "https://saas-gestion-api.vercel.app"
).replace(/\/$/, "");

export const DEMO_TENANT_SLUG =
  process.env.EXPO_PUBLIC_DEMO_TENANT_SLUG ?? "servicios-demo";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

type TechTokens = { accessToken: string; refreshToken: string };

let techTokens: TechTokens | null = null;
let techTokensRefreshedHandler: ((tokens: TechTokens) => void) | null = null;

export function setTechTokens(tokens: TechTokens | null) {
  techTokens = tokens;
}

/** Permite que la capa de sesión persista los tokens rotados en SecureStore. */
export function setTechTokensRefreshedHandler(
  handler: ((tokens: TechTokens) => void) | null,
) {
  techTokensRefreshedHandler = handler;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }
  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  if (!response.ok) {
    const detail =
      typeof body === "object" && body !== null && "detail" in body
        ? String((body as { detail: unknown }).detail)
        : `Error ${response.status}`;
    throw new ApiError(response.status, detail);
  }
  return body as T;
}

async function rawRequest<T>(
  path: string,
  init: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers = new Headers(init.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  return parseResponse<T>(response);
}

async function refreshTechTokens(): Promise<TechTokens> {
  if (!techTokens?.refreshToken) {
    throw new ApiError(401, "Sesión vencida");
  }
  const data = await rawRequest<{
    access_token: string;
    refresh_token: string;
  }>("/api/v1/auth/mobile/refresh", {
    method: "POST",
    body: JSON.stringify({ refresh_token: techTokens.refreshToken }),
  });
  const next = { accessToken: data.access_token, refreshToken: data.refresh_token };
  techTokens = next;
  techTokensRefreshedHandler?.(next);
  return next;
}

async function techRequest<T>(
  path: string,
  init: RequestInit = {},
  tenantId?: string,
): Promise<T> {
  const headers = new Headers(init.headers);
  if (tenantId) {
    headers.set("X-Tenant-ID", tenantId);
  }
  try {
    return await rawRequest<T>(path, { ...init, headers }, techTokens?.accessToken);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401 && techTokens?.refreshToken) {
      const next = await refreshTechTokens();
      return rawRequest<T>(path, { ...init, headers }, next.accessToken);
    }
    throw error;
  }
}

function jsonBody(value: unknown): BodyInit {
  return JSON.stringify(value);
}

export const api = {
  async techLogin(email: string, password: string): Promise<TechSession> {
    const data = await rawRequest<{
      access_token: string;
      refresh_token: string;
      tenants: Tenant[];
    }>("/api/v1/auth/mobile/login", {
      method: "POST",
      body: jsonBody({ email, password }),
    });
    const technicianTenants = data.tenants.filter((tenant) => tenant.role === "technician");
    const tenants = technicianTenants.length > 0 ? technicianTenants : data.tenants;
    if (tenants.length === 0) {
      throw new ApiError(403, "Tu usuario no tiene una empresa con rol técnico.");
    }
    const session: TechSession = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tenants,
      tenantId: tenants[0].id,
    };
    setTechTokens(session);
    return session;
  },

  async techLogout(refreshToken: string): Promise<void> {
    try {
      await rawRequest("/api/v1/auth/mobile/logout", {
        method: "POST",
        body: jsonBody({ refresh_token: refreshToken }),
      });
    } catch {
      // El logout local no debe fallar si el token ya no existe.
    }
    setTechTokens(null);
  },

  techWorkOrders(tenantId: string, status?: string) {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    return techRequest<{ items: TechWorkOrder[]; total: number }>(
      `/api/v1/technician/work-orders${query}`,
      {},
      tenantId,
    );
  },

  techWorkOrder(tenantId: string, id: string) {
    return techRequest<TechWorkOrder>(`/api/v1/technician/work-orders/${id}`, {}, tenantId);
  },

  techTransition(tenantId: string, id: string, toStatus: string) {
    return techRequest<TechWorkOrder>(
      `/api/v1/technician/work-orders/${id}/transition`,
      { method: "POST", body: jsonBody({ to_status: toStatus }) },
      tenantId,
    );
  },

  techNote(tenantId: string, id: string, notes: string, clientRequestId: string) {
    return techRequest<{ message: string }>(
      `/api/v1/technician/work-orders/${id}/notes`,
      {
        method: "POST",
        body: jsonBody({ notes, client_request_id: clientRequestId }),
      },
      tenantId,
    );
  },

  techMaterials(tenantId: string, id: string) {
    return techRequest<WorkOrderMaterial[]>(
      `/api/v1/technician/work-orders/${id}/materials`,
      {},
      tenantId,
    );
  },

  techCreateMaterial(
    tenantId: string,
    id: string,
    input: { description: string; quantity: string; unit: string },
    clientRequestId: string,
  ) {
    return techRequest<WorkOrderMaterial>(
      `/api/v1/technician/work-orders/${id}/materials`,
      {
        method: "POST",
        body: jsonBody({ ...input, client_request_id: clientRequestId }),
      },
      tenantId,
    );
  },

  techAttachments(tenantId: string, id: string) {
    return techRequest<WorkOrderAttachment[]>(
      `/api/v1/technician/work-orders/${id}/attachments`,
      {},
      tenantId,
    );
  },

  techUploadAttachment(
    tenantId: string,
    id: string,
    file: { uri: string; name: string; type: string },
    clientRequestId: string,
  ) {
    const body = new FormData();
    body.append("file", file as unknown as Blob);
    body.append("client_request_id", clientRequestId);
    return techRequest<WorkOrderAttachment>(
      `/api/v1/technician/work-orders/${id}/attachments`,
      { method: "POST", body },
      tenantId,
    );
  },

  registerDevice(tenantId: string, token: string, platform: string) {
    return techRequest<{ message: string }>(
      "/api/v1/notifications/devices",
      { method: "POST", body: jsonBody({ token, platform }) },
      tenantId,
    );
  },

  async portalInfo(tenantSlug: string) {
    return rawRequest<{
      tenant: PortalTenant;
      portal: { display_name: string; primary_color: string | null };
      demo_available: boolean;
    }>(`/api/v1/portal/${encodeURIComponent(tenantSlug)}`);
  },

  async portalRequestAccess(tenantSlug: string, input: { email?: string; phone?: string }) {
    return rawRequest<{ message: string; dev_token?: string }>(
      `/api/v1/portal/${encodeURIComponent(tenantSlug)}/auth/request`,
      { method: "POST", body: jsonBody(input) },
    );
  },

  async portalVerify(tenantSlug: string, token: string): Promise<PortalSession> {
    const data = await rawRequest<{
      access_token: string;
      customer: PortalCustomer;
      tenant: PortalTenant;
    }>(`/api/v1/portal/${encodeURIComponent(tenantSlug)}/auth/verify`, {
      method: "POST",
      body: jsonBody({ token }),
    });
    return {
      token: data.access_token,
      tenantSlug,
      tenant: data.tenant,
      customer: data.customer,
    };
  },

  async portalDemo(tenantSlug: string): Promise<PortalSession> {
    const data = await rawRequest<{
      access_token: string;
      customer: PortalCustomer;
      tenant: PortalTenant;
    }>(`/api/v1/portal/${encodeURIComponent(tenantSlug)}/auth/demo`, {
      method: "POST",
      body: jsonBody({}),
    });
    return {
      token: data.access_token,
      tenantSlug,
      tenant: data.tenant,
      customer: data.customer,
    };
  },

  portalSummary(session: PortalSession) {
    return rawRequest<PortalSummary>(
      `/api/v1/portal/${encodeURIComponent(session.tenantSlug)}/summary`,
      {},
      session.token,
    );
  },

  portalRequests(session: PortalSession) {
    return rawRequest<PortalRequest[]>(
      `/api/v1/portal/${encodeURIComponent(session.tenantSlug)}/requests`,
      {},
      session.token,
    );
  },

  portalCreateRequest(
    session: PortalSession,
    input: { title: string; description?: string; priority: string },
  ) {
    return rawRequest<PortalRequest>(
      `/api/v1/portal/${encodeURIComponent(session.tenantSlug)}/requests`,
      { method: "POST", body: jsonBody(input) },
      session.token,
    );
  },

  portalOrders(session: PortalSession) {
    return rawRequest<PortalOrder[]>(
      `/api/v1/portal/${encodeURIComponent(session.tenantSlug)}/orders`,
      {},
      session.token,
    );
  },

  portalOrder(session: PortalSession, id: string) {
    return rawRequest<PortalOrderDetail>(
      `/api/v1/portal/${encodeURIComponent(session.tenantSlug)}/orders/${id}`,
      {},
      session.token,
    );
  },

  portalQuotes(session: PortalSession) {
    return rawRequest<PortalQuote[]>(
      `/api/v1/portal/${encodeURIComponent(session.tenantSlug)}/quotes`,
      {},
      session.token,
    );
  },

  portalAppointments(session: PortalSession) {
    return rawRequest<PortalAppointment[]>(
      `/api/v1/portal/${encodeURIComponent(session.tenantSlug)}/appointments`,
      {},
      session.token,
    );
  },

  portalPayments(session: PortalSession) {
    return rawRequest<PortalPayment[]>(
      `/api/v1/portal/${encodeURIComponent(session.tenantSlug)}/payments`,
      {},
      session.token,
    );
  },

  portalApproveQuote(session: PortalSession, id: string) {
    return rawRequest<PortalQuote>(
      `/api/v1/portal/${encodeURIComponent(session.tenantSlug)}/quotes/${id}/approve`,
      { method: "POST", body: jsonBody({}) },
      session.token,
    );
  },

  portalRejectQuote(session: PortalSession, id: string) {
    return rawRequest<PortalQuote>(
      `/api/v1/portal/${encodeURIComponent(session.tenantSlug)}/quotes/${id}/reject`,
      { method: "POST", body: jsonBody({}) },
      session.token,
    );
  },
};
