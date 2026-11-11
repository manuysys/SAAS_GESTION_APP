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
  /** Administrador de la plataforma SaaS (panel global). Solo para la UI; el backend valida. */
  is_platform_admin?: boolean;
};

export type MessageResponse = {
  message: string;
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

/**
 * Importes y cantidades llegan como string (Decimal serializado por Pydantic).
 * Nunca convertir a number para cálculos persistidos.
 */
export type QuoteItem = {
  id: string;
  description: string;
  quantity: string;
  unit_price: string;
  discount_rate: string;
  tax_rate: string;
  line_total: string;
  sort_order: number;
};

export type Quote = {
  id: string;
  tenant_id: string;
  customer_id: string;
  work_order_id: string | null;
  number: string;
  status: string;
  currency: string;
  subtotal: string;
  discount_total: string;
  tax_total: string;
  total: string;
  notes: string | null;
  valid_until: string | null;
  sent_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  public_token: string | null;
  items: QuoteItem[];
};

export type QuoteSummary = {
  id: string;
  tenant_id: string;
  customer_id: string;
  work_order_id: string | null;
  number: string;
  status: string;
  currency: string;
  total: string;
  valid_until: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
};

export type QuoteListResponse = {
  items: QuoteSummary[];
  total: number;
  limit: number;
  offset: number;
};

export type QuoteItemInput = {
  description: string;
  quantity: string;
  unit_price: string;
  discount_rate: string;
  tax_rate: string;
};

export type QuoteInput = {
  customer_id: string;
  work_order_id?: string;
  /** Fecha en formato YYYY-MM-DD. */
  valid_until?: string;
  notes?: string;
  items: QuoteItemInput[];
};

export type QuoteEvent = {
  id: string;
  quote_id: string;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  actor_user_id: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
};

export type PublicQuoteItem = Pick<
  QuoteItem,
  "description" | "quantity" | "unit_price" | "discount_rate" | "tax_rate" | "line_total"
>;

/** Vista pública del presupuesto: sin IDs internos ni datos de otros tenants. */
export type PublicQuote = {
  tenant_name: string;
  customer_name: string;
  number: string;
  status: string;
  currency: string;
  subtotal: string;
  discount_total: string;
  tax_total: string;
  total: string;
  valid_until: string | null;
  notes: string | null;
  items: PublicQuoteItem[];
};

/** Los técnicos son usuarios de la empresa con rol operativo. */
export type Technician = {
  id: string;
  full_name: string;
  email: string;
};

/** Asignación parcial de la orden. `assigned_user_id: null` quita el técnico. */
export type WorkOrderUpdateInput = {
  title?: string;
  description?: string | null;
  priority?: string;
  assigned_user_id?: string | null;
  scheduled_at?: string | null;
};

export type Appointment = {
  id: string;
  tenant_id: string;
  work_order_id: string;
  technician_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type AppointmentListResponse = {
  items: Appointment[];
  total: number;
  limit: number;
  offset: number;
};

export type AppointmentInput = {
  work_order_id: string;
  technician_id: string;
  /** Instantes en ISO 8601 (UTC). */
  starts_at: string;
  ends_at: string;
  notes?: string;
};

/**
 * Importes llegan como string (Decimal serializado).
 * Nunca convertir a number para cálculos persistidos.
 */
export type Payment = {
  id: string;
  tenant_id: string;
  work_order_id: string;
  quote_id: string | null;
  amount: string;
  currency: string;
  method: string;
  status: string;
  paid_at: string;
  reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PaymentListResponse = {
  items: Payment[];
  total: number;
  limit: number;
  offset: number;
};

export type PaymentInput = {
  work_order_id: string;
  quote_id?: string;
  amount: string;
  method: string;
  /** Instante en ISO 8601. Si se omite, el servidor usa el momento actual. */
  paid_at?: string;
  reference?: string;
  notes?: string;
};

export type DashboardSummary = {
  customers_total: number;
  service_requests_total: number;
  service_requests_new: number;
  work_orders_total: number;
  work_orders_open: number;
  quotes_total: number;
  quotes_pending: number;
  payments_total: string;
  /** Saldo pendiente de cobro. Decimal serializado como string. */
  pending_balance: string;
  appointments_today: number;
};

/**
 * Vista de orden para técnicos: sin datos financieros (commercial_status,
 * payment_status) y con datos mínimos del cliente.
 */
export type TechnicianWorkOrder = Omit<WorkOrder, "commercial_status" | "payment_status"> & {
  customer_name: string | null;
  customer_phone: string | null;
};

export type TechnicianWorkOrderListResponse = {
  items: TechnicianWorkOrder[];
  total: number;
  limit: number;
  offset: number;
};

/** Cantidades llegan como string (Decimal serializado). */
export type WorkOrderMaterial = {
  id: string;
  work_order_id: string;
  description: string;
  quantity: string;
  unit: string;
  created_at: string;
};

export type WorkOrderMaterialInput = {
  description: string;
  quantity: string;
  unit: string;
};

export type WorkOrderAttachment = {
  id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
};

/* ───────────────────────── Automatizaciones ───────────────────────── */

export type AutomationEventType =
  | "quote_sent"
  | "quote_approved"
  | "quote_rejected"
  | "work_order_status_changed"
  | "appointment_created"
  | "payment_registered";

export type AutomationActionType = "notify" | "notify_user" | "send_whatsapp";

export type AutomationRule = {
  id: string;
  tenant_id: string;
  name: string;
  event_type: AutomationEventType;
  conditions: Record<string, unknown> | null;
  action_type: AutomationActionType;
  action_config: Record<string, unknown> | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type AutomationRuleInput = {
  name: string;
  event_type: AutomationEventType;
  conditions?: Record<string, unknown>;
  action_type: AutomationActionType;
  action_config?: Record<string, unknown>;
  active?: boolean;
};

export type AutomationExecutionStatus = "pending" | "success" | "failed" | "skipped";

export type AutomationExecution = {
  id: string;
  rule_id: string;
  event_type: AutomationEventType;
  status: AutomationExecutionStatus;
  payload: Record<string, unknown> | null;
  error: string | null;
  attempts: number;
  created_at: string;
  executed_at: string | null;
};

/* ───────────────────────── Notificaciones ───────────────────────── */

export type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  read_at: string | null;
  created_at: string;
  user_id: string | null;
};

export type NotificationListResponse = {
  items: Notification[];
  total: number;
  unread: number;
};

/* ───────────────────────── Suscripciones y administración SaaS ───────────────────────── */

/** Importes llegan como string (Decimal serializado). */
export type Plan = {
  id: string;
  code: string;
  name: string;
  price_ars: string;
  billing_period: string;
  limits: Record<string, unknown> | null;
  active: boolean;
};

export type SubscriptionStatus = "trialing" | "active" | "past_due" | "cancelled";

export type Subscription = {
  id: string;
  tenant_id: string;
  plan: Plan;
  status: SubscriptionStatus;
  started_at: string | null;
  current_period_end: string | null;
  price_snapshot: string;
};

export type SubscriptionUsage = {
  orders_this_month: number;
  users_count: number;
  technicians_count: number;
  ai_tokens_used: number;
};

export type SubscriptionDetail = {
  subscription: Subscription;
  usage: SubscriptionUsage;
};

export type AdminTenant = {
  id: string;
  name: string;
  created_at: string;
  plan_code: string | null;
  plan_name: string | null;
  subscription_status: string | null;
  users_count: number;
  orders_count: number;
  price_snapshot: string;
};

export type AdminTenantList = {
  items: AdminTenant[];
  total: number;
  limit: number;
  offset: number;
};

export type AdminMetrics = {
  tenants_total: number;
  active_subscriptions: number;
  trialing_subscriptions: number;
  mrr_ars: string;
  orders_total: number;
  orders_this_month: number;
  ai_tokens_this_month: number;
};

/* ───────────────────────── Asistente de IA ───────────────────────── */

export type AIStatus = {
  provider: string;
  model: string;
  configured: boolean;
  available: boolean;
  deterministic_available: boolean;
  monthly_token_limit: number;
  tokens_used: number;
  capabilities: string[];
};

export type AIChatResponse = {
  reply: string;
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  /** Costo estimado como string (Decimal serializado). */
  estimated_cost: string;
  used_tokens: number;
};

export type AIUsageItem = {
  id: string;
  provider: string;
  model: string;
  feature: string;
  input_tokens: number;
  output_tokens: number;
  estimated_cost: string;
  created_at: string;
};

export type AIUsage = {
  items: AIUsageItem[];
  total_tokens: number;
  total_cost: string;
  monthly_limit: number;
  remaining: number;
};

/* ───────────────────────── WhatsApp ───────────────────────── */

/** Los secretos nunca se devuelven: solo se informa si están cargados. */
export type WhatsAppConfig = {
  configured: boolean;
  active: boolean;
  phone_number_id: string | null;
  business_account_id: string | null;
  has_access_token: boolean;
  has_verify_token: boolean;
  has_app_secret: boolean;
};

export type WhatsAppConfigInput = {
  phone_number_id: string;
  business_account_id: string;
  access_token?: string;
  verify_token?: string;
  app_secret?: string;
  active: boolean;
};

export type WhatsAppMessage = {
  id: string;
  direction: string;
  wa_message_id: string | null;
  from_phone: string;
  to_phone: string;
  message_type: string;
  body: string | null;
  status: string;
  created_at: string;
};

export type WhatsAppMessageList = {
  items: WhatsAppMessage[];
  total: number;
  limit: number;
  offset: number;
};

export type WhatsAppSendResult = {
  id: string;
  status: string;
  wa_message_id: string | null;
};

/* ───────────────────────── Equipo, invitaciones y portal ───────────────────────── */

/**
 * Resultado del envío de email. `sent` = aceptado por el proveedor (no confirma
 * entrega), `failed` = el proveedor falló, `console` = modo desarrollo sin envío.
 */
export type EmailStatus = "sent" | "failed" | "console";

export type TeamRole = "owner" | "admin" | "dispatcher" | "technician" | "viewer";

export type TeamMember = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  status: string;
  last_login_at: string | null;
};

export type TeamInvitation = {
  id: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
  created_at: string;
};

export type TeamResponse = {
  members: TeamMember[];
  invitations: TeamInvitation[];
};

export type TeamInvitationInput = {
  email: string;
  full_name: string;
  role: TeamRole;
};

/** `invitation_url` trae el token en claro: solo se muestra una vez, nunca se persiste. */
export type TeamInvitationCreated = {
  id: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
  invitation_url: string;
  email_status: EmailStatus;
};

export type PublicInvitationStatus = "pending" | "expired" | "accepted" | "revoked";

/** Vista pública de una invitación: sin email completo ni IDs internos. */
export type PublicInvitation = {
  tenant_name: string;
  email_masked: string;
  role: string;
  expires_at: string;
  status: PublicInvitationStatus;
};

export type InvitationAcceptInput = {
  full_name: string;
  password: string;
};

export type InvitationAcceptResponse = {
  access_token: string;
  token_type: string;
  tenant: { id: string; name: string; slug: string; role: string };
  user: { id: string; email: string; full_name: string };
};

/** `access_url` trae el token en claro: se muestra una sola vez y expira. */
export type PortalAccess = {
  access_url: string;
  expires_at: string;
  email_status: EmailStatus;
};

function tenantHeaders(tenantId: string): HeadersInit {
  return { "X-Tenant-ID": tenantId };
}

function authHeaders(headers?: HeadersInit): Headers {
  const result = new Headers(headers);
  if (accessToken) {
    result.set("Authorization", `Bearer ${accessToken}`);
  }
  return result;
}

function errorDetail(body: unknown, fallback = "Error inesperado del servidor"): string {
  if (typeof body === "object" && body !== null && "detail" in body) {
    const { detail } = body;
    if (typeof detail === "string") return detail;
  }
  return fallback;
}

/** Request sin credenciales ni token: para endpoints públicos por token. */
async function publicRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "omit",
  });

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(response.status, errorDetail(body));
  }
  return body as T;
}

