"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { useState } from "react";

import { AppointmentForm } from "@/components/agenda/appointment-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import {
  appointmentStatusLabel,
  dayBoundsIso,
  formatTimeArgentina,
  shiftDay,
  todayArgentinaDay,
} from "@/lib/agenda";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDateOnly } from "@/lib/utils";

const statusVariant: Record<string, "success" | "danger" | "warning" | "neutral"> = {
  scheduled: "warning",
  completed: "success",
  cancelled: "danger",
};

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
    return <Card className="text-slate p-8 text-sm">No hay una empresa activa.</Card>;
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
  const isToday = day === todayArgentinaDay();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Agenda"
        title="Turnos y visitas"
        description={`${appointments.length} ${appointments.length === 1 ? "turno" : "turnos"} el ${formatDateOnly(day)} en ${activeTenant?.name ?? "tu empresa"}.`}
        actions={
          canWrite ? (
            <Button
              onClick={() => setShowForm((value) => !value)}
              aria-expanded={showForm}
              variant={showForm ? "outline" : "primary"}
            >
              {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showForm ? "Cancelar" : "Nuevo turno"}
            </Button>
          ) : undefined
        }
      />

      {canWrite && showForm && (
        <AppointmentForm
          tenantId={activeTenantId}
          day={day}
          orders={openOrders}
          technicians={technicians}
          onDone={() => setShowForm(false)}
        />
      )}

      <section className="bg-ink relative overflow-hidden rounded-3xl p-5 text-white sm:p-6">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-teal-300 flex items-center gap-2 text-xs font-semibold tracking-[0.16em] uppercase">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              {isToday ? "Hoy" : "Día seleccionado"}
            </p>
            <p className="font-display mt-2 text-2xl font-semibold tracking-tight">
              {formatDateOnly(day)}
            </p>
            <p className="mt-1 text-sm text-white/60">
              {appointments.length === 1
                ? "1 visita programada"
                : `${appointments.length} visitas programadas`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDay((current) => shiftDay(current, -1))}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 text-white hover:bg-white/10"
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
              className="h-10 rounded-xl border border-white/20 bg-white/10 px-3 text-sm text-white [color-scheme:dark]"
            />
            <button
              type="button"
              onClick={() => setDay((current) => shiftDay(current, 1))}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 text-white hover:bg-white/10"
              aria-label="Día siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setDay(todayArgentinaDay())}
              disabled={isToday}
              className="h-10 rounded-xl bg-amber px-3 text-sm font-semibold text-ink disabled:opacity-40"
            >
              Hoy
            </button>
          </div>
        </div>
      </section>

      {cancelError && (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {cancelError}
        </p>
      )}

      <Card>
        {appointmentsQuery.isLoading ? (
          <p className="text-slate p-6 text-sm">Cargando turnos...</p>
        ) : appointmentsQuery.isError ? (
          <p className="p-6 text-sm text-red-600">No se pudieron cargar los turnos.</p>
        ) : appointments.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={CalendarDays}
              title="No hay turnos para este día"
              description="Creá un turno para asignar un técnico a una orden."
              action={
                canWrite ? (
                  <Button onClick={() => setShowForm(true)}>
                    <Plus className="h-4 w-4" />
                    Nuevo turno
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <ol className="divide-mist divide-y">
            {appointments.map((appointment) => {
              const isCancelling =
                cancelMutation.isPending && cancelMutation.variables === appointment.id;
              const timeRange = `${formatTimeArgentina(appointment.starts_at)} – ${formatTimeArgentina(appointment.ends_at)}`;
              const canCancel = appointment.status === "scheduled";
              return (
                <li
                  key={appointment.id}
                  className="hover:bg-paper/60 flex flex-col gap-3 px-4 py-4 transition-colors sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="flex min-w-0 gap-3">
                    <div className="bg-ink flex h-12 w-20 shrink-0 items-center justify-center rounded-xl font-mono text-xs font-semibold text-white">
                      {formatTimeArgentina(appointment.starts_at)}
                    </div>
                    <div className="min-w-0 space-y-1">
                      <p className="text-ink text-sm font-semibold">
                        {orderLabel(appointment.work_order_id)}
                      </p>
                      <p className="text-slate text-sm">
                        Técnico: {technicianName(appointment.technician_id)}
                      </p>
                      <p className="text-slate/80 text-xs">{timeRange}</p>
                      {appointment.notes && (
                        <p className="text-slate text-xs">{appointment.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end">
                    <Badge variant={statusVariant[appointment.status] ?? "neutral"}>
                      {appointmentStatusLabel(appointment.status)}
                    </Badge>
                    {canWrite && canCancel && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => cancelMutation.mutate(appointment.id)}
                        disabled={isCancelling}
                        aria-label={`Cancelar turno de ${timeRange}`}
                        className="text-red-700 hover:bg-red-50"
                      >
                        {isCancelling ? "Cancelando..." : "Cancelar turno"}
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Card>
    </div>
  );
}
