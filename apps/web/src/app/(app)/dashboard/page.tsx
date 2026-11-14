"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  ClipboardList,
  Clock,
  FileText,
  Sparkles,
  Users,
  UserX,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { OnboardingChecklist } from "@/components/onboarding/onboarding-checklist";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { api, getAccessToken } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ADMIN_ROLES } from "@/lib/navigation";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const quickLinks = [
  { href: "/customers", label: "Clientes", icon: Users },
  { href: "/requests", label: "Solicitudes", icon: ClipboardList },
  { href: "/quotes", label: "Presupuestos", icon: FileText },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/payments", label: "Pagos", icon: Wallet },
  { href: "/assistant", label: "Asistente", icon: Sparkles },
];

const notificationVariant: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  success: "success",
  warning: "warning",
  error: "danger",
  danger: "danger",
  info: "info",
};

type DashboardAppointmentItem = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  order_code: string;
  order_title: string;
  customer_name: string;
  technician_name: string | null;
};

type DashboardOverdueOrderItem = {
  id: string;
  code: string;
  title: string;
  customer_name: string;
  operational_status: string;
  scheduled_at: string;
  days_overdue: number;
};

type DashboardUnassignedOrderItem = {
  id: string;
  code: string;
  title: string;
  customer_name: string;
  priority: string;
  created_at: string;
};

type DashboardExpiringQuoteItem = {
  id: string;
  number: string;
  customer_name: string;
  total: string;
  valid_until: string;
  days_left: number;
};

type DashboardFinishedWithBalanceItem = {
  id: string;
  code: string;
  title: string;
  customer_name: string;
  total: string;
  paid: string;
  balance: string;
};

type DashboardOperations = {
  today_appointments: DashboardAppointmentItem[];
  overdue_orders: DashboardOverdueOrderItem[];
  unassigned_orders: DashboardUnassignedOrderItem[];
  expiring_quotes: DashboardExpiringQuoteItem[];
  finished_with_balance: DashboardFinishedWithBalanceItem[];
  counts: {
    today_appointments: number;
    overdue_orders: number;
    unassigned_orders: number;
    expiring_quotes: number;
    finished_with_balance: number;
  };
};

async function fetchOperations(tenantId: string): Promise<DashboardOperations> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Tenant-ID": tenantId,
  };
  const token = getAccessToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const response = await fetch(`${API_URL}/api/v1/dashboard/operations`, {
    headers,
    credentials: "include",
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const detail = typeof body?.detail === "string" ? body.detail : "No se pudieron cargar las operaciones";
    throw new Error(detail);
  }
  return response.json() as Promise<DashboardOperations>;
}

function formatTime(value: string | Date) {
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(value));
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    new: "Nueva",
    scheduled: "Programada",
    in_progress: "En curso",
    waiting: "En espera",
    finished: "Finalizada",
    cancelled: "Cancelada",
    sent: "Enviado",
    approved: "Aprobado",
    rejected: "Rechazado",
    draft: "Borrador",
  };
  return labels[status] ?? status;
}

