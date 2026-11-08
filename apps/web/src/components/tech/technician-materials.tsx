"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { api, errorMessage, type WorkOrderMaterialInput } from "@/lib/api";
import { MATERIAL_UNITS, normalizeQuantity } from "@/lib/technician";
import { formatDate, formatNumber } from "@/lib/utils";

const materialSchema = z.object({
  description: z
    .string()
    .trim()
    .min(2, "Describí el material")
    .max(200, "La descripción supera los 200 caracteres"),
  quantity: z
    .string()
    .trim()
    .refine(
      (value) => normalizeQuantity(value) !== null,
      "Ingresá una cantidad mayor a 0 (hasta 3 decimales)",
    ),
  unit: z.enum(MATERIAL_UNITS, { error: "Seleccioná una unidad" }),
});

type MaterialFormValues = z.infer<typeof materialSchema>;

type Props = {
  tenantId: string;
  orderId: string;
};

export function TechnicianMaterials({ tenantId, orderId }: Props) {
  const queryClient = useQueryClient();
  const [added, setAdded] = useState(false);
  const materialsKey = ["tech-materials", tenantId, orderId];

  const materialsQuery = useQuery({
    queryKey: materialsKey,
    queryFn: () => api.technicianWorkOrders.materials.list(tenantId, orderId),
    enabled: Boolean(tenantId && orderId),
  });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<MaterialFormValues>({
    resolver: zodResolver(materialSchema),
    defaultValues: { description: "", quantity: "", unit: "u" },
  });

  const createMutation = useMutation({
    mutationFn: (input: WorkOrderMaterialInput) =>
      api.technicianWorkOrders.materials.create(tenantId, orderId, input),
    onSuccess: () => {
      reset({ description: "", quantity: "", unit: "u" });
      setAdded(true);
      void queryClient.invalidateQueries({ queryKey: materialsKey });
    },
  });

  const materials = materialsQuery.data ?? [];
  const serverError = createMutation.isError
    ? errorMessage(createMutation.error, "No se pudo registrar el material")
    : null;

  function onSubmit(values: MaterialFormValues) {
    const quantity = normalizeQuantity(values.quantity);
    if (quantity === null) {
      setError("quantity", { message: "Ingresá una cantidad mayor a 0 (hasta 3 decimales)" });
      return;
    }
    setAdded(false);
    createMutation.reset();
    createMutation.mutate({ description: values.description, quantity, unit: values.unit });
  }

  return (
    <section
      aria-labelledby="tech-materials-title"
      className="rounded-2xl border border-zinc-200 bg-white p-4"
    >
      <h2 id="tech-materials-title" className="text-base font-semibold">
        Materiales usados
      </h2>

      <form className="mt-3 space-y-3" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label
            htmlFor="material-description"
            className="mb-1 block text-sm font-medium text-zinc-800"
          >
            Descripción
          </label>
          <input
            id="material-description"
            type="text"
            placeholder="Ej.: Caño de cobre 1/4"
            aria-invalid={errors.description ? true : undefined}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-base outline-none focus:border-zinc-900"
            {...register("description")}
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-700">{errors.description.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="material-quantity"
              className="mb-1 block text-sm font-medium text-zinc-800"
            >
              Cantidad
            </label>
            <input
              id="material-quantity"
              type="text"
              inputMode="decimal"
              placeholder="1"
              aria-invalid={errors.quantity ? true : undefined}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-base outline-none focus:border-zinc-900"
              {...register("quantity")}
            />
            {errors.quantity && (
              <p className="mt-1 text-sm text-red-700">{errors.quantity.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="material-unit" className="mb-1 block text-sm font-medium text-zinc-800">
              Unidad
            </label>
            <select
              id="material-unit"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base"
              {...register("unit")}
            >
              {MATERIAL_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
            {errors.unit && <p className="mt-1 text-sm text-red-700">{errors.unit.message}</p>}
          </div>
        </div>

        {serverError && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {serverError}
          </p>
        )}
        {added && !serverError && (
          <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Material registrado.
          </p>
        )}
        <button
          type="submit"
          disabled={isSubmitting || createMutation.isPending}
          className="min-h-12 w-full rounded-lg border border-zinc-900 px-4 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
        >
          {createMutation.isPending ? "Registrando..." : "Agregar material"}
        </button>
      </form>

      <div className="mt-5">
        {materialsQuery.isLoading ? (
          <p className="text-sm text-zinc-500">Cargando materiales...</p>
        ) : materialsQuery.isError ? (
          <p role="alert" className="text-sm text-red-700">
            No se pudieron cargar los materiales.
          </p>
        ) : materials.length === 0 ? (
          <p className="text-sm text-zinc-500">Todavía no registraste materiales.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {materials.map((material) => (
              <li key={material.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium break-words text-zinc-900">
                    {material.description}
                  </p>
                  <p className="text-xs text-zinc-500">{formatDate(material.created_at)}</p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-zinc-800">
                  {formatNumber(material.quantity)} {material.unit}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
