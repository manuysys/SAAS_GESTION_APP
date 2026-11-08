"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { useState } from "react";

import { AppointmentForm } from "@/components/agenda/appointment-form";
import {
  appointmentStatusLabel,
  appointmentStatusStyle,
  dayBoundsIso,
  formatTimeArgentina,
  shiftDay,
  todayArgentinaDay,
} from "@/lib/agenda";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDateOnly } from "@/lib/utils";

const navButtonClass =
  "inline-flex items-center justify-center rounded-lg border border-zinc-300 p-2 text-zinc-700 hover:bg-zinc-50";

export default function AgendaPage() {
  const { activeTenantId, tenants } = useAuth();
  const queryClient = useQueryClient();
  const [day, setDay] = useState(() => todayArgentinaDay());
  const [showForm, setShowForm] = useState(false);
  const activeTenant = tenants.find((tenant) => tenant.id === activeTenantId);

  const canWrite = ["owner", "admin", "dispatcher"].includes(activeTenant?.role ?? "");
  const appointmentsQuery = useQuery({
    queryKey: ["appointments", activeTenantId, day],
    queryFn: () => api.appointments.list(activeTenantId ?? "", dayBoundsIso(day)),
    enabled: Boolean(activeTenantId),
  });

  const ordersQuery = useQuery({
    queryKey: ["work-orders", activeTenantId],
    queryFn: () => api.workOrders.list(activeTenantId ?? ""),
    enabled: Boolean(activeTenantId),
  });

  const techniciansQuery = useQuery({
    queryKey: ["technicians", activeTenantId],
    queryFn: () => api.technicians.list(activeTenantId ?? ""),
    enabled: Boolean(activeTenantId),
  });

  const cancelMutation = useMutation({
    mutationFn: (appointmentId: string) =>
      api.appointments.cancel(activeTenantId ?? "", appointmentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["appointments", activeTenantId] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-summary", activeTenantId] });
    },
  });

  if (!activeTenantId) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-sm text-zinc-600">
        No hay una empresa activa.
      </div>
    );
  }

  const orders = ordersQuery.data?.items ?? [];
  const technicians = techniciansQuery.data ?? [];
  const appointments = appointmentsQuery.data?.items ?? [];
  const openOrders = orders.filter(
    (order) => order.operational_status !== "finished" && order.operational_status !== "cancelled",
  );
  const orderLabel = (id: string) => {
    const order = orders.find((item) => item.id === id);
    return order ? `${order.code} · ${order.title}` : "Orden";
  };
  const technicianName = (id: string) =>
    technicians.find((technician) => technician.id === id)?.full_name ?? "Sin técnico";
  const cancelError = cancelMutation.error
    ? errorMessage(cancelMutation.error, "No se pudo cancelar el turno")
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agenda</h1>
          <p className="mt-1 text-sm text-zinc-600">
            {appointments.length} {appointments.length === 1 ? "turno" : "turnos"} el{" "}
            {formatDateOnly(day)} en {activeTenant?.name ?? "tu empresa"}.
          </p>
        </div>
        {canWrite && (
          <button
            type="button"
            onClick={() => {
              setShowForm((value) => !value);
            }}
            aria-expanded={showForm}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700"
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? "Cancelar" : "Nuevo turno"}
          </button>
        )}
      </div>

      {canWrite && showForm && (
        <AppointmentForm
          tenantId={activeTenantId}
          day={day}
          orders={openOrders}
          technicians={technicians}
          onDone={() => setShowForm(false)}
        />
      )}

      <div className="rounded-2xl border border-zinc-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-zinc-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDay((current) => shiftDay(current, -1))}
              className={navButtonClass}
              aria-label="Día anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <label htmlFor="agenda-day" className="sr-only">
              Día de la agenda
            </label>
            <input
              id="agenda-day"
              type="date"
              value={day}
              onChange={(event) => {
                if (event.target.value) setDay(event.target.value);
              }}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => setDay((current) => shiftDay(current, 1))}
              className={navButtonClass}
              aria-label="Día siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setDay(todayArgentinaDay())}
            disabled={day === todayArgentinaDay()}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            Hoy
          </button>
        </div>

        {cancelError && (
          <p role="alert" className="mx-4 mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {cancelError}
          </p>
        )}

        {appointmentsQuery.isLoading ? (
          <p className="p-6 text-sm text-zinc-500">Cargando turnos...</p>
        ) : appointmentsQuery.isError ? (
          <p className="p-6 text-sm text-red-600">No se pudieron cargar los turnos.</p>
        ) : appointments.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-medium text-zinc-800">No hay turnos para este día</p>
            <p className="mt-1 text-sm text-zinc-500">
              Creá un turno para asignar un técnico a una orden.
            </p>
          </div>
        ) : (
          <ol className="divide-y divide-zinc-100">
            {appointments.map((appointment) => {
              const isCancelling =
                cancelMutation.isPending && cancelMutation.variables === appointment.id;
              const timeRange = `${formatTimeArgentina(appointment.starts_at)} – ${formatTimeArgentina(appointment.ends_at)}`;
              const canCancel = appointment.status === "scheduled";
              return (
                <li
                  key={appointment.id}
                  className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="font-mono text-sm font-semibold text-zinc-900">{timeRange}</p>
                    <p className="text-sm font-medium text-zinc-800">
                      {orderLabel(appointment.work_order_id)}
                    </p>
                    <p className="text-sm text-zinc-600">
                      Técnico: {technicianName(appointment.technician_id)}
                    </p>
                    {appointment.notes && (
                      <p className="text-xs text-zinc-500">{appointment.notes}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${appointmentStatusStyle(appointment.status)}`}
                    >
                      {appointmentStatusLabel(appointment.status)}
                    </span>
                    {canWrite && canCancel && (
                      <button
                        type="button"
                        onClick={() => cancelMutation.mutate(appointment.id)}
                        disabled={isCancelling}
                        aria-label={`Cancelar turno de ${timeRange}`}
                        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
                      >
                        {isCancelling ? "Cancelando..." : "Cancelar turno"}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
