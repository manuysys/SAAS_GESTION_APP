"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { api, errorMessage, type Technician, type WorkOrder } from "@/lib/api";

const assignmentSchema = z.object({
  /** Cadena vacía = sin técnico asignado. */
  assigned_user_id: z.union([z.literal(""), z.uuid("Técnico inválido")]),
});

type AssignmentValues = z.infer<typeof assignmentSchema>;

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900";

type TechnicianAssignmentProps = {
  tenantId: string;
  order: WorkOrder;
  technicians: Technician[];
};

export function TechnicianAssignment({ tenantId, order, technicians }: TechnicianAssignmentProps) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<AssignmentValues>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: { assigned_user_id: order.assigned_user_id ?? "" },
  });

  const assignMutation = useMutation({
    mutationFn: (values: AssignmentValues) =>
      api.workOrders.update(tenantId, order.id, {
        assigned_user_id: values.assigned_user_id || null,
      }),
    onSuccess: (updated) => {
      reset({ assigned_user_id: updated.assigned_user_id ?? "" });
      void queryClient.invalidateQueries({ queryKey: ["work-order", tenantId, order.id] });
      void queryClient.invalidateQueries({ queryKey: ["work-orders", tenantId] });
    },
  });

  const formError = assignMutation.error
    ? errorMessage(assignMutation.error, "No se pudo guardar la asignación")
    : null;
  const showSaved = assignMutation.isSuccess && !isDirty;

  return (
    <section
      aria-labelledby="assignment-title"
      className="rounded-2xl border border-zinc-200 bg-white p-6"
    >
      <h2 id="assignment-title" className="text-sm font-semibold">
        Técnico asignado
      </h2>
      <form onSubmit={handleSubmit((values) => assignMutation.mutateAsync(values))} noValidate>
        <label htmlFor="assigned_user_id" className="mt-4 mb-1 block text-sm font-medium">
          Técnico
        </label>
        <select
          id="assigned_user_id"
          className={inputClass}
          aria-invalid={Boolean(errors.assigned_user_id)}
          {...register("assigned_user_id")}
        >
          <option value="">Sin técnico asignado</option>
          {technicians.map((technician) => (
            <option key={technician.id} value={technician.id}>
              {technician.full_name}
            </option>
          ))}
        </select>
        {errors.assigned_user_id && (
          <p className="mt-1 text-xs text-red-600">{errors.assigned_user_id.message}</p>
        )}
        {technicians.length === 0 && (
          <p className="mt-1 text-xs text-zinc-500">No hay técnicos cargados en la empresa.</p>
        )}

        {formError && (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {formError}
          </p>
        )}
        {showSaved && (
          <p role="status" className="mt-3 text-sm text-emerald-700">
            Asignación guardada.
          </p>
        )}

        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={!isDirty || assignMutation.isPending}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-60"
          >
            {assignMutation.isPending ? "Guardando..." : "Guardar asignación"}
          </button>
        </div>
      </form>
    </section>
  );
}
