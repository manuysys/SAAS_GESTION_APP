"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarClock, ChevronRight, Loader2 } from "lucide-react";
import Link from "next/link";

import { TechShell } from "@/components/tech/tech-shell";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  OPERATIONAL_STATUS_LABELS,
  OPERATIONAL_STATUS_STYLES,
  PRIORITY_LABELS,
} from "@/lib/order-status";
import { formatDate } from "@/lib/utils";

export default function TechOrdersPage() {
  return (
    <TechShell>
      <TechOrdersList />
    </TechShell>
  );
}

function TechOrdersList() {
  const { activeTenantId } = useAuth();

  const ordersQuery = useQuery({
    queryKey: ["tech-work-orders", activeTenantId],
    queryFn: () => api.technicianWorkOrders.list(activeTenantId ?? ""),
    enabled: Boolean(activeTenantId),
  });

  if (!activeTenantId) {
    return <p className="text-sm text-zinc-600">No hay una empresa activa.</p>;
  }

  if (ordersQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-zinc-600">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Cargando tus trabajos...
      </div>
    );
  }

  if (ordersQuery.isError) {
    return (
      <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5">
        <p className="text-sm font-medium text-red-800">No se pudieron cargar tus trabajos.</p>
        <p className="mt-1 text-sm text-red-700">Revisá la conexión y volvé a intentar.</p>
        <button
          type="button"
          onClick={() => void ordersQuery.refetch()}
          className="mt-4 min-h-12 w-full rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const orders = ordersQuery.data?.items ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Mis trabajos</h1>
        <p className="mt-1 text-sm text-zinc-600">
          {orders.length === 1 ? "1 orden asignada" : `${orders.length} órdenes asignadas`}
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-center">
          <p className="text-sm font-medium text-zinc-800">No tenés trabajos asignados</p>
          <p className="mt-1 text-sm text-zinc-500">
            Cuando el despachador te asigne una orden, aparece acá.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/tech/orders/${order.id}`}
                className="flex min-h-20 items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 hover:border-zinc-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
              >
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        OPERATIONAL_STATUS_STYLES[order.operational_status] ??
                        "bg-zinc-100 text-zinc-700"
                      }`}
                    >
                      {OPERATIONAL_STATUS_LABELS[order.operational_status] ??
                        order.operational_status}
                    </span>
                    <span className="text-xs text-zinc-500">
                      Prioridad {PRIORITY_LABELS[order.priority] ?? order.priority}
                    </span>
                  </div>
                  <p className="font-mono text-xs text-zinc-500">{order.code}</p>
                  <p className="text-base leading-snug font-semibold text-zinc-950">
                    {order.title}
                  </p>
                  <p className="truncate text-sm text-zinc-700">{order.customer_name}</p>
                  <p className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <CalendarClock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {order.scheduled_at
                      ? `Programada: ${formatDate(order.scheduled_at)}`
                      : "Sin programar"}
                  </p>
                </div>
                <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-zinc-900">
                  Abrir
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
