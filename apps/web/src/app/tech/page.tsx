"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarClock, ChevronRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { TechShell } from "@/components/tech/tech-shell";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { OPERATIONAL_STATUS_LABELS, PRIORITY_LABELS } from "@/lib/order-status";
import { cn, formatDate } from "@/lib/utils";

const filters = [
  { value: "", label: "Todas" },
  { value: "scheduled", label: "Programadas" },
  { value: "in_progress", label: "En ejecución" },
  { value: "waiting", label: "En espera" },
  { value: "finished", label: "Finalizadas" },
] as const;

const statusVariant: Record<string, "neutral" | "success" | "warning" | "danger" | "info" | "teal"> = {
  new: "neutral",
  scheduled: "info",
  in_progress: "warning",
  waiting: "teal",
  finished: "success",
  cancelled: "danger",
};

export default function TechOrdersPage() {
  return (
    <TechShell>
      <TechOrdersList />
    </TechShell>
  );
}

function TechOrdersList() {
  const { activeTenantId } = useAuth();
  const [filter, setFilter] = useState<string>("");

  const ordersQuery = useQuery({
    queryKey: ["tech-work-orders", activeTenantId, filter],
    queryFn: () => api.technicianWorkOrders.list(activeTenantId ?? "", filter || undefined),
    enabled: Boolean(activeTenantId),
  });

  if (!activeTenantId) {
    return <p className="text-slate text-sm">No hay una empresa activa.</p>;
  }

  if (ordersQuery.isLoading) {
    return (
      <div className="text-slate flex items-center gap-2 py-8 text-sm">
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
          className="bg-ink mt-4 min-h-12 w-full rounded-xl px-4 text-sm font-semibold text-white"
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
        <p className="text-teal text-xs font-semibold tracking-[0.14em] uppercase">Técnico</p>
        <h1 className="text-ink font-display mt-1 text-2xl font-semibold tracking-tight">
          Mis trabajos
        </h1>
        <p className="text-slate mt-1 text-sm">
          {orders.length === 1 ? "1 orden asignada" : `${orders.length} órdenes asignadas`}
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filtrar trabajos">
        {filters.map((item) => {
          const active = filter === item.value;
          return (
            <button
              key={item.value || "all"}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(item.value)}
              className={cn(
                "min-h-10 shrink-0 rounded-full px-3.5 text-sm font-medium transition-colors",
                active
                  ? "bg-ink text-white"
                  : "border-mist text-slate border bg-white hover:bg-paper",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {orders.length === 0 ? (
        <EmptyState
          title={filter ? "No hay trabajos en este estado" : "No tenés trabajos asignados"}
          description={
            filter
              ? "Probá con otro filtro o volvé a todas las órdenes."
              : "Cuando el despachador te asigne una orden, aparece acá."
          }
        />
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/tech/orders/${order.id}`}
                className="border-mist hover:border-teal/40 focus-visible:outline-teal flex min-h-20 items-center gap-3 rounded-2xl border bg-white p-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={statusVariant[order.operational_status] ?? "neutral"}>
                      {OPERATIONAL_STATUS_LABELS[order.operational_status] ??
                        order.operational_status}
                    </Badge>
                    <span className="text-slate text-xs">
                      Prioridad {PRIORITY_LABELS[order.priority] ?? order.priority}
                    </span>
                  </div>
                  <p className="text-slate font-mono text-xs">{order.code}</p>
                  <p className="text-ink text-base leading-snug font-semibold">{order.title}</p>
                  <p className="text-slate truncate text-sm">{order.customer_name ?? "Cliente"}</p>
                  <p className="text-slate flex items-center gap-1.5 text-xs">
                    <CalendarClock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {order.scheduled_at
                      ? `Programada: ${formatDate(order.scheduled_at)}`
                      : "Sin programar"}
                  </p>
                </div>
                <span className="text-ink flex shrink-0 items-center gap-1 text-sm font-semibold">
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