export default function DashboardPage() {
  const { user, activeTenantId, tenants } = useAuth();
  const router = useRouter();
  const activeTenant = tenants.find((tenant) => tenant.id === activeTenantId);
  const role = activeTenant?.role ?? "";
  const canViewDashboard = ["owner", "admin", "dispatcher"].includes(role);
  const isTechnician = role === "technician";
  /** La configuración inicial es solo para owner y admin (backend valida lo mismo). */
  const canManageOnboarding = ADMIN_ROLES.includes(role);

  useEffect(() => {
    if (!activeTenant || canViewDashboard) return;
    router.replace(isTechnician ? "/tech" : "/orders");
  }, [activeTenant, canViewDashboard, isTechnician, router]);

  const summaryQuery = useQuery({
    queryKey: ["dashboard-summary", activeTenantId],
    queryFn: () => api.dashboard.summary(activeTenantId ?? ""),
    enabled: Boolean(activeTenantId) && canViewDashboard,
  });

  const operationsQuery = useQuery({
    queryKey: ["dashboard-operations", activeTenantId],
    queryFn: () => fetchOperations(activeTenantId ?? ""),
    enabled: Boolean(activeTenantId) && canViewDashboard,
  });

  const activityQuery = useQuery({
    queryKey: ["notifications", activeTenantId],
    queryFn: () => api.notifications.list(activeTenantId ?? ""),
    enabled: Boolean(activeTenantId) && canViewDashboard,
  });

  if (activeTenant && !canViewDashboard) {
    return <p className="text-slate text-sm">Redirigiendo...</p>;
  }

  const summary = summaryQuery.data;
  const loading = summaryQuery.isLoading;
  const unavailable = summaryQuery.isError;
  const display = (value: string | number | undefined) => {
    if (loading) return "…";
    if (unavailable || value === undefined) return "—";
    return String(value);
  };
  const balance =
    loading || unavailable || !summary ? "—" : formatCurrency(summary.pending_balance);
  const notifications = activityQuery.data?.items.slice(0, 4) ?? [];
  const ops = operationsQuery.data;
  const opsLoading = operationsQuery.isLoading;

  return (
    <div className="space-y-6">
      <section className="bg-ink relative overflow-hidden rounded-3xl p-6 text-white sm:p-8">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.35) 1px, transparent 1px)",
            backgroundSize: "34px 34px",
          }}
        />
        <div aria-hidden="true" className="bg-teal/30 absolute -top-24 -right-20 h-64 w-64 rounded-full blur-3xl" />
        <div aria-hidden="true" className="bg-amber/20 absolute -bottom-32 left-1/3 h-64 w-64 rounded-full blur-3xl" />

        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <p className="text-teal-300 flex items-center gap-2 text-xs font-semibold tracking-[0.16em] uppercase">
              <span className="relative flex h-2 w-2">
                <span className="bg-teal absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" />
                <span className="bg-teal relative inline-flex h-2 w-2 rounded-full" />
              </span>
              Operación en vivo
            </p>
            <h1 className="font-display mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              Hola, {user?.full_name.split(" ")[0] ?? "bienvenido"}.
            </h1>
            <p className="mt-2 text-sm text-white/70">
              Este es el pulso de {activeTenant?.name ?? "tu empresa"}.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                href="/quotes"
                className={cn(
                  buttonVariants({ variant: "secondary" }),
                  "bg-amber text-ink hover:bg-amber/90",
                )}
              >
                Nuevo presupuesto
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/assistant"
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/20 px-4 text-sm font-semibold text-white hover:bg-white/10"
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Preguntale al asistente
              </Link>
            </div>
          </div>

          <dl className="grid grid-cols-3 gap-4 sm:gap-6">
            <div>
              <dt className="text-xs text-white/55">Órdenes abiertas</dt>
              <dd className="font-display mt-1 text-3xl font-semibold tracking-tight">
                {display(summary?.work_orders_open)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-white/55">Presupuestos pendientes</dt>
              <dd className="font-display mt-1 text-3xl font-semibold tracking-tight">
                {display(summary?.quotes_pending)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-white/55">Pendiente de cobro</dt>
              <dd className="font-display mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
                {balance}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {unavailable && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          No se pudo cargar el resumen. Probá recargar la página.
        </p>
      )}

      {canManageOnboarding && activeTenantId && (
        <OnboardingChecklist tenantId={activeTenantId} />
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Clientes"
          value={display(summary?.customers_total)}
          hint="Ver listado"
          icon={Users}
          tone="teal"
          className="border-teal/15 bg-teal/5"
        />
        <StatCard
          label="Órdenes abiertas"
          value={display(summary?.work_orders_open)}
          hint={summary && !unavailable ? `de ${summary.work_orders_total} en total` : "Ver órdenes"}
          icon={ClipboardList}
          tone="amber"
          className="border-amber/20 bg-amber/10"
        />
        <StatCard
          label="Presupuestos pendientes"
          value={display(summary?.quotes_pending)}
          hint={
            summary && !unavailable ? `de ${summary.quotes_total} en total` : "Ver presupuestos"
          }
          icon={FileText}
          tone="amber"
          className="border-amber/20 bg-amber/10"
        />
        <StatCard
          label="Pendiente de cobro"
          value={balance}
          hint="Ver pagos"
          icon={Wallet}
          tone="teal"
          className="border-teal/15 bg-teal/5"
        />
        <StatCard
          label="Turnos de hoy"
          value={display(summary?.appointments_today)}
          hint="Ver agenda"
          icon={CalendarDays}
          tone="default"
          className="border-ink/10 bg-ink/5"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="text-teal h-4 w-4" aria-hidden="true" />
                Hoy
              </CardTitle>
              <p className="text-slate mt-1 text-sm">
                Turnos del día{" "}
                {ops ? `(${ops.counts.today_appointments})` : "—"}
              </p>
            </div>
            <Link
              href="/agenda"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0")}
            >
              Ver agenda
            </Link>
          </CardHeader>
          <CardContent>
            {opsLoading ? (
              <p className="text-slate text-sm">Cargando turnos...</p>
            ) : !ops || ops.today_appointments.length === 0 ? (
              <p className="text-slate text-sm">
                No hay turnos agendados para hoy. Cuando asignes una visita, aparece acá.
              </p>
            ) : (
              <ul className="divide-mist divide-y">
                {ops.today_appointments.map((appointment) => (
                  <li key={appointment.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="bg-teal/10 text-teal flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-ink text-sm font-semibold">
                        {formatTime(appointment.starts_at)} · {appointment.order_title}
                      </p>
                      <p className="text-slate text-xs">{appointment.customer_name}</p>
                      {appointment.technician_name && (
                        <p className="text-slate/70 mt-0.5 text-[11px]">
                          Técnico: {appointment.technician_name}
                        </p>
                      )}
                    </div>
                    <Badge variant="neutral" className="h-fit shrink-0 text-[10px]">
                      {statusLabel(appointment.status)}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="text-amber h-4 w-4" aria-hidden="true" />
                Requiere atención
              </CardTitle>
              <p className="text-slate mt-1 text-sm">
                Atrasadas, sin técnico, presupuestos por vencer y saldos.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-ink flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
                  <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
                  Órdenes atrasadas{" "}
                  {ops ? `(${ops.counts.overdue_orders})` : "—"}
                </h4>
                <Link
                  href="/orders"
                  className="text-teal text-xs font-semibold hover:underline"
                >
                  Ver órdenes
                </Link>
              </div>
              {!ops || opsLoading ? (
                <p className="text-slate text-sm">Cargando...</p>
              ) : ops.overdue_orders.length === 0 ? (
                <p className="text-slate text-sm">No hay órdenes atrasadas. Todo en tiempo.</p>
              ) : (
                <ul className="divide-mist divide-y">
                  {ops.overdue_orders.map((order) => (
                    <li key={order.id} className="py-2 first:pt-0 last:pb-0">
                      <Link
                        href={`/orders/${order.id}`}
                        className="group flex items-start justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-ink truncate text-sm font-medium group-hover:text-teal">
                            {order.code} · {order.title}
                          </p>
                          <p className="text-slate text-xs">{order.customer_name}</p>
                        </div>
                        <Badge variant="danger" className="h-fit shrink-0 text-[10px]">
                          {order.days_overdue}d
                        </Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-ink flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
                  <UserX className="h-3.5 w-3.5" aria-hidden="true" />
                  Sin técnico{" "}
                  {ops ? `(${ops.counts.unassigned_orders})` : "—"}
                </h4>
                <Link
                  href="/orders"
                  className="text-teal text-xs font-semibold hover:underline"
                >
                  Asignar
                </Link>
              </div>
              {!ops || opsLoading ? (
                <p className="text-slate text-sm">Cargando...</p>
              ) : ops.unassigned_orders.length === 0 ? (
                <p className="text-slate text-sm">Todas las órdenes abiertas tienen técnico.</p>
              ) : (
                <ul className="divide-mist divide-y">
                  {ops.unassigned_orders.map((order) => (
                    <li key={order.id} className="py-2 first:pt-0 last:pb-0">
                      <Link
                        href={`/orders/${order.id}`}
                        className="group flex items-start justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-ink truncate text-sm font-medium group-hover:text-teal">
                            {order.code} · {order.title}
                          </p>
                          <p className="text-slate text-xs">{order.customer_name}</p>
                        </div>
                        <Badge variant="warning" className="h-fit shrink-0 text-[10px]">
                          {statusLabel(order.priority)}
                        </Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-ink flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
                  <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                  Presupuestos por vencer{" "}
                  {ops ? `(${ops.counts.expiring_quotes})` : "—"}
                </h4>
                <Link
                  href="/quotes"
                  className="text-teal text-xs font-semibold hover:underline"
                >
                  Ver presupuestos
                </Link>
              </div>
              {!ops || opsLoading ? (
                <p className="text-slate text-sm">Cargando...</p>
              ) : ops.expiring_quotes.length === 0 ? (
                <p className="text-slate text-sm">No hay presupuestos por vencer.</p>
              ) : (
                <ul className="divide-mist divide-y">
                  {ops.expiring_quotes.map((quote) => (
                    <li key={quote.id} className="py-2 first:pt-0 last:pb-0">
                      <Link
                        href={`/quotes/${quote.id}`}
                        className="group flex items-start justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-ink truncate text-sm font-medium group-hover:text-teal">
                            {quote.number} · {quote.customer_name}
                          </p>
                          <p className="text-slate text-xs">
                            Vence {formatDate(quote.valid_until)} ·{" "}
                            {formatCurrency(quote.total)}
                          </p>
                        </div>
                        <Badge variant="warning" className="h-fit shrink-0 text-[10px]">
                          {quote.days_left}d
                        </Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-ink flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
                  <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
                  Finalizadas con saldo{" "}
                  {ops ? `(${ops.counts.finished_with_balance})` : "—"}
                </h4>
                <Link
                  href="/payments"
                  className="text-teal text-xs font-semibold hover:underline"
                >
                  Ver pagos
                </Link>
              </div>
              {!ops || opsLoading ? (
                <p className="text-slate text-sm">Cargando...</p>
              ) : ops.finished_with_balance.length === 0 ? (
                <p className="text-slate text-sm">No hay órdenes finalizadas con saldo pendiente.</p>
              ) : (
                <ul className="divide-mist divide-y">
                  {ops.finished_with_balance.map((order) => (
                    <li key={order.id} className="py-2 first:pt-0 last:pb-0">
                      <Link
                        href={`/orders/${order.id}`}
                        className="group flex items-start justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-ink truncate text-sm font-medium group-hover:text-teal">
                            {order.code} · {order.title}
                          </p>
                          <p className="text-slate text-xs">
                            {order.customer_name} · pagado {formatCurrency(order.paid)} de{" "}
                            {formatCurrency(order.total)}
                          </p>
                        </div>
                        <Badge variant="danger" className="h-fit shrink-0 text-[10px]">
                          {formatCurrency(order.balance)}
                        </Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>Actividad reciente</CardTitle>
              <p className="text-slate mt-1 text-sm">Lo último que pasó en la empresa.</p>
            </div>
            <Activity className="text-teal h-4 w-4" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            {activityQuery.isLoading ? (
              <p className="text-slate text-sm">Cargando actividad...</p>
            ) : notifications.length === 0 ? (
              <p className="text-slate text-sm">
                Todavía no hay actividad. Cuando una automatización se dispare, aparece acá.
              </p>
            ) : (
              <ul className="divide-mist divide-y">
                {notifications.map((notification) => (
                  <li key={notification.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="bg-teal/10 text-teal mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
                      <Activity className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-ink text-sm font-semibold">{notification.title}</p>
                      <p className="text-slate line-clamp-2 text-xs">{notification.message}</p>
                      <p className="text-slate/70 mt-1 text-[11px]">
                        {formatDate(notification.created_at)}
                      </p>
                    </div>
                    <Badge
                      variant={notificationVariant[notification.type] ?? "neutral"}
                      className="ml-auto h-fit shrink-0"
                    >
                      {notification.type}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/notifications"
              className="text-teal mt-4 inline-flex items-center gap-1 text-xs font-semibold hover:underline"
            >
              Ver todas
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Accesos rápidos</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "border-mist hover:border-teal/40 hover:bg-teal/5 flex min-h-20 flex-col justify-between rounded-xl border p-3 transition-colors",
                )}
              >
                <Icon className="text-teal h-4 w-4" aria-hidden="true" />
                <span className="text-ink text-sm font-medium">{link.label}</span>
              </Link>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
