"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PRIORITY_LABELS, REQUEST_STATUS_LABELS } from "@/lib/order-status";
import { formatDate } from "@/lib/utils";

const requestSchema = z.object({
  customer_id: z.string().uuid("Seleccioná un cliente"),
  title: z.string().min(2, "Ingresá el motivo de la solicitud"),
  description: z.string().max(5000).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  source: z.enum(["whatsapp", "phone", "email", "web", "manual"]),
});

type RequestFormValues = z.infer<typeof requestSchema>;

export default function RequestsPage() {
  const { activeTenantId, tenants } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const activeTenant = tenants.find((tenant) => tenant.id === activeTenantId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: { priority: "normal", source: "manual" },
  });

  const customersQuery = useQuery({
    queryKey: ["customers", activeTenantId, ""],
    queryFn: () => api.customers.list(activeTenantId ?? ""),
    enabled: Boolean(activeTenantId),
  });

  const requestsQuery = useQuery({
    queryKey: ["service-requests", activeTenantId],
    queryFn: () => api.serviceRequests.list(activeTenantId ?? ""),
    enabled: Boolean(activeTenantId),
  });

  const createMutation = useMutation({
    mutationFn: (values: RequestFormValues) =>
      api.serviceRequests.create(activeTenantId ?? "", {
        customer_id: values.customer_id,
        title: values.title,
        description: values.description || undefined,
        priority: values.priority,
        source: values.source,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["service-requests"] });
      reset({ priority: "normal", source: "manual" });
      setShowForm(false);
    },
  });

  const convertMutation = useMutation({
    mutationFn: (requestId: string) => api.serviceRequests.convert(activeTenantId ?? "", requestId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["service-requests"] });
      void queryClient.invalidateQueries({ queryKey: ["work-orders"] });
      router.push("/orders");
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
  const requests = requestsQuery.data?.items ?? [];
  const customerName = (id: string) =>
    customers.find((customer) => customer.id === id)?.name ?? "Cliente";
  const formError =
    createMutation.error instanceof ApiError
      ? createMutation.error.detail
      : createMutation.error
        ? "No se pudo crear la solicitud"
        : null;
  const convertError =
    convertMutation.error instanceof ApiError ? convertMutation.error.detail : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Solicitudes</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Consultas y pedidos de servicio de {activeTenant?.name ?? "tu empresa"}.
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
          {showForm ? "Cancelar" : "Nueva solicitud"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit((values) => createMutation.mutateAsync(values))}
          className="rounded-2xl border border-zinc-200 bg-white p-5"
        >
          <h2 className="text-sm font-semibold">Nueva solicitud</h2>
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
                Motivo *
              </label>
              <input
                id="title"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                placeholder="Ej.: El aire acondicionado no enfría"
                {...register("title")}
              />
              {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
            </div>
            <div>
              <label htmlFor="source" className="mb-1 block text-sm font-medium">
                Origen
              </label>
              <select
                id="source"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                {...register("source")}
              >
                <option value="manual">Carga manual</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="phone">Teléfono</option>
                <option value="email">Email</option>
                <option value="web">Formulario web</option>
              </select>
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
              {createMutation.isPending ? "Guardando..." : "Guardar solicitud"}
            </button>
          </div>
        </form>
      )}

      {convertError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{convertError}</p>
      )}

      <div className="rounded-2xl border border-zinc-200 bg-white">
        {requestsQuery.isLoading ? (
          <p className="p-6 text-sm text-zinc-500">Cargando solicitudes...</p>
        ) : requests.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-medium text-zinc-800">No hay solicitudes</p>
            <p className="mt-1 text-sm text-zinc-500">
              Registrá la primera consulta para iniciar el circuito.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs tracking-wide text-zinc-500 uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Solicitud</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Prioridad</th>
                  <th className="px-4 py-3 font-medium">Origen</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 text-right font-medium">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {requests.map((request) => (
                  <tr key={request.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-zinc-900">{request.title}</p>
                      {request.description && (
                        <p className="mt-0.5 max-w-xs truncate text-xs text-zinc-500">
                          {request.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{customerName(request.customer_id)}</td>
                    <td className="px-4 py-3 text-zinc-600">
                      {PRIORITY_LABELS[request.priority] ?? request.priority}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{request.source}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700">
                        {REQUEST_STATUS_LABELS[request.status] ?? request.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">
                      {formatDate(request.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {request.status !== "converted" ? (
                        <button
                          type="button"
                          onClick={() => convertMutation.mutate(request.id)}
                          disabled={convertMutation.isPending}
                          className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-700 disabled:opacity-60"
                        >
                          Convertir en orden
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      ) : (
                        <span className="text-xs text-zinc-400">Convertida</span>
                      )}
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
