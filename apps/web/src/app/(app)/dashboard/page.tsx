"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ClipboardList,
  FileText,
  Inbox,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";

export default function DashboardPage() {
  const { user, activeTenantId, tenants } = useAuth();
  const activeTenant = tenants.find((tenant) => tenant.id === activeTenantId);

  const customersQuery = useQuery({
    queryKey: ["customers", activeTenantId, ""],
    queryFn: () => api.customers.list(activeTenantId ?? ""),
    enabled: Boolean(activeTenantId),
  });

  const ordersQuery = useQuery({
    queryKey: ["work-orders", activeTenantId],
    queryFn: () => api.workOrders.list(activeTenantId ?? ""),
    enabled: Boolean(activeTenantId),
  });

  const requestsQuery = useQuery({
    queryKey: ["service-requests", activeTenantId],
    queryFn: () => api.serviceRequests.list(activeTenantId ?? ""),
    enabled: Boolean(activeTenantId),
  });

  const quotesQuery = useQuery({
    queryKey: ["quotes", activeTenantId, ""],
    queryFn: () => api.quotes.list(activeTenantId ?? ""),
    enabled: Boolean(activeTenantId),
  });

  const pendingQuotesQuery = useQuery({
    queryKey: ["quotes", activeTenantId, "sent"],
    queryFn: () => api.quotes.list(activeTenantId ?? "", "sent"),
    enabled: Boolean(activeTenantId),
  });

  const totalCustomers = customersQuery.data?.total ?? 0;
  const totalOrders = ordersQuery.data?.total ?? 0;
  const totalRequests = requestsQuery.data?.total ?? 0;
  const totalQuotes = quotesQuery.data?.total ?? 0;
  const pendingQuotes = pendingQuotesQuery.data?.total ?? 0;

  const cards: {
    label: string;
    value: string;
    icon: LucideIcon;
    href?: string;
    hint: string;
    detail?: string;
  }[] = [
    {
      label: "Clientes",
      value: customersQuery.isLoading ? "…" : String(totalCustomers),
      icon: Users,
      href: "/customers",
      hint: "Ver listado",
    },
    {
      label: "Órdenes de trabajo",
      value: ordersQuery.isLoading ? "…" : String(totalOrders),
      icon: ClipboardList,
      href: "/orders",
      hint: "Ver órdenes",
    },
    {
      label: "Solicitudes",
      value: requestsQuery.isLoading ? "…" : String(totalRequests),
      icon: Inbox,
      href: "/requests",
      hint: "Ver solicitudes",
    },
    {
      label: "Presupuestos",
      value: quotesQuery.isLoading ? "…" : String(totalQuotes),
      icon: FileText,
      href: "/quotes",
      hint: "Ver presupuestos",
      detail: pendingQuotesQuery.isLoading
        ? undefined
        : `${pendingQuotes} ${pendingQuotes === 1 ? "pendiente" : "pendientes"} de respuesta`,
    },
    {
      label: "Pendiente de cobro",
      value: formatCurrency(0),
      icon: Wallet,
      hint: "Próximamente",
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-2xl border border-zinc-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-600">{card.label}</p>
                <Icon className="h-4 w-4 text-zinc-400" />
              </div>
              <p className="mt-2 text-2xl font-semibold">{card.value}</p>
              {card.detail && <p className="mt-1 text-xs text-zinc-500">{card.detail}</p>}
              {card.href ? (
                <Link
                  href={card.href}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-zinc-700 hover:text-zinc-950"
                >
                  {card.hint}
                  <ArrowRight className="h-3 w-3" />
                </Link>
              ) : (
                <p className="mt-3 text-xs text-zinc-400">{card.hint}</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold">Circuito operativo</h2>
          <p className="mt-1 text-sm text-zinc-600">
            El vertical slice actual permite registrar clientes, solicitudes y órdenes, y cambiar el
            estado del trabajo con historial de eventos.
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
            <div className="flex items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2 text-zinc-700">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-300 text-[10px] font-bold text-zinc-700">
                3
              </span>
              Presupuestos para aprobación del cliente
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2 text-zinc-700">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-300 text-[10px] font-bold text-zinc-700">
                4
              </span>
              Agenda y cobros
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/customers"
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700"
            >
              Clientes
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
              href="/requests"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
            >
              Solicitudes
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
