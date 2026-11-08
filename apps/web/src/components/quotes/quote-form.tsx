"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { api, errorMessage, type QuoteInput } from "@/lib/api";
import { calculateQuoteTotals } from "@/lib/quote-totals";
import { formatCurrency } from "@/lib/utils";

/** Hasta 2 decimales e importes con hasta 12 dígitos enteros (NUMERIC(14,2)). */
const MONEY_PATTERN = /^\d{1,12}(\.\d{1,2})?$/;
/** Cantidades pueden tener hasta 3 decimales. */
const QUANTITY_PATTERN = /^\d{1,9}(\.\d{1,3})?$/;
const CIVIL_DATE_PATTERN = /^(\d{4}-\d{2}-\d{2})?$/;

const quoteItemSchema = z.object({
  description: z.string().trim().min(2, "Describí el concepto"),
  quantity: z
    .string()
    .trim()
    .regex(QUANTITY_PATTERN, "Cantidad inválida (hasta 3 decimales)")
    .refine((value) => Number(value) > 0, "La cantidad debe ser mayor a cero"),
  unit_price: z.string().trim().regex(MONEY_PATTERN, "Precio inválido (hasta 2 decimales)"),
  discount_rate: z
    .string()
    .trim()
    .regex(MONEY_PATTERN, "Descuento inválido")
    .refine((value) => Number(value) <= 100, "Máximo 100 %"),
  tax_rate: z
    .string()
    .trim()
    .regex(MONEY_PATTERN, "IVA inválido")
    .refine((value) => Number(value) <= 100, "Máximo 100 %"),
});

export const quoteFormSchema = z.object({
  customer_id: z.string().uuid("Seleccioná un cliente"),
  work_order_id: z.string(),
  valid_until: z.string().regex(CIVIL_DATE_PATTERN, "Fecha inválida"),
  notes: z.string().max(5000, "Máximo 5000 caracteres"),
  items: z.array(quoteItemSchema).min(1, "Agregá al menos un concepto"),
});

export type QuoteFormValues = z.infer<typeof quoteFormSchema>;

const EMPTY_ITEM: QuoteFormValues["items"][number] = {
  description: "",
  quantity: "1",
  unit_price: "",
  discount_rate: "0",
  tax_rate: "21",
};

function toQuoteInput(values: QuoteFormValues): QuoteInput {
  return {
    customer_id: values.customer_id,
    work_order_id: values.work_order_id || undefined,
    valid_until: values.valid_until || undefined,
    notes: values.notes.trim() || undefined,
    items: values.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount_rate: item.discount_rate,
      tax_rate: item.tax_rate,
    })),
  };
}

type QuoteFormProps = {
  tenantId: string;
  onCancel: () => void;
};

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900";
const labelClass = "mb-1 block text-sm font-medium";
const errorClass = "mt-1 text-xs text-red-600";

