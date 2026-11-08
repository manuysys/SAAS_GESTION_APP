const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = typeof body?.detail === "string" ? body.detail : "Error inesperado del servidor";
    throw new ApiError(response.status, detail);
  }
  return body as T;
}

export type Tenant = {
  id: string;
  name: string;
  slug: string;
  role: string | null;
};

export type User = {
  id: string;
  email: string;
  full_name: string;
  status: string;
};

export type AuthResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  tenants: Tenant[];
};

export type MeResponse = {
  user: User;
  tenants: Tenant[];
};

export type Customer = {
  id: string;
  tenant_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type CustomerListResponse = {
  items: Customer[];
  total: number;
  limit: number;
  offset: number;
};

export type CustomerInput = {
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
};

export type ServiceRequest = {
  id: string;
  tenant_id: string;
  customer_id: string;
  title: string;
  description: string | null;
  priority: string;
  source: string;
  status: string;
  requested_at: string;
  created_at: string;
  updated_at: string;
};

export type ServiceRequestListResponse = {
  items: ServiceRequest[];
  total: number;
  limit: number;
  offset: number;
};

export type ServiceRequestInput = {
  customer_id: string;
  title: string;
  description?: string;
  priority?: string;
  source?: string;
};

export type WorkOrder = {
  id: string;
  tenant_id: string;
  customer_id: string;
  service_request_id: string | null;
  code: string;
  title: string;
  description: string | null;
  priority: string;
  commercial_status: string;
  operational_status: string;
  payment_status: string;
  assigned_user_id: string | null;
  scheduled_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkOrderListResponse = {
  items: WorkOrder[];
  total: number;
  limit: number;
  offset: number;
};

export type WorkOrderInput = {
  customer_id: string;
  service_request_id?: string;
  title: string;
  description?: string;
  priority?: string;
  assigned_user_id?: string;
  scheduled_at?: string;
};

export type WorkOrderEvent = {
  id: string;
  work_order_id: string;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  actor_user_id: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
};

function tenantHeaders(tenantId: string): HeadersInit {
  return { "X-Tenant-ID": tenantId };
}

let refreshPromise: Promise<{
  access_token: string;
  token_type: string;
  expires_in: number;
}> | null = null;

export function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = api.auth.refresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export const api = {
  auth: {
    register: (input: {
      email: string;
      password: string;
      full_name: string;
      company_name: string;
    }) =>
      request<AuthResponse>("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    login: (input: { email: string; password: string }) =>
      request<AuthResponse>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    refresh: () =>
      request<{ access_token: string; token_type: string; expires_in: number }>(
        "/api/v1/auth/refresh",
        { method: "POST" },
      ),
    logout: () => request<void>("/api/v1/auth/logout", { method: "POST" }),
    me: () => request<MeResponse>("/api/v1/auth/me"),
  },
  tenants: {
    list: () => request<Tenant[]>("/api/v1/tenants"),
    create: (name: string) =>
      request<Tenant>("/api/v1/tenants", {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
  },
  customers: {
    list: (tenantId: string, query = "") =>
      request<CustomerListResponse>(
        `/api/v1/customers${query ? `?query=${encodeURIComponent(query)}` : ""}`,
        { headers: tenantHeaders(tenantId) },
      ),
    create: (tenantId: string, input: CustomerInput) =>
      request<Customer>("/api/v1/customers", {
        method: "POST",
        headers: tenantHeaders(tenantId),
        body: JSON.stringify(input),
      }),
    update: (tenantId: string, customerId: string, input: Partial<CustomerInput>) =>
      request<Customer>(`/api/v1/customers/${customerId}`, {
        method: "PATCH",
        headers: tenantHeaders(tenantId),
        body: JSON.stringify(input),
      }),
    remove: (tenantId: string, customerId: string) =>
      request<void>(`/api/v1/customers/${customerId}`, {
        method: "DELETE",
        headers: tenantHeaders(tenantId),
      }),
  },
  serviceRequests: {
    list: (tenantId: string, status?: string) =>
      request<ServiceRequestListResponse>(
        `/api/v1/service-requests${status ? `?status=${encodeURIComponent(status)}` : ""}`,
        { headers: tenantHeaders(tenantId) },
      ),
    create: (tenantId: string, input: ServiceRequestInput) =>
      request<ServiceRequest>("/api/v1/service-requests", {
        method: "POST",
        headers: tenantHeaders(tenantId),
        body: JSON.stringify(input),
      }),
    convert: (tenantId: string, requestId: string) =>
      request<WorkOrder>(`/api/v1/service-requests/${requestId}/convert`, {
        method: "POST",
        headers: tenantHeaders(tenantId),
        body: JSON.stringify({}),
      }),
  },
  workOrders: {
    list: (tenantId: string, status?: string) =>
      request<WorkOrderListResponse>(
        `/api/v1/work-orders${status ? `?status=${encodeURIComponent(status)}` : ""}`,
        { headers: tenantHeaders(tenantId) },
      ),
    create: (tenantId: string, input: WorkOrderInput) =>
      request<WorkOrder>("/api/v1/work-orders", {
        method: "POST",
        headers: tenantHeaders(tenantId),
        body: JSON.stringify(input),
      }),
    get: (tenantId: string, orderId: string) =>
      request<WorkOrder>(`/api/v1/work-orders/${orderId}`, {
        headers: tenantHeaders(tenantId),
      }),
    transition: (tenantId: string, orderId: string, toStatus: string, notes?: string) =>
      request<WorkOrder>(`/api/v1/work-orders/${orderId}/transition`, {
        method: "POST",
        headers: tenantHeaders(tenantId),
        body: JSON.stringify({ to_status: toStatus, notes }),
      }),
    events: (tenantId: string, orderId: string) =>
      request<WorkOrderEvent[]>(`/api/v1/work-orders/${orderId}/events`, {
        headers: tenantHeaders(tenantId),
      }),
  },
};
