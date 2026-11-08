"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarClock, Loader2, Phone } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { TechShell } from "@/components/tech/tech-shell";
import { TechnicianAttachments } from "@/components/tech/technician-attachments";
import { TechnicianMaterials } from "@/components/tech/technician-materials";
import { TechnicianNoteForm } from "@/components/tech/technician-note-form";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  OPERATIONAL_STATUS_LABELS,
  OPERATIONAL_STATUS_STYLES,
  PRIORITY_LABELS,
} from "@/lib/order-status";
import { technicianActions } from "@/lib/technician";
import { formatDate } from "@/lib/utils";

export default function TechOrderDetailPage() {
  return (
    <TechShell>
      <TechOrderDetail />
    </TechShell>
  );
}

function TechOrderDetail() {
  const params = useParams<{ id: string }>();
  const orderId = params.id;
  const { activeTenantId } = useAuth();
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const tenantId = activeTenantId ?? "";

  const orderQuery = useQuery({
    queryKey: ["tech-work-order", tenantId, orderId],
    queryFn: () => api.technicianWorkOrders.get(tenantId, orderId),
    enabled: Boolean(tenantId && orderId),
  });

  const transitionMutation = useMutation({
    mutationFn: (toStatus: string) =>
      api.technicianWorkOrders.transition(tenantId, orderId, toStatus),
    onSuccess: () => {
      setActionError(null);
      void queryClient.invalidateQueries({ queryKey: ["tech-work-order", tenantId, orderId] });
      void queryClient.invalidateQueries({ queryKey: ["tech-work-orders", tenantId] });
    },
    onError: (error) => {
      setActionError(errorMessage(error, "No se pudo cambiar el estado"));
    },
  });

  if (!activeTenantId) {
    return <p className="text-sm text-zinc-600">No hay una empresa activa.</p>;
  }

  if (orderQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-zinc-600">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Cargando orden...
      </div>
    );
  }

  if (orderQuery.isError || !orderQuery.data) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-6">
        <p className="text-sm font-medium text-zinc-800">No se encontró la orden</p>
        <p className="mt-1 text-sm text-zinc-500">
          Puede que ya no esté asignada a vos o que haya un problema de conexión.
        </p>
        <Link
          href="/tech"
          className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-zinc-900 underline"
        >
          Volver a mis trabajos
        </Link>
      </div>
    );
  }

  const order = orderQuery.data;
  const actions = technicianActions(order.operational_status);
  const phoneDigits = order.customer_phone?.replace(/[^\d+]/g, "") ?? "";

  return (
    <div className="space-y-4">
      <Link
        href="/tech"
        className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-zinc-700 hover:text-zinc-950"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Mis trabajos
      </Link>

      <section
        aria-labelledby="tech-order-title"
        className="rounded-2xl border border-zinc-200 bg-white p-4"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              OPERATIONAL_STATUS_STYLES[order.operational_status] ?? "bg-zinc-100 text-zinc-700"
            }`}
          >
            {OPERATIONAL_STATUS_LABELS[order.operational_status] ?? order.operational_status}
          </span>
          <span className="text-xs text-zinc-500">
            Prioridad {PRIORITY_LABELS[order.priority] ?? order.priority}
          </span>
        </div>
        <p className="mt-3 font-mono text-xs text-zinc-500">{order.code}</p>
        <h1
          id="tech-order-title"
          className="mt-1 text-xl leading-snug font-semibold tracking-tight"
        >
          {order.title}
        </h1>
        {order.description && (
          <p className="mt-3 rounded-lg bg-zinc-50 p-3 text-sm whitespace-pre-line text-zinc-700">
            {order.description}
          </p>
        )}
        <p className="mt-3 flex items-center gap-1.5 text-sm text-zinc-600">
          <CalendarClock className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />
          {order.scheduled_at ? `Programada: ${formatDate(order.scheduled_at)}` : "Sin programar"}
        </p>
      </section>

      <section
        aria-labelledby="tech-customer-title"
        className="rounded-2xl border border-zinc-200 bg-white p-4"
      >
        <h2
          id="tech-customer-title"
          className="text-xs font-medium tracking-wide text-zinc-500 uppercase"
        >
          Cliente
        </h2>
        <p className="mt-1 text-base font-semibold text-zinc-950">
          {order.customer_name ?? "Cliente sin nombre"}
        </p>
        {order.customer_phone && phoneDigits ? (
          <a
            href={`tel:${phoneDigits}`}
            className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-zinc-900 px-4 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
          >
            <Phone className="h-4 w-4" aria-hidden="true" />
            Llamar a {order.customer_phone}
          </a>
        ) : (
          <p className="mt-2 text-sm text-zinc-500">El cliente no tiene teléfono cargado.</p>
        )}
      </section>

      <section
        aria-labelledby="tech-actions-title"
        className="rounded-2xl border border-zinc-200 bg-white p-4"
      >
        <h2 id="tech-actions-title" className="text-base font-semibold">
          Estado del trabajo
        </h2>
        {actions.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">Esta orden no tiene acciones disponibles.</p>
        ) : (
          <div className="mt-3 grid gap-3">
            {actions.map((action) => (
              <button
                key={action.to}
                type="button"
                onClick={() => {
                  setActionError(null);
                  transitionMutation.mutate(action.to);
                }}
                disabled={transitionMutation.isPending}
                className={`min-h-14 w-full rounded-lg px-4 text-base font-semibold disabled:opacity-60 ${
                  action.to === "finished"
                    ? "bg-zinc-900 text-white hover:bg-zinc-700"
                    : "border border-zinc-900 text-zinc-900 hover:bg-zinc-50"
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
        {transitionMutation.isPending && (
          <p role="status" className="mt-3 text-sm text-zinc-600">
            Actualizando estado...
          </p>
        )}
        {actionError && (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {actionError}
          </p>
        )}
      </section>

      <TechnicianNoteForm tenantId={tenantId} orderId={orderId} />
      <TechnicianMaterials tenantId={tenantId} orderId={orderId} />
      <TechnicianAttachments tenantId={tenantId} orderId={orderId} />
    </div>
  );
}
