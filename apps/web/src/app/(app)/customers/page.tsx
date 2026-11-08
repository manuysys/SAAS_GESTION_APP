"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/utils";

const customerSchema = z.object({
  name: z.string().min(2, "Ingresá el nombre del cliente"),
  phone: z.string().max(40, "Teléfono demasiado largo").optional(),
  email: z.union([z.string().email("Email inválido"), z.literal("")]).optional(),
  notes: z.string().max(2000, "Máximo 2000 caracteres").optional(),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

export default function CustomersPage() {
  const { activeTenantId, tenants } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const activeTenant = tenants.find((tenant) => tenant.id === activeTenantId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues>({ resolver: zodResolver(customerSchema) });

  const customersQuery = useQuery({
    queryKey: ["customers", activeTenantId, search],
    queryFn: () => api.customers.list(activeTenantId ?? "", search),
    enabled: Boolean(activeTenantId),
  });

  const createMutation = useMutation({
    mutationFn: (values: CustomerFormValues) =>
      api.customers.create(activeTenantId ?? "", {
        name: values.name,
        phone: values.phone || undefined,
        email: values.email || undefined,
        notes: values.notes || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
      reset();
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (customerId: string) => api.customers.remove(activeTenantId ?? "", customerId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });

  async function onSubmit(values: CustomerFormValues) {
    await createMutation.mutateAsync(values);
  }

  if (!activeTenantId) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-sm text-zinc-600">
        No hay una empresa activa. Cerrá sesión y volvé a ingresar.
      </div>
    );
  }

  const customers = customersQuery.data?.items ?? [];
  const total = customersQuery.data?.total ?? 0;
  const formError =
    createMutation.error instanceof ApiError
      ? createMutation.error.detail
      : createMutation.error
        ? "No se pudo crear el cliente"
        : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
          <p className="mt-1 text-sm text-zinc-600">
            {total} cliente{total === 1 ? "" : "s"} en {activeTenant?.name ?? "tu empresa"}.
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
          {showForm ? "Cancelar" : "Nuevo cliente"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="rounded-2xl border border-zinc-200 bg-white p-5"
        >
          <h2 className="text-sm font-semibold">Nuevo cliente</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="name" className="mb-1 block text-sm font-medium">
                Nombre *
              </label>
              <input
                id="name"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                {...register("name")}
              />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
            </div>
            <div>
              <label htmlFor="phone" className="mb-1 block text-sm font-medium">
                Teléfono
              </label>
              <input
                id="phone"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                {...register("phone")}
              />
              {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
            </div>
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                {...register("email")}
              />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="notes" className="mb-1 block text-sm font-medium">
                Observaciones
              </label>
              <textarea
                id="notes"
                rows={3}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                {...register("notes")}
              />
              {errors.notes && <p className="mt-1 text-xs text-red-600">{errors.notes.message}</p>}
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
              {createMutation.isPending ? "Guardando..." : "Guardar cliente"}
            </button>
          </div>
        </form>
      )}

      <div className="rounded-2xl border border-zinc-200 bg-white">
        <div className="flex items-center gap-2 border-b border-zinc-200 px-4 py-3">
          <Search className="h-4 w-4 text-zinc-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nombre, teléfono o email"
            className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-400"
          />
        </div>

        {customersQuery.isLoading ? (
          <p className="p-6 text-sm text-zinc-500">Cargando clientes...</p>
        ) : customersQuery.isError ? (
          <p className="p-6 text-sm text-red-600">No se pudieron cargar los clientes.</p>
        ) : customers.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-medium text-zinc-800">Todavía no hay clientes</p>
            <p className="mt-1 text-sm text-zinc-500">
              Creá el primero para empezar a construir el historial.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs tracking-wide text-zinc-500 uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Contacto</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Alta</th>
                  <th className="px-4 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-zinc-900">{customer.name}</p>
                      {customer.notes && (
                        <p className="mt-0.5 max-w-xs truncate text-xs text-zinc-500">
                          {customer.notes}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      <p>{customer.phone ?? "—"}</p>
                      <p className="text-xs">{customer.email ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                        {customer.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">
                      {formatDate(customer.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`¿Archivar a ${customer.name}?`)) {
                            deleteMutation.mutate(customer.id);
                          }
                        }}
                        className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                        aria-label={`Archivar ${customer.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
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
