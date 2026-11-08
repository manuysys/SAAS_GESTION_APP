"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Clock, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { TechnicianAssignment } from "@/components/orders/technician-assignment";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  OPERATIONAL_STATUS_LABELS,
  OPERATIONAL_STATUS_STYLES,
  OPERATIONAL_TRANSITIONS,
  PRIORITY_LABELS,
} from "@/lib/order-status";
import { formatDate } from "@/lib/utils";

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const orderId = params.id;
  const { activeTenantId, tenants } = useAuth();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState("");
  const [transitionError, setTransitionError] = useState<string | null>(null);
  const activeTenant = tenants.find((tenant) => tenant.id === activeTenantId);
  const canAssign = ["owner", "admin", "dispatcher"].includes(activeTenant?.role ?? "");

  const orderQuery = useQuery({
    queryKey: ["work-order", activeTenantId, orderId],
    queryFn: () => api.workOrders.get(activeTenantId ?? "", orderId),
    enabled: Boolean(activeTenantId && orderId),
  });

  const eventsQuery = useQuery({
    queryKey: ["work-order-events", activeTenantId, orderId],
    queryFn: () => api.workOrders.events(activeTenantId ?? "", orderId),
    enabled: Boolean(activeTenantId && orderId),
  });

  const customersQuery = useQuery({
    queryKey: ["customers", activeTenantId, ""],
    queryFn: () => api.customers.list(activeTenantId ?? ""),
    enabled: Boolean(activeTenantId),
  });

  const techniciansQuery = useQuery({
    queryKey: ["technicians", activeTenantId],
    queryFn: () => api.technicians.list(activeTenantId ?? ""),
    enabled: Boolean(activeTenantId) && canAssign,
  });

  const transitionMutation = useMutation({
    mutationFn: (toStatus: string) =>
      api.workOrders.transition(activeTenantId ?? "", orderId, toStatus, notes || undefined),
    onSuccess: () => {
      setNotes("");
      setTransitionError(null);
      void queryClient.invalidateQueries({ queryKey: ["work-order", activeTenantId, orderId] });
      void queryClient.invalidateQueries({
        queryKey: ["work-order-events", activeTenantId, orderId],
      });
      void queryClient.invalidateQueries({ queryKey: ["work-orders", activeTenantId] });
    },
    onError: (error) => {
      setTransitionError(error instanceof ApiError ? error.detail : "No se pudo cambiar el estado");
    },
  });

  if (!activeTenantId) {
    return <p className="text-sm text-zinc-600">No hay una empresa activa.</p>;
  }

  if (orderQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-600">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando orden...
      </div>
    );
  }

  if (orderQuery.isError || !orderQuery.data) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-8">
        <p className="text-sm font-medium text-zinc-800">No se encontró la orden</p>
        <Link href="/orders" className="mt-3 inline-block text-sm text-zinc-700 underline">
          Volver a órdenes
        </Link>
      </div>
    );
  }

  const order = orderQuery.data;
  const customer = customersQuery.data?.items.find((item) => item.id === order.customer_id);
  const nextStatuses = OPERATIONAL_TRANSITIONS[order.operational_status] ?? [];
  const events = eventsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <Link
        href="/orders"
        className="inline-flex items-center gap-1 text-sm font-medium text-zinc-600 hover:text-zinc-950"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a órdenes
      </Link>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-mono text-xs text-zinc-500">{order.code}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">{order.title}</h1>
            <p className="mt-1 text-sm text-zinc-600">
              {customer?.name ?? "Cliente"} · {activeTenant?.name ?? "Empresa"}
            </p>
          </div>
          <span
            className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${
              OPERATIONAL_STATUS_STYLES[order.operational_status] ?? "bg-zinc-100 text-zinc-700"
            }`}
          >
            {OPERATIONAL_STATUS_LABELS[order.operational_status] ?? order.operational_status}
          </span>
        </div>

        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs text-zinc-500">Prioridad</dt>
            <dd className="mt-1 font-medium">
              {PRIORITY_LABELS[order.priority] ?? order.priority}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Programada</dt>
            <dd className="mt-1 font-medium">
              {order.scheduled_at ? formatDate(order.scheduled_at) : "Sin programar"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Iniciada</dt>
            <dd className="mt-1 font-medium">
              {order.started_at ? formatDate(order.started_at) : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Finalizada</dt>
            <dd className="mt-1 font-medium">
              {order.finished_at ? formatDate(order.finished_at) : "—"}
            </dd>
          </div>
        </dl>

        {order.description && (
          <p className="mt-6 rounded-lg bg-zinc-50 p-4 text-sm text-zinc-700">
            {order.description}
          </p>
        )}
      </div>

      {canAssign && (
        <TechnicianAssignment
          key={order.id}
          tenantId={activeTenantId}
          order={order}
          technicians={techniciansQuery.data ?? []}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-zinc-200 bg-white p-6">
          <h2 className="text-sm font-semibold">Cambiar estado</h2>
          {nextStatuses.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">
              Esta orden no tiene transiciones disponibles.
            </p>
          ) : (
            <>
              <label htmlFor="notes" className="mt-4 block text-xs font-medium text-zinc-600">
                Nota (opcional)
              </label>
              <textarea
                id="notes"
                rows={2}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                placeholder="Ej.: Se reprogramó por falta de repuesto"
              />
              <div className="mt-4 flex flex-wrap gap-2">
                {nextStatuses.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => transitionMutation.mutate(status)}
                    disabled={transitionMutation.isPending}
                    className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-semibold text-white hover:bg-zinc-700 disabled:opacity-60"
                  >
                    {OPERATIONAL_STATUS_LABELS[status] ?? status}
                  </button>
                ))}
              </div>
            </>
          )}
          {transitionError && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {transitionError}
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Clock className="h-4 w-4 text-zinc-400" />
            Historial
          </h2>
          {events.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">Sin eventos registrados.</p>
          ) : (
            <ol className="mt-4 space-y-3">
              {events.map((event) => (
                <li key={event.id} className="border-l-2 border-zinc-200 pl-3">
                  <p className="text-sm font-medium text-zinc-800">
                    {event.event_type === "created" || event.event_type === "created_from_request"
                      ? "Orden creada"
                      : `Estado: ${
                          OPERATIONAL_STATUS_LABELS[event.to_status ?? ""] ?? event.to_status ?? "—"
                        }`}
                  </p>
                  <p className="text-xs text-zinc-500">{formatDate(event.created_at)}</p>
                  {event.payload && typeof event.payload.notes === "string" && (
                    <p className="mt-1 text-xs text-zinc-600">{event.payload.notes}</p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
