"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  FileText,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";

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

  if (activeTenant && !canViewDashboard) {
    return <p className="text-sm text-zinc-600">Redirigiendo...</p>;
  }

  const summary = summaryQuery.data;
  const loading = summaryQuery.isLoading;
  const unavailable = summaryQuery.isError;
  const display = (value: string | number | undefined) => {
    if (loading) return "…";
    if (unavailable || value === undefined) return "—";
    return String(value);
  };

  const cards: {
    label: string;
    value: string;
    icon: LucideIcon;
    href: string;
    hint: string;
    detail?: string;
  }[] = [
    {
      label: "Clientes",
      value: display(summary?.customers_total),
      icon: Users,
      href: "/customers",
      hint: "Ver listado",
    },
    {
      label: "Órdenes abiertas",
      value: display(summary?.work_orders_open),
      icon: ClipboardList,
      href: "/orders",
      hint: "Ver órdenes",
      detail: summary && !unavailable ? `de ${summary.work_orders_total} en total` : undefined,
    },
    {
      label: "Presupuestos pendientes",
      value: display(summary?.quotes_pending),
      icon: FileText,
      href: "/quotes",
      hint: "Ver presupuestos",
      detail: summary && !unavailable ? `de ${summary.quotes_total} en total` : undefined,
    },
    {
      label: "Pendiente de cobro",
      value:
        loading || unavailable || !summary
          ? display(undefined)
          : formatCurrency(summary.pending_balance),
      icon: Wallet,
      href: "/payments",
      hint: "Ver pagos",
    },
    {
      label: "Turnos de hoy",
      value: display(summary?.appointments_today),
      icon: CalendarDays,
      href: "/agenda",
      hint: "Ver agenda",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Hola, {user?.full_name.split(" ")[0] ?? "bienvenido"}
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Este es el panel de <strong>{activeTenant?.name ?? "tu empresa"}</strong>.
        </p>
      </div>

      {unavailable && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          No se pudo cargar el resumen. Probá recargar la página.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-2xl border border-zinc-200 bg-white p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-zinc-600">{card.label}</p>
                <Icon className="h-4 w-4 shrink-0 text-zinc-400" />
              </div>
              <p className="mt-2 text-2xl font-semibold break-words">{card.value}</p>
              {card.detail && <p className="mt-1 text-xs text-zinc-500">{card.detail}</p>}
              <Link
                href={card.href}
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-zinc-700 hover:text-zinc-950"
              >
                {card.hint}
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold">Circuito operativo</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Registrá clientes y solicitudes, convertilas en órdenes, asigná técnicos, agendá turnos
            y cobrá con historial de eventos.
          </p>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-emerald-900">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                1
              </span>
              Empresa creada y sesión iniciada
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-emerald-900">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                2
              </span>
              Cliente, solicitud y orden de trabajo
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-emerald-900">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                3
              </span>
              Presupuestos para aprobación del cliente
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-emerald-900">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                4
              </span>
              Agenda de turnos y pagos registrados
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/agenda"
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700"
            >
              Agenda
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/payments"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
            >
              Pagos
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/quotes"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
            >
              Presupuestos
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/orders"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
            >
              Órdenes
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold">Estado del sistema</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-zinc-600">API</dt>
              <dd className="font-medium text-emerald-700">Conectada</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-zinc-600">Base de datos</dt>
              <dd className="font-medium text-emerald-700">PostgreSQL 17</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-zinc-600">Empresa activa</dt>
              <dd className="max-w-[150px] truncate font-medium">{activeTenant?.name ?? "—"}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-zinc-600">Rol</dt>
              <dd className="font-medium">{activeTenant?.role ?? "—"}</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
