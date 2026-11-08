"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { api, errorMessage, type Technician, type WorkOrder } from "@/lib/api";
import { dateTimeLocalFromDay, localDateTimeToIso } from "@/lib/agenda";

const appointmentFormSchema = z
  .object({
    work_order_id: z.uuid("Seleccioná una orden"),
    technician_id: z.uuid("Seleccioná un técnico"),
    starts_at: z.string().min(1, "Ingresá el inicio"),
    ends_at: z.string().min(1, "Ingresá el fin"),
    notes: z.string().trim().max(2000, "Máximo 2000 caracteres"),
  })
  .refine((values) => Date.parse(values.ends_at) > Date.parse(values.starts_at), {
    message: "El fin debe ser posterior al inicio",
    path: ["ends_at"],
  });

type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900";
const labelClass = "mb-1 block text-sm font-medium";
const errorClass = "mt-1 text-xs text-red-600";

type AppointmentFormProps = {
  tenantId: string;
  /** Día `YYYY-MM-DD` usado para prellenar inicio (09:00) y fin (10:00). */
  day: string;
  orders: WorkOrder[];
  technicians: Technician[];
  onDone: () => void;
};

export function AppointmentForm({
  tenantId,
  day,
  orders,
  technicians,
  onDone,
}: AppointmentFormProps) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      work_order_id: "",
      technician_id: "",
      starts_at: dateTimeLocalFromDay(day, "09:00"),
      ends_at: dateTimeLocalFromDay(day, "10:00"),
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (values: AppointmentFormValues) =>
      api.appointments.create(tenantId, {
        work_order_id: values.work_order_id,
        technician_id: values.technician_id,
        starts_at: localDateTimeToIso(values.starts_at),
        ends_at: localDateTimeToIso(values.ends_at),
        notes: values.notes || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["appointments", tenantId] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-summary", tenantId] });
      onDone();
    },
  });

  const formError = createMutation.error
    ? errorMessage(createMutation.error, "No se pudo crear el turno")
    : null;

  return (
    <form
      onSubmit={handleSubmit((values) => createMutation.mutateAsync(values))}
      className="rounded-2xl border border-zinc-200 bg-white p-5"
      noValidate
    >
      <h2 className="text-sm font-semibold">Nuevo turno</h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="appointment-work-order" className={labelClass}>
            Orden de trabajo *
          </label>
          <select
            id="appointment-work-order"
            className={inputClass}
            aria-invalid={Boolean(errors.work_order_id)}
            {...register("work_order_id")}
          >
            <option value="">Seleccionar orden</option>
            {orders.map((order) => (
              <option key={order.id} value={order.id}>
                {order.code} · {order.title}
              </option>
            ))}
          </select>
          {errors.work_order_id && <p className={errorClass}>{errors.work_order_id.message}</p>}
        </div>

        <div>
          <label htmlFor="appointment-technician" className={labelClass}>
            Técnico *
          </label>
          <select
            id="appointment-technician"
            className={inputClass}
            aria-invalid={Boolean(errors.technician_id)}
            {...register("technician_id")}
          >
            <option value="">Seleccionar técnico</option>
            {technicians.map((technician) => (
              <option key={technician.id} value={technician.id}>
                {technician.full_name}
              </option>
            ))}
          </select>
          {errors.technician_id && <p className={errorClass}>{errors.technician_id.message}</p>}
          {technicians.length === 0 && (
            <p className="mt-1 text-xs text-zinc-500">No hay técnicos cargados en la empresa.</p>
          )}
        </div>

        <div>
          <label htmlFor="appointment-starts-at" className={labelClass}>
            Inicio *
          </label>
          <input
            id="appointment-starts-at"
            type="datetime-local"
            className={inputClass}
            aria-invalid={Boolean(errors.starts_at)}
            {...register("starts_at")}
          />
          {errors.starts_at && <p className={errorClass}>{errors.starts_at.message}</p>}
        </div>

        <div>
          <label htmlFor="appointment-ends-at" className={labelClass}>
            Fin *
          </label>
          <input
            id="appointment-ends-at"
            type="datetime-local"
            className={inputClass}
            aria-invalid={Boolean(errors.ends_at)}
            {...register("ends_at")}
          />
          {errors.ends_at && <p className={errorClass}>{errors.ends_at.message}</p>}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="appointment-notes" className={labelClass}>
            Notas
          </label>
          <textarea
            id="appointment-notes"
            rows={2}
            className={inputClass}
            placeholder="Ej.: Llevar escalera y repuesto de capacitor"
            aria-invalid={Boolean(errors.notes)}
            {...register("notes")}
          />
          {errors.notes && <p className={errorClass}>{errors.notes.message}</p>}
        </div>
      </div>

      {formError && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {formError}
        </p>
      )}

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting || createMutation.isPending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-60"
        >
          {createMutation.isPending ? "Guardando..." : "Guardar turno"}
        </button>
      </div>
    </form>
  );
}
