"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Inbox, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
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

const priorityVariant: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  low: "neutral",
  normal: "info",
  high: "warning",
  urgent: "danger",
};

const statusVariant: Record<string, "neutral" | "success" | "warning" | "info"> = {
  new: "info",
  triaged: "warning",
  converted: "success",
  closed: "neutral",
};

const sourceLabels: Record<string, string> = {
  manual: "Carga manual",
  whatsapp: "WhatsApp",
  phone: "Teléfono",
  email: "Email",
  web: "Formulario web",
};

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
      toast.success("Solicitud creada");
      void queryClient.invalidateQueries({ queryKey: ["service-requests"] });
      reset({ priority: "normal", source: "manual" });
      setShowForm(false);
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.detail : "No se pudo crear la solicitud"),
  });

  const convertMutation = useMutation({
    mutationFn: (requestId: string) => api.serviceRequests.convert(activeTenantId ?? "", requestId),
    onSuccess: () => {
      toast.success("Solicitud convertida en orden");
      void queryClient.invalidateQueries({ queryKey: ["service-requests"] });
      void queryClient.invalidateQueries({ queryKey: ["work-orders"] });
      router.push("/orders");
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.detail : "No se pudo convertir la solicitud"),
  });

  if (!activeTenantId) {
    return <Card className="text-slate p-8 text-sm">No hay una empresa activa.</Card>;
  }

  const customers = customersQuery.data?.items ?? [];
  const requests = requestsQuery.data?.items ?? [];
  const total = requestsQuery.data?.total ?? requests.length;
  const urgent = requests.filter((request) => request.priority === "urgent").length;
  const converted = requests.filter((request) => request.status === "converted").length;
  const customerName = (id: string) =>
    customers.find((customer) => customer.id === id)?.name ?? "Cliente";
  const formError =
    createMutation.error instanceof ApiError
      ? createMutation.error.detail
      : createMutation.error
        ? "No se pudo crear la solicitud"
        : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Entrada"
        title="Solicitudes"
        description={`Consultas y pedidos de servicio de ${activeTenant?.name ?? "tu empresa"}.`}
        actions={
          <Button
            onClick={() => {
              setShowForm((value) => !value);
              createMutation.reset();
            }}
            variant={showForm ? "outline" : "primary"}
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? "Cancelar" : "Nueva solicitud"}
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total"
          value={total}
          hint="Solicitudes registradas"
          icon={Inbox}
          className="border-ink/10 bg-ink/5"
        />
        <StatCard
          label="Urgentes"
          value={urgent}
          hint="Prioridad máxima"
          icon={Inbox}
          tone="amber"
          className="border-amber/20 bg-amber/10"
        />
        <StatCard
          label="Convertidas"
          value={converted}
          hint="Ya son órdenes de trabajo"
          icon={Inbox}
          tone="teal"
          className="border-teal/15 bg-teal/5"
        />
      </div>

      {showForm && (
        <Card className="border-teal/20 bg-teal/5">
          <CardHeader>
            <CardTitle>Nueva solicitud</CardTitle>
            <p className="text-slate text-sm">Registrá la consulta antes de comprometer una visita.</p>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit((values) => createMutation.mutateAsync(values))}
              className="grid gap-4 sm:grid-cols-2"
            >
              <div>
                <label htmlFor="customer_id" className="text-ink mb-1 block text-sm font-medium">
                  Cliente *
                </label>
                <select
                  id="customer_id"
                  className="border-mist text-ink focus:border-teal min-h-11 w-full rounded-xl border bg-white px-3 text-sm"
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
                <label htmlFor="priority" className="text-ink mb-1 block text-sm font-medium">
                  Prioridad
                </label>
                <select
                  id="priority"
                  className="border-mist text-ink focus:border-teal min-h-11 w-full rounded-xl border bg-white px-3 text-sm"
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
                <label htmlFor="title" className="text-ink mb-1 block text-sm font-medium">
                  Motivo *
                </label>
                <Input
                  id="title"
                  placeholder="Ej.: El aire acondicionado no enfría"
                  {...register("title")}
                />
                {errors.title && (
                  <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="source" className="text-ink mb-1 block text-sm font-medium">
                  Origen
                </label>
                <select
                  id="source"
                  className="border-mist text-ink focus:border-teal min-h-11 w-full rounded-xl border bg-white px-3 text-sm"
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
                <label htmlFor="description" className="text-ink mb-1 block text-sm font-medium">
                  Descripción
                </label>
                <textarea
                  id="description"
                  rows={3}
                  className="border-mist text-ink placeholder:text-slate/60 focus:border-teal focus:ring-teal/20 w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-2"
                  {...register("description")}
                />
              </div>
              {formError && (
                <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">
                  {formError}
                </p>
              )}
              <div className="flex justify-end gap-2 sm:col-span-2">
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
                  {createMutation.isPending ? "Guardando..." : "Guardar solicitud"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        {requestsQuery.isLoading ? (
          <p className="text-slate p-6 text-sm">Cargando solicitudes...</p>
        ) : requests.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Inbox}
              title="No hay solicitudes"
              description="Registrá la primera consulta para iniciar el circuito."
              action={
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4" />
                  Nueva solicitud
                </Button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-paper text-slate text-xs tracking-wide uppercase">
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
              <tbody className="divide-mist divide-y">
                {requests.map((request) => (
                  <tr key={request.id} className="hover:bg-paper/70 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-ink font-semibold">{request.title}</p>
                      {request.description && (
                        <p className="text-slate mt-0.5 max-w-xs truncate text-xs">
                          {request.description}
                        </p>
                      )}
                    </td>
                    <td className="text-slate px-4 py-3">{customerName(request.customer_id)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={priorityVariant[request.priority] ?? "neutral"}>
                        {PRIORITY_LABELS[request.priority] ?? request.priority}
                      </Badge>
                    </td>
                    <td className="text-slate px-4 py-3">
                      {sourceLabels[request.source] ?? request.source}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant[request.status] ?? "neutral"}>
                        {REQUEST_STATUS_LABELS[request.status] ?? request.status}
                      </Badge>
                    </td>
                    <td className="text-slate px-4 py-3 text-xs">
                      {formatDate(request.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {request.status !== "converted" ? (
                        <Button
                          size="sm"
                          onClick={() => convertMutation.mutate(request.id)}
                          disabled={convertMutation.isPending}
                        >
                          Convertir en orden
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      ) : (
                        <span className="text-slate text-xs">Convertida</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
