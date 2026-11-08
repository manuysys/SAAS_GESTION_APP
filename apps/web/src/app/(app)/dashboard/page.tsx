"use client";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ClipboardList, FileText, Users, Wallet } from "lucide-react";
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

  const totalCustomers = customersQuery.data?.total ?? 0;

  const cards = [
    {
      label: "Clientes",
      value: customersQuery.isLoading ? "â€¦" : String(totalCustomers),
      icon: Users,
      href: "/customers",
      hint: "Ver listado",
    },
    {
      label: "Ã“rdenes abiertas",
      value: "0",
      icon: ClipboardList,
      hint: "PrÃ³ximamente",
    },
    {
      label: "Presupuestos sin aprobar",
      value: "0",
      icon: FileText,
      hint: "PrÃ³ximamente",
    },
    {
      label: "Pendiente de cobro",
      value: formatCurrency(0),
      icon: Wallet,
      hint: "PrÃ³ximamente",
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-2xl border border-zinc-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-600">{card.label}</p>
                <Icon className="h-4 w-4 text-zinc-400" />
              </div>
              <p className="mt-2 text-2xl font-semibold">{card.value}</p>
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
          <h2 className="text-sm font-semibold">Primeros pasos</h2>
          <p className="mt-1 text-sm text-zinc-600">
            El vertical slice actual permite registrar clientes. Las Ã³rdenes, presupuestos y agenda
            se incorporan en los prÃ³ximos hitos.
          </p>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-emerald-900">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                1
              </span>
              Empresa creada y sesiÃ³n iniciada
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2 text-zinc-700">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-300 text-[10px] font-bold text-zinc-700">
                2
              </span>
              RegistrÃ¡ tu primer cliente
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2 text-zinc-500">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-bold text-zinc-500">
                3
              </span>
              Crear una solicitud y una orden de trabajo
            </div>
          </div>
          <Link
            href="/customers"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700"
          >
            Ir a clientes
            <ArrowRight className="h-4 w-4" />
          </Link>
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
              <dd className="max-w-[150px] truncate font-medium">{activeTenant?.name ?? "â€”"}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-zinc-600">Rol</dt>
              <dd className="font-medium">{activeTenant?.role ?? "â€”"}</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
