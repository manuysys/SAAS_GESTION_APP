"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ClipboardList,
  FileText,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressRing } from "@/components/ui/progress-ring";
import { StatCard } from "@/components/ui/stat-card";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

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

export default function DashboardPage() {
  const { user, activeTenantId, tenants } = useAuth();
  const router = useRouter();
  const activeTenant = tenants.find((tenant) => tenant.id === activeTenantId);
  const role = activeTenant?.role ?? "";
  const canViewDashboard = ["owner", "admin", "dispatcher"].includes(role);
  const isTechnician = role === "technician";

  useEffect(() => {
    if (!activeTenant || canViewDashboard) return;
    router.replace(isTechnician ? "/tech" : "/orders");
  }, [activeTenant, canViewDashboard, isTechnician, router]);

  const summaryQuery = useQuery({
    queryKey: ["dashboard-summary", activeTenantId],
    queryFn: () => api.dashboard.summary(activeTenantId ?? ""),
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
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Salud operativa</CardTitle>
              <p className="text-slate mt-1 text-sm">
                Proporción de trabajo abierto y presupuestos sin responder.
              </p>
            </div>
            <Badge variant="teal" className="shrink-0">
              Datos reales
            </Badge>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="border-mist rounded-2xl border bg-white p-4">
                <ProgressRing
                  value={summary?.work_orders_open ?? 0}
                  max={summary?.work_orders_total ?? 0}
                  label="Órdenes abiertas"
                  detail={
                    summary && !unavailable
                      ? `${summary.work_orders_open} de ${summary.work_orders_total}`
                      : "Sin datos"
                  }
                  color="teal"
                />
              </div>
              <div className="border-mist rounded-2xl border bg-white p-4">
                <ProgressRing
                  value={summary?.quotes_pending ?? 0}
                  max={summary?.quotes_total ?? 0}
                  label="Presupuestos pendientes"
                  detail={
                    summary && !unavailable
                      ? `${summary.quotes_pending} de ${summary.quotes_total}`
                      : "Sin datos"
                  }
                  color="amber"
                />
              </div>
            </div>

            <ol className="space-y-2.5">
              {[
                "Cliente, solicitud y orden de trabajo",
                "Presupuesto enviado y aprobado por el cliente",
                "Turno asignado y trabajo cerrado por el técnico",
                "Pago registrado y saldo actualizado",
              ].map((step, index) => (
                <li
                  key={step}
                  className="border-mist bg-paper/60 flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm"
                >
                  <span className="bg-ink flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white">
                    {index + 1}
                  </span>
                  <span className="text-ink">{step}</span>
                  {index === 0 && (
                    <ArrowUpRight className="text-teal ml-auto h-4 w-4" aria-hidden="true" />
                  )}
                </li>
              ))}
            </ol>

            <div className="flex flex-wrap gap-2">
              <Link href="/orders" className={buttonVariants({ variant: "primary" })}>
                Ver órdenes
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link href="/quotes" className={buttonVariants({ variant: "outline" })}>
                Presupuestos
              </Link>
              <Link href="/agenda" className={buttonVariants({ variant: "outline" })}>
                Agenda
              </Link>
            </div>
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
