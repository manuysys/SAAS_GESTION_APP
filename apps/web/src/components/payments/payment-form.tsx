"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { api, errorMessage, type WorkOrder } from "@/lib/api";
import { formatDateTimeLocal, localDateTimeToIso } from "@/lib/agenda";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from "@/lib/payment-status";

/** Hasta 2 decimales e importes positivos con hasta 12 dígitos enteros (NUMERIC(14,2)). */
const AMOUNT_PATTERN = /^\d{1,12}(\.\d{1,2})?$/;

const paymentFormSchema = z.object({
  work_order_id: z.uuid("Seleccioná una orden"),
  amount: z
    .string()
    .trim()
    .regex(AMOUNT_PATTERN, "Monto inválido (hasta 2 decimales)")
    .refine((value) => Number(value) > 0, "El monto debe ser mayor a cero"),
  method: z.enum(PAYMENT_METHODS, { error: "Seleccioná un método" }),
  paid_at: z.string().min(1, "Ingresá la fecha del pago"),
  reference: z.string().trim().max(120, "Máximo 120 caracteres"),
  notes: z.string().trim().max(2000, "Máximo 2000 caracteres"),
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900";
const labelClass = "mb-1 block text-sm font-medium";
const errorClass = "mt-1 text-xs text-red-600";

type PaymentFormProps = {
  tenantId: string;
  orders: WorkOrder[];
  onDone: () => void;
};

export function PaymentForm({ tenantId, orders, onDone }: PaymentFormProps) {
  const queryClient = useQueryClient();
  const [initialPaidAt] = useState(() => formatDateTimeLocal(new Date()));

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      work_order_id: "",
      amount: "",
      method: "cash",
      paid_at: initialPaidAt,
      reference: "",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (values: PaymentFormValues) =>
      api.payments.create(tenantId, {
        work_order_id: values.work_order_id,
        amount: values.amount,
        method: values.method,
        paid_at: localDateTimeToIso(values.paid_at),
        reference: values.reference || undefined,
        notes: values.notes || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["payments", tenantId] });
      void queryClient.invalidateQueries({ queryKey: ["work-orders", tenantId] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-summary", tenantId] });
      onDone();
    },
  });

  const formError = createMutation.error
    ? errorMessage(createMutation.error, "No se pudo registrar el pago")
    : null;

  return (
    <form
      onSubmit={handleSubmit((values) => createMutation.mutateAsync(values))}
      className="rounded-2xl border border-zinc-200 bg-white p-5"
      noValidate
    >
      <h2 className="text-sm font-semibold">Registrar pago</h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="payment-work-order" className={labelClass}>
            Orden de trabajo *
          </label>
          <select
            id="payment-work-order"
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
          <label htmlFor="payment-amount" className={labelClass}>
            Monto (ARS) *
          </label>
          <input
            id="payment-amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            className={inputClass}
            aria-invalid={Boolean(errors.amount)}
            {...register("amount")}
          />
          {errors.amount && <p className={errorClass}>{errors.amount.message}</p>}
        </div>

        <div>
          <label htmlFor="payment-method" className={labelClass}>
            Método *
          </label>
          <select
            id="payment-method"
            className={inputClass}
            aria-invalid={Boolean(errors.method)}
            {...register("method")}
          >
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {PAYMENT_METHOD_LABELS[method]}
              </option>
            ))}
          </select>
          {errors.method && <p className={errorClass}>{errors.method.message}</p>}
        </div>

        <div>
          <label htmlFor="payment-paid-at" className={labelClass}>
            Fecha del pago *
          </label>
          <input
            id="payment-paid-at"
            type="datetime-local"
            className={inputClass}
            aria-invalid={Boolean(errors.paid_at)}
            {...register("paid_at")}
          />
          {errors.paid_at && <p className={errorClass}>{errors.paid_at.message}</p>}
        </div>

        <div>
          <label htmlFor="payment-reference" className={labelClass}>
            Referencia
          </label>
          <input
            id="payment-reference"
            className={inputClass}
            placeholder="Ej.: Nº de operación"
            aria-invalid={Boolean(errors.reference)}
            {...register("reference")}
          />
          {errors.reference && <p className={errorClass}>{errors.reference.message}</p>}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="payment-notes" className={labelClass}>
            Notas
          </label>
          <textarea
            id="payment-notes"
            rows={2}
            className={inputClass}
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
          {createMutation.isPending ? "Guardando..." : "Registrar pago"}
        </button>
      </div>
    </form>
  );
}
