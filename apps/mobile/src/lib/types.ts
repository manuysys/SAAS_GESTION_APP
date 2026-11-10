export type Tenant = {
  id: string;
  name: string;
  slug: string;
  role: string;
};

export type TechSession = {
  accessToken: string;
  refreshToken: string;
  tenants: Tenant[];
  tenantId: string;
};

export type TechWorkOrder = {
  id: string;
  tenant_id: string;
  customer_id: string;
  code: string;
  title: string;
  description: string | null;
  priority: string;
  operational_status: string;
  assigned_user_id: string | null;
  scheduled_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address?: string | null;
  customer_city?: string | null;
  customer_province?: string | null;
  customer_postal_code?: string | null;
};

export type WorkOrderMaterial = {
  id: string;
  work_order_id: string;
  description: string;
  quantity: string;
  unit: string;
  created_at: string;
};

export type WorkOrderAttachment = {
  id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
};

export type PortalCustomer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
};

export type PortalTenant = {
  id: string;
  name: string;
  slug: string;
};

export type PortalSession = {
  token: string;
  tenantSlug: string;
  tenant: PortalTenant;
  customer: PortalCustomer;
};

export type PortalSummary = {
  open_requests: number;
  open_orders: number;
  pending_quotes: number;
  next_appointment: PortalAppointment | null;
};

export type PortalAppointment = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  order_code?: string | null;
  order_title?: string | null;
  technician_name?: string | null;
};

export type PortalOrder = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  operational_status: string;
  priority: string;
  scheduled_at: string | null;
  created_at: string;
};

export type PortalQuoteItem = {
  description: string;
  quantity: string;
  unit_price: string;
  discount_rate: string;
  tax_rate: string;
  line_total: string;
};

export type PortalQuote = {
  id: string;
  number: string;
  status: string;
  currency?: string;
  subtotal?: string;
  discount_total?: string;
  tax_total?: string;
  total: string;
  valid_until: string | null;
  sent_at: string | null;
  items?: PortalQuoteItem[];
};

export type PortalPayment = {
  id: string;
  amount: string;
  currency: string;
  method: string;
  status: string;
  paid_at: string;
};

export type PortalRequest = {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  created_at: string;
};

export type PortalOrderDetail = PortalOrder & {
  appointments: PortalAppointment[];
  quotes: PortalQuote[];
};
