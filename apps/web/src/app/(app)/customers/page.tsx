"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, Phone, Plus, Search, Trash2, Users, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
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

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function CustomersPage() {
  const { activeTenantId, tenants } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
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
      toast.success("Cliente creado");
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
      reset();
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (customerId: string) => api.customers.remove(activeTenantId ?? "", customerId),
    onSuccess: () => {
      toast.success("Cliente archivado");
      setDeleteTarget(null);
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.detail : "No se pudo archivar"),
  });

  async function onSubmit(values: CustomerFormValues) {
    try {
      await createMutation.mutateAsync(values);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.detail : "No se pudo crear el cliente");
    }
  }

  if (!activeTenantId) {
    return (
      <Card className="p-8 text-sm text-slate">
        No hay una empresa activa. Cerrá sesión y volvé a ingresar.
      </Card>
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
      <PageHeader
        eyebrow="Cartera"
        title="Clientes"
        description={`${total} cliente${total === 1 ? "" : "s"} en ${activeTenant?.name ?? "tu empresa"}.`}
        actions={
          <Button
            onClick={() => {
              setShowForm((value) => !value);
              createMutation.reset();
            }}
            variant={showForm ? "outline" : "primary"}
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? "Cancelar" : "Nuevo cliente"}
          </Button>
        }
      />

      {showForm && (
        <Card className="border-teal/20 bg-teal/5">
          <CardHeader>
            <CardTitle>Nuevo cliente</CardTitle>
            <p className="text-sm text-slate">Cargá los datos básicos para empezar el historial.</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="name" className="mb-1 block text-sm font-medium text-ink">
                  Nombre *
                </label>
                <Input id="name" autoComplete="name" {...register("name")} />
                {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
              </div>
              <div>
                <label htmlFor="phone" className="mb-1 block text-sm font-medium text-ink">
                  Teléfono
                </label>
                <Input id="phone" type="tel" autoComplete="tel" {...register("phone")} />
                {errors.phone && (
                  <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium text-ink">
                  Email
                </label>
                <Input id="email" type="email" autoComplete="email" {...register("email")} />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
                )}
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="notes" className="mb-1 block text-sm font-medium text-ink">
                  Observaciones
                </label>
                <textarea
                  id="notes"
                  rows={3}
                  className="w-full rounded-xl border border-mist bg-white px-3 py-2 text-sm text-ink outline-none placeholder:text-slate/60 focus:border-teal focus:ring-2 focus:ring-teal/20"
                  {...register("notes")}
                />
                {errors.notes && (
                  <p className="mt-1 text-xs text-red-600">{errors.notes.message}</p>
                )}
              </div>
              {formError && (
                <p
                  role="alert"
                  className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2"
                >
                  {formError}
                </p>
              )}
              <div className="flex justify-end gap-2 sm:col-span-2">
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
                  {createMutation.isPending ? "Guardando..." : "Guardar cliente"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <div className="flex items-center gap-2 border-b border-mist px-4 py-3">
          <Search className="h-4 w-4 text-slate" aria-hidden="true" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nombre, teléfono o email"
            className="border-0 bg-transparent focus:ring-0"
            aria-label="Buscar clientes"
          />
        </div>

        {customersQuery.isLoading ? (
          <p className="p-6 text-sm text-slate">Cargando clientes...</p>
        ) : customersQuery.isError ? (
          <p className="p-6 text-sm text-red-600">No se pudieron cargar los clientes.</p>
        ) : customers.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Users}
              title="Todavía no hay clientes"
              description="Creá el primero para empezar a construir el historial."
              action={
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4" />
                  Nuevo cliente
                </Button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-paper text-xs tracking-wide text-slate uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Contacto</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Alta</th>
                  <th className="px-4 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mist">
                {customers.map((customer) => (
                  <tr key={customer.id} className="transition-colors hover:bg-paper/70">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal/10 text-xs font-bold text-teal">
                          {initials(customer.name)}
                        </span>
                        <div className="min-w-0">
                          <Link
                            href={`/customers/${customer.id}`}
                            className="font-semibold text-ink underline-offset-4 hover:text-teal hover:underline"
                          >
                            {customer.name}
                          </Link>
                          {customer.notes && (
                            <p className="mt-0.5 max-w-xs truncate text-xs text-slate">
                              {customer.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1 text-xs text-slate">
                        <p className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3" aria-hidden="true" />
                          {customer.phone ?? "—"}
                        </p>
                        <p className="flex items-center gap-1.5">
                          <Mail className="h-3 w-3" aria-hidden="true" />
                          {customer.email ?? "—"}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={customer.status === "active" ? "success" : "neutral"}>
                        {customer.status === "active" ? "Activo" : customer.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate">
                      {formatDate(customer.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setDeleteTarget({ id: customer.id, name: customer.name })}
                        className="rounded-lg p-2 text-slate hover:bg-red-50 hover:text-red-600"
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
      </Card>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archivar cliente</DialogTitle>
            <DialogDescription>
              ¿Confirmás que querés archivar a {deleteTarget?.name}? El historial se conserva.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button
              variant="danger"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? "Archivando..." : "Archivar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
