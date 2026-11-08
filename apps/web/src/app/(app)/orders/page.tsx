"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Plus, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  OPERATIONAL_STATUS_LABELS,
  OPERATIONAL_STATUS_STYLES,
  PRIORITY_LABELS,
} from "@/lib/order-status";
import { formatDate } from "@/lib/utils";

const orderSchema = z.object({
  customer_id: z.string().uuid("Seleccioná un cliente"),
  title: z.string().min(2, "Ingresá el título de la orden"),
  description: z.string().max(5000).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  scheduled_at: z.string().optional(),
});

type OrderFormValues = z.infer<typeof orderSchema>;

export default function OrdersPage() {
  const { activeTenantId, tenants } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const activeTenant = tenants.find((tenant) => tenant.id === activeTenantId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: { priority: "normal" },
  });

  const customersQuery = useQuery({
    queryKey: ["customers", activeTenantId, ""],
    queryFn: () => api.customers.list(activeTenantId ?? ""),
    enabled: Boolean(activeTenantId),
  });

  const ordersQuery = useQuery({
    queryKey: ["work-orders", activeTenantId],
    queryFn: () => api.workOrders.list(activeTenantId ?? ""),
    enabled: Boolean(activeTenantId),
  });

  const createMutation = useMutation({
    mutationFn: (values: OrderFormValues) =>
      api.workOrders.create(activeTenantId ?? "", {
        customer_id: values.customer_id,
        title: values.title,
        description: values.description || undefined,
        priority: values.priority,
        scheduled_at: values.scheduled_at ? new Date(values.scheduled_at).toISOString() : undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["work-orders"] });
      reset({ priority: "normal" });
      setShowForm(false);
    },
  });

  if (!activeTenantId) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-sm text-zinc-600">
        No hay una empresa activa.
      </div>
    );
  }

  const customers = customersQuery.data?.items ?? [];
  const orders = ordersQuery.data?.items ?? [];
  const customerName = (id: string) =>
    customers.find((customer) => customer.id === id)?.name ?? "Cliente";
  const formError =
    createMutation.error instanceof ApiError
      ? createMutation.error.detail
      : createMutation.error
        ? "No se pudo crear la orden"
        : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Órdenes de trabajo</h1>
          <p className="mt-1 text-sm text-zinc-600">
            {ordersQuery.data?.total ?? 0} órdenes en {activeTenant?.name ?? "tu empresa"}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowForm((value) => !value);
            createMutation.reset();
          }}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Cancelar" : "Nueva orden"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit((values) => createMutation.mutateAsync(values))}
          className="rounded-2xl border border-zinc-200 bg-white p-5"
        >
          <h2 className="text-sm font-semibold">Nueva orden</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="customer_id" className="mb-1 block text-sm font-medium">
                Cliente *
              </label>
              <select
                id="customer_id"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                {...register("customer_id")}
              >
                <option value="">Seleccionar cliente</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
              {errors.customer_id && (
                <p className="mt-1 text-xs text-red-600">{errors.customer_id.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="priority" className="mb-1 block text-sm font-medium">
                Prioridad
              </label>
              <select
                id="priority"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                {...register("priority")}
              >
                {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="title" className="mb-1 block text-sm font-medium">
                Título *
              </label>
              <input
                id="title"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                placeholder="Ej.: Instalación de equipo split"
                {...register("title")}
              />
              {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
            </div>
            <div>
              <label htmlFor="scheduled_at" className="mb-1 block text-sm font-medium">
                Fecha programada
              </label>
              <input
                id="scheduled_at"
                type="datetime-local"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                {...register("scheduled_at")}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="description" className="mb-1 block text-sm font-medium">
                Descripción
              </label>
              <textarea
                id="description"
                rows={3}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                {...register("description")}
              />
            </div>
          </div>
          {formError && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || createMutation.isPending}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-60"
            >
              {createMutation.isPending ? "Guardando..." : "Guardar orden"}
            </button>
          </div>
        </form>
      )}

      <div className="rounded-2xl border border-zinc-200 bg-white">
        {ordersQuery.isLoading ? (
          <p className="p-6 text-sm text-zinc-500">Cargando órdenes...</p>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-medium text-zinc-800">No hay órdenes</p>
            <p className="mt-1 text-sm text-zinc-500">Creá una orden o convertí una solicitud.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs tracking-wide text-zinc-500 uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Orden</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Prioridad</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Programada</th>
                  <th className="px-4 py-3 text-right font-medium">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs text-zinc-500">{order.code}</p>
                      <p className="font-medium text-zinc-900">{order.title}</p>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{customerName(order.customer_id)}</td>
                    <td className="px-4 py-3 text-zinc-600">
                      {PRIORITY_LABELS[order.priority] ?? order.priority}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          OPERATIONAL_STATUS_STYLES[order.operational_status] ??
                          "bg-zinc-100 text-zinc-700"
                        }`}
                      >
                        {OPERATIONAL_STATUS_LABELS[order.operational_status] ??
                          order.operational_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">
                      {order.scheduled_at ? formatDate(order.scheduled_at) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/orders/${order.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                      >
                        Ver
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