export function QuoteForm({ tenantId, onCancel }: QuoteFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: {
      customer_id: "",
      work_order_id: "",
      valid_until: "",
      notes: "",
      items: [EMPTY_ITEM],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const selectedCustomerId = useWatch({ control, name: "customer_id" });
  const watchedItems = useWatch({ control, name: "items" });
  const totals = calculateQuoteTotals(watchedItems);

  const customersQuery = useQuery({
    queryKey: ["customers", tenantId, ""],
    queryFn: () => api.customers.list(tenantId),
  });

  const workOrdersQuery = useQuery({
    queryKey: ["work-orders", tenantId],
    queryFn: () => api.workOrders.list(tenantId),
  });

  const customers = customersQuery.data?.items ?? [];
  const workOrders = (workOrdersQuery.data?.items ?? []).filter(
    (order) =>
      order.operational_status !== "cancelled" &&
      (!selectedCustomerId || order.customer_id === selectedCustomerId),
  );

  const createMutation = useMutation({
    mutationFn: (values: QuoteFormValues) => api.quotes.create(tenantId, toQuoteInput(values)),
    onSuccess: (quote) => {
      void queryClient.invalidateQueries({ queryKey: ["quotes", tenantId] });
      router.push(`/quotes/${quote.id}`);
    },
  });

  const formError = createMutation.error
    ? errorMessage(createMutation.error, "No se pudo crear el presupuesto")
    : null;

  return (
    <form
      onSubmit={handleSubmit((values) => createMutation.mutateAsync(values))}
      className="rounded-2xl border border-zinc-200 bg-white p-5"
      noValidate
    >
      <h2 className="text-sm font-semibold">Nuevo presupuesto</h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="customer_id" className={labelClass}>
            Cliente *
          </label>
          <select
            id="customer_id"
            className={inputClass}
            aria-invalid={Boolean(errors.customer_id)}
            {...register("customer_id", {
              onChange: () => setValue("work_order_id", ""),
            })}
          >
            <option value="">Seleccionar cliente</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
          {errors.customer_id && <p className={errorClass}>{errors.customer_id.message}</p>}
        </div>

        <div>
          <label htmlFor="work_order_id" className={labelClass}>
            Orden de trabajo (opcional)
          </label>
          <select id="work_order_id" className={inputClass} {...register("work_order_id")}>
            <option value="">Sin orden asociada</option>
            {workOrders.map((order) => (
              <option key={order.id} value={order.id}>
                {order.code} · {order.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="valid_until" className={labelClass}>
            Válido hasta
          </label>
          <input
            id="valid_until"
            type="date"
            className={inputClass}
            aria-invalid={Boolean(errors.valid_until)}
            {...register("valid_until")}
          />
          {errors.valid_until && <p className={errorClass}>{errors.valid_until.message}</p>}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="notes" className={labelClass}>
            Notas para el cliente
          </label>
          <textarea
            id="notes"
            rows={3}
            className={inputClass}
            placeholder="Condiciones de pago, plazos o aclaraciones"
            {...register("notes")}
          />
          {errors.notes && <p className={errorClass}>{errors.notes.message}</p>}
        </div>
      </div>

      <section aria-labelledby="quote-items-title" className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <h3 id="quote-items-title" className="text-sm font-semibold">
            Conceptos
          </h3>
          <button
            type="button"
            onClick={() => append(EMPTY_ITEM)}
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Agregar concepto
          </button>
        </div>

        {errors.items?.root?.message && <p className={errorClass}>{errors.items.root.message}</p>}

        <ul className="mt-3 space-y-3">
          {fields.map((field, index) => {
            const itemErrors = errors.items?.[index];
            const itemNumber = index + 1;
            return (
              <li key={field.id} className="rounded-xl border border-zinc-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-zinc-500">Concepto {itemNumber}</span>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                    aria-label={`Quitar concepto ${itemNumber}`}
                    className="inline-flex items-center gap-1 rounded-lg p-1.5 text-xs text-zinc-500 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Quitar
                  </button>
                </div>

                <div className="mt-2">
                  <label htmlFor={`items-${index}-description`} className={labelClass}>
                    Descripción *
                  </label>
                  <input
                    id={`items-${index}-description`}
                    className={inputClass}
                    placeholder="Ej.: Mano de obra instalación split"
                    aria-invalid={Boolean(itemErrors?.description)}
                    {...register(`items.${index}.description`)}
                  />
                  {itemErrors?.description && (
                    <p className={errorClass}>{itemErrors.description.message}</p>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <label htmlFor={`items-${index}-quantity`} className={labelClass}>
                      Cantidad *
                    </label>
                    <input
                      id={`items-${index}-quantity`}
                      type="number"
                      inputMode="decimal"
                      step="any"
                      min="0"
                      className={inputClass}
                      aria-invalid={Boolean(itemErrors?.quantity)}
                      {...register(`items.${index}.quantity`)}
                    />
                    {itemErrors?.quantity && (
                      <p className={errorClass}>{itemErrors.quantity.message}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor={`items-${index}-unit_price`} className={labelClass}>
                      Precio unitario *
                    </label>
                    <input
                      id={`items-${index}-unit_price`}
                      type="number"
                      inputMode="decimal"
                      step="any"
                      min="0"
                      className={inputClass}
                      aria-invalid={Boolean(itemErrors?.unit_price)}
                      {...register(`items.${index}.unit_price`)}
                    />
                    {itemErrors?.unit_price && (
                      <p className={errorClass}>{itemErrors.unit_price.message}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor={`items-${index}-discount_rate`} className={labelClass}>
                      Descuento %
                    </label>
                    <input
                      id={`items-${index}-discount_rate`}
                      type="number"
                      inputMode="decimal"
                      step="any"
                      min="0"
                      max="100"
                      className={inputClass}
                      aria-invalid={Boolean(itemErrors?.discount_rate)}
                      {...register(`items.${index}.discount_rate`)}
                    />
                    {itemErrors?.discount_rate && (
                      <p className={errorClass}>{itemErrors.discount_rate.message}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor={`items-${index}-tax_rate`} className={labelClass}>
                      IVA %
                    </label>
                    <input
                      id={`items-${index}-tax_rate`}
                      type="number"
                      inputMode="decimal"
                      step="any"
                      min="0"
                      max="100"
                      className={inputClass}
                      aria-invalid={Boolean(itemErrors?.tax_rate)}
                      {...register(`items.${index}.tax_rate`)}
                    />
                    {itemErrors?.tax_rate && (
                      <p className={errorClass}>{itemErrors.tax_rate.message}</p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section
        aria-labelledby="quote-preview-title"
        className="mt-6 rounded-xl bg-zinc-50 p-4 sm:ml-auto sm:max-w-sm"
      >
        <h3 id="quote-preview-title" className="text-sm font-semibold">
          Vista previa de totales
        </h3>
        <dl className="mt-3 space-y-1.5 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-600">Subtotal</dt>
            <dd className="font-medium">{formatCurrency(totals.subtotal)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-600">Descuentos</dt>
            <dd className="font-medium">− {formatCurrency(totals.discountTotal)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-600">IVA</dt>
            <dd className="font-medium">{formatCurrency(totals.taxTotal)}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-zinc-200 pt-2 text-base">
            <dt className="font-semibold">Total</dt>
            <dd className="font-semibold">{formatCurrency(totals.total)}</dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-zinc-500">
          Vista orientativa. El total oficial lo calcula el servidor al guardar.
        </p>
      </section>

      {formError && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {formError}
        </p>
      )}

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting || createMutation.isPending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-60"
        >
          {createMutation.isPending ? "Guardando..." : "Guardar presupuesto"}
        </button>
      </div>
    </form>
  );
}