/**
 * Envío multipart. No se fija Content-Type: el navegador agrega el boundary.
 */
async function requestForm<T>(path: string, body: FormData, headers: HeadersInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: authHeaders(headers),
    body,
    credentials: "include",
  });

  const json: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(response.status, errorDetail(json));
  }
  return json as T;
}

async function requestBlob(path: string, headers: HeadersInit, fallback: string): Promise<Blob> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: authHeaders(headers),
    credentials: "include",
  });

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    throw new ApiError(response.status, errorDetail(body, fallback));
  }
  return response.blob();
}

/** Devuelve un mensaje legible para mostrar al usuario a partir de un error de mutación. */
export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.detail : fallback;
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

/**
 * Como `request`, pero ante 401 intenta un refresh de sesión (una vez) y reintenta.
 * Usar solo en endpoints autenticados; los públicos no deben refrescar.
 */
async function requestWithRefresh<T>(path: string, options: RequestInit = {}): Promise<T> {
  try {
    return await request<T>(path, options);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) {
      throw error;
    }
    const refreshed = await refreshSession();
    setAccessToken(refreshed.access_token);
    return request<T>(path, options);
  }
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
    get: (tenantId: string, customerId: string) =>
      request<Customer>(`/api/v1/customers/${customerId}`, {
        headers: tenantHeaders(tenantId),
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
    /** Actualiza campos de la orden; usar `assigned_user_id` para asignar o quitar técnico. */
    update: (tenantId: string, orderId: string, input: WorkOrderUpdateInput) =>
      request<WorkOrder>(`/api/v1/work-orders/${orderId}`, {
        method: "PATCH",
        headers: tenantHeaders(tenantId),
        body: JSON.stringify(input),
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
  quotes: {
    list: (tenantId: string, status?: string) =>
      request<QuoteListResponse>(
        `/api/v1/quotes${status ? `?status=${encodeURIComponent(status)}` : ""}`,
        { headers: tenantHeaders(tenantId) },
      ),
    create: (tenantId: string, input: QuoteInput) =>
      request<Quote>("/api/v1/quotes", {
        method: "POST",
        headers: tenantHeaders(tenantId),
        body: JSON.stringify(input),
      }),
    get: (tenantId: string, quoteId: string) =>
      request<Quote>(`/api/v1/quotes/${quoteId}`, {
        headers: tenantHeaders(tenantId),
      }),
    update: (tenantId: string, quoteId: string, input: Partial<QuoteInput>) =>
      request<Quote>(`/api/v1/quotes/${quoteId}`, {
        method: "PATCH",
        headers: tenantHeaders(tenantId),
        body: JSON.stringify(input),
      }),
    send: (tenantId: string, quoteId: string) =>
      request<Quote>(`/api/v1/quotes/${quoteId}/send`, {
        method: "POST",
        headers: tenantHeaders(tenantId),
        body: JSON.stringify({}),
      }),
    approve: (tenantId: string, quoteId: string) =>
      request<Quote>(`/api/v1/quotes/${quoteId}/approve`, {
        method: "POST",
        headers: tenantHeaders(tenantId),
        body: JSON.stringify({}),
      }),
    reject: (tenantId: string, quoteId: string) =>
      request<Quote>(`/api/v1/quotes/${quoteId}/reject`, {
        method: "POST",
        headers: tenantHeaders(tenantId),
        body: JSON.stringify({}),
      }),
    events: (tenantId: string, quoteId: string) =>
      request<QuoteEvent[]>(`/api/v1/quotes/${quoteId}/events`, {
        headers: tenantHeaders(tenantId),
      }),
    /** Descarga el PDF con Authorization; devuelve el Blob para disparar la descarga en el cliente. */
    pdf: (tenantId: string, quoteId: string) =>
      requestBlob(
        `/api/v1/quotes/${quoteId}/pdf`,
        tenantHeaders(tenantId),
        "No se pudo descargar el PDF",
      ),
  },
  technicians: {
    list: (tenantId: string) =>
      request<Technician[]>("/api/v1/technicians", { headers: tenantHeaders(tenantId) }),
  },
  appointments: {
    list: (tenantId: string, params?: { start?: string; end?: string; technicianId?: string }) => {
      const search = new URLSearchParams();
      if (params?.start) search.set("start", params.start);
      if (params?.end) search.set("end", params.end);
      if (params?.technicianId) search.set("technician_id", params.technicianId);
      const query = search.toString();
      return request<AppointmentListResponse>(`/api/v1/appointments${query ? `?${query}` : ""}`, {
        headers: tenantHeaders(tenantId),
      });
    },
    create: (tenantId: string, input: AppointmentInput) =>
      request<Appointment>("/api/v1/appointments", {
        method: "POST",
        headers: tenantHeaders(tenantId),
        body: JSON.stringify(input),
      }),
    update: (tenantId: string, appointmentId: string, input: Partial<AppointmentInput>) =>
      request<Appointment>(`/api/v1/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: tenantHeaders(tenantId),
        body: JSON.stringify(input),
      }),
    cancel: (tenantId: string, appointmentId: string) =>
      request<Appointment>(`/api/v1/appointments/${appointmentId}/cancel`, {
        method: "POST",
        headers: tenantHeaders(tenantId),
        body: JSON.stringify({}),
      }),
  },
  payments: {
    list: (tenantId: string) =>
      request<PaymentListResponse>("/api/v1/payments", { headers: tenantHeaders(tenantId) }),
    create: (tenantId: string, input: PaymentInput) =>
      request<Payment>("/api/v1/payments", {
        method: "POST",
        headers: tenantHeaders(tenantId),
        body: JSON.stringify(input),
      }),
    void: (tenantId: string, paymentId: string) =>
      request<Payment>(`/api/v1/payments/${paymentId}/void`, {
        method: "POST",
        headers: tenantHeaders(tenantId),
        body: JSON.stringify({}),
      }),
  },
  dashboard: {
    summary: (tenantId: string) =>
      request<DashboardSummary>("/api/v1/dashboard/summary", {
        headers: tenantHeaders(tenantId),
      }),
  },
  technicianWorkOrders: {
    list: (tenantId: string, status?: string) => {
      const query = status ? `?status=${encodeURIComponent(status)}` : "";
      return request<TechnicianWorkOrderListResponse>(`/api/v1/technician/work-orders${query}`, {
        headers: tenantHeaders(tenantId),
      });
    },
    get: (tenantId: string, orderId: string) =>
      request<TechnicianWorkOrder>(`/api/v1/technician/work-orders/${orderId}`, {
        headers: tenantHeaders(tenantId),
      }),
    transition: (tenantId: string, orderId: string, toStatus: string, notes?: string) =>
      request<TechnicianWorkOrder>(`/api/v1/technician/work-orders/${orderId}/transition`, {
        method: "POST",
        headers: tenantHeaders(tenantId),
        body: JSON.stringify({ to_status: toStatus, notes }),
      }),
    note: (tenantId: string, orderId: string, notes: string) =>
      request<void>(`/api/v1/technician/work-orders/${orderId}/notes`, {
        method: "POST",
        headers: tenantHeaders(tenantId),
        body: JSON.stringify({ notes }),
      }),
    materials: {
      list: (tenantId: string, orderId: string) =>
        request<WorkOrderMaterial[]>(`/api/v1/technician/work-orders/${orderId}/materials`, {
          headers: tenantHeaders(tenantId),
        }),
      create: (tenantId: string, orderId: string, input: WorkOrderMaterialInput) =>
        request<WorkOrderMaterial>(`/api/v1/technician/work-orders/${orderId}/materials`, {
          method: "POST",
          headers: tenantHeaders(tenantId),
          body: JSON.stringify(input),
        }),
    },
    attachments: {
      list: (tenantId: string, orderId: string) =>
        request<WorkOrderAttachment[]>(`/api/v1/technician/work-orders/${orderId}/attachments`, {
          headers: tenantHeaders(tenantId),
        }),
      upload: (tenantId: string, orderId: string, file: File) => {
        const body = new FormData();
        body.append("file", file);
        return requestForm<WorkOrderAttachment>(
          `/api/v1/technician/work-orders/${orderId}/attachments`,
          body,
          tenantHeaders(tenantId),
        );
      },
      /** Descarga con Authorization; devuelve el Blob para disparar la descarga en el cliente. */
      download: (tenantId: string, orderId: string, attachmentId: string) =>
        requestBlob(
          `/api/v1/technician/work-orders/${orderId}/attachments/${attachmentId}`,
          tenantHeaders(tenantId),
          "No se pudo descargar el archivo",
        ),
    },
  },
  publicQuotes: {
    get: (token: string) => publicRequest<PublicQuote>(`/api/v1/public/quotes/${token}`),
    approve: (token: string) =>
      publicRequest<PublicQuote>(`/api/v1/public/quotes/${token}/approve`, {
        method: "POST",
        body: JSON.stringify({}),
      }),
    reject: (token: string) =>
      publicRequest<PublicQuote>(`/api/v1/public/quotes/${token}/reject`, {
        method: "POST",
        body: JSON.stringify({}),
      }),
  },
  automations: {
    list: (tenantId: string) =>
      request<AutomationRule[]>("/api/v1/automations", { headers: tenantHeaders(tenantId) }),
    create: (tenantId: string, input: AutomationRuleInput) =>
      request<AutomationRule>("/api/v1/automations", {
        method: "POST",
        headers: tenantHeaders(tenantId),
        body: JSON.stringify(input),
      }),
    update: (tenantId: string, ruleId: string, input: Partial<AutomationRuleInput>) =>
      request<AutomationRule>(`/api/v1/automations/${ruleId}`, {
        method: "PATCH",
        headers: tenantHeaders(tenantId),
        body: JSON.stringify(input),
      }),
    toggle: (tenantId: string, ruleId: string) =>
      request<AutomationRule>(`/api/v1/automations/${ruleId}/toggle`, {
        method: "POST",
        headers: tenantHeaders(tenantId),
        body: JSON.stringify({}),
      }),
    remove: (tenantId: string, ruleId: string) =>
      request<MessageResponse>(`/api/v1/automations/${ruleId}`, {
        method: "DELETE",
        headers: tenantHeaders(tenantId),
      }),
    /** Últimas ejecuciones del tenant (el backend acepta hasta 200). */
    executions: (tenantId: string, limit = 50) =>
      request<AutomationExecution[]>(`/api/v1/automations/executions?limit=${limit}`, {
        headers: tenantHeaders(tenantId),
      }),
  },
  notifications: {
    list: (tenantId: string) =>
      request<NotificationListResponse>("/api/v1/notifications", {
        headers: tenantHeaders(tenantId),
      }),
    markRead: (tenantId: string, notificationId: string) =>
      request<Notification>(`/api/v1/notifications/${notificationId}/read`, {
        method: "POST",
        headers: tenantHeaders(tenantId),
        body: JSON.stringify({}),
      }),
    markAllRead: (tenantId: string) =>
      request<MessageResponse>("/api/v1/notifications/read-all", {
        method: "POST",
        headers: tenantHeaders(tenantId),
        body: JSON.stringify({}),
      }),
  },
  billing: {
    plans: (tenantId: string) =>
      request<Plan[]>("/api/v1/plans", { headers: tenantHeaders(tenantId) }),
    subscription: (tenantId: string) =>
      request<SubscriptionDetail>("/api/v1/subscription", {
        headers: tenantHeaders(tenantId),
      }),
    /** Solo owner. Devuelve el detalle actualizado de la suscripción. */
    changePlan: (tenantId: string, planCode: string) =>
      request<SubscriptionDetail>("/api/v1/subscription/change", {
        method: "POST",
        headers: tenantHeaders(tenantId),
        body: JSON.stringify({ plan_code: planCode }),
      }),
  },
  admin: {
    /** Solo administradores de la plataforma. `search` filtra por nombre de empresa. */
    tenants: (tenantId: string, search?: string) => {
      const query = search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
      return request<AdminTenantList>(`/api/v1/admin/tenants${query}`, {
        headers: tenantHeaders(tenantId),
      });
    },
    metrics: (tenantId: string) =>
      request<AdminMetrics>("/api/v1/admin/metrics", { headers: tenantHeaders(tenantId) }),
    /** Cambia plan y estado de la suscripción de `targetTenantId` (no del tenant activo). */
    updateSubscription: (
      tenantId: string,
      targetTenantId: string,
      planCode: string,
      status: SubscriptionStatus,
    ) =>
      request<Subscription>(`/api/v1/admin/tenants/${targetTenantId}/subscription`, {
        method: "POST",
        headers: tenantHeaders(tenantId),
        body: JSON.stringify({ plan_code: planCode, status }),
      }),
  },
  ai: {
    status: (tenantId: string) =>
      request<AIStatus>("/api/v1/ai/status", { headers: tenantHeaders(tenantId) }),
    chat: (tenantId: string, message: string) =>
      request<AIChatResponse>("/api/v1/ai/chat", {
        method: "POST",
        headers: tenantHeaders(tenantId),
        body: JSON.stringify({ message }),
      }),
    usage: (tenantId: string) =>
      request<AIUsage>("/api/v1/ai/usage", { headers: tenantHeaders(tenantId) }),
  },
  whatsapp: {
    getConfig: (tenantId: string) =>
      request<WhatsAppConfig>("/api/v1/whatsapp/config", { headers: tenantHeaders(tenantId) }),
    /** Solo owner/admin. Los secretos en blanco no reemplazan los existentes (lo define el backend). */
    updateConfig: (tenantId: string, input: WhatsAppConfigInput) =>
      request<WhatsAppConfig>("/api/v1/whatsapp/config", {
        method: "PUT",
        headers: tenantHeaders(tenantId),
        body: JSON.stringify(input),
      }),
    messages: (tenantId: string) =>
      request<WhatsAppMessageList>("/api/v1/whatsapp/messages", {
        headers: tenantHeaders(tenantId),
      }),
    send: (tenantId: string, toPhone: string, body: string) =>
      request<WhatsAppSendResult>("/api/v1/whatsapp/send", {
        method: "POST",
        headers: tenantHeaders(tenantId),
        body: JSON.stringify({ to_phone: toPhone, body }),
      }),
  },
  /** Solo owner/admin. El backend valida rol, límites de asientos y aislamiento. */
  team: {
    get: (tenantId: string) =>
      requestWithRefresh<TeamResponse>("/api/v1/team", { headers: tenantHeaders(tenantId) }),
    createInvitation: (tenantId: string, input: TeamInvitationInput) =>
      requestWithRefresh<TeamInvitationCreated>("/api/v1/team/invitations", {
        method: "POST",
        headers: tenantHeaders(tenantId),
        body: JSON.stringify(input),
      }),
    /** Invalida el token anterior y devuelve uno nuevo (se muestra una vez). */
    resendInvitation: (tenantId: string, invitationId: string) =>
      requestWithRefresh<TeamInvitationCreated>(`/api/v1/team/invitations/${invitationId}/resend`, {
        method: "POST",
        headers: tenantHeaders(tenantId),
        body: JSON.stringify({}),
      }),
    revokeInvitation: (tenantId: string, invitationId: string) =>
      requestWithRefresh<void>(`/api/v1/team/invitations/${invitationId}`, {
        method: "DELETE",
        headers: tenantHeaders(tenantId),
      }),
  },
  /** Endpoints públicos por token de invitación. Nunca se envía sesión salvo en `acceptWithSession`. */
  publicInvitations: {
    get: (token: string) =>
      publicRequest<PublicInvitation>(`/api/v1/public/invitations/${encodeURIComponent(token)}`),
    /** Usuario nuevo: crea la cuenta y la membresía. */
    acceptNewUser: (token: string, input: InvitationAcceptInput) =>
      publicRequest<InvitationAcceptResponse>(
        `/api/v1/public/invitations/${encodeURIComponent(token)}/accept`,
        { method: "POST", body: JSON.stringify(input) },
      ),
    /** Usuario ya autenticado: el backend valida que el email coincida con la invitación. */
    acceptWithSession: (token: string) =>
      requestWithRefresh<InvitationAcceptResponse>(
        `/api/v1/public/invitations/${encodeURIComponent(token)}/accept`,
        { method: "POST", body: JSON.stringify({}) },
      ),
  },
  /** Acceso al portal del cliente desde su ficha. El frontend nunca genera tokens. */
  portalAccess: {
    create: (tenantId: string, customerId: string, sendEmail: boolean) =>
      requestWithRefresh<PortalAccess>(`/api/v1/customers/${customerId}/portal-access`, {
        method: "POST",
        headers: tenantHeaders(tenantId),
        body: JSON.stringify({ send_email: sendEmail }),
      }),
    /** Revoca los accesos vigentes del cliente. */
    revoke: (tenantId: string, customerId: string) =>
      requestWithRefresh<void>(`/api/v1/customers/${customerId}/portal-access/revoke`, {
        method: "POST",
        headers: tenantHeaders(tenantId),
        body: JSON.stringify({}),
      }),
  },
};
