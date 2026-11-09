"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, LayoutGrid, List, Plus, X } from "lucide-react";
import Link from "next/link";
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
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { OPERATIONAL_STATUS_LABELS, PRIORITY_LABELS } from "@/lib/order-status";
import { cn, formatDate } from "@/lib/utils";

const orderSchema = z.object({
  customer_id: z.string().uuid("Seleccioná un cliente"),
  title: z.string().min(2, "Ingresá el título de la orden"),
  description: z.string().max(5000).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  scheduled_at: z.string().optional(),
});

type OrderFormValues = z.infer<typeof orderSchema>;

const statusVariant: Record<string, "neutral" | "success" | "warning" | "danger" | "info" | "teal"> = {
  new: "neutral",
  scheduled: "info",
  in_progress: "warning",
  waiting: "teal",
  finished: "success",
  cancelled: "danger",
};

const priorityVariant: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  low: "neutral",
  normal: "info",
  high: "warning",
  urgent: "danger",
};

const boardColumns = ["new", "scheduled", "in_progress", "waiting", "finished"] as const;

export default function OrdersPage() {
  const { activeTenantId, tenants } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [view, setView] = useState<"board" | "table">("board");
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
      toast.success("Orden creada");
      void queryClient.invalidateQueries({ queryKey: ["work-orders"] });
      reset({ priority: "normal" });
      setShowForm(false);
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.detail : "No se pudo crear"),
  });

  if (!activeTenantId) {
    return <Card className="text-slate p-8 text-sm">No hay una empresa activa.</Card>;
  }

  const customers = customersQuery.data?.items ?? [];
  const orders = ordersQuery.data?.items ?? [];
  const total = ordersQuery.data?.total ?? 0;
  const open = orders.filter((order) =>
    ["new", "scheduled", "in_progress", "waiting"].includes(order.operational_status),
  ).length;
  const urgent = orders.filter((order) => order.priority === "urgent").length;
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
      <PageHeader
        eyebrow="Operación"
        title="Órdenes de trabajo"
        description={`${total} órdenes en ${activeTenant?.name ?? "tu empresa"} · ${open} abiertas · ${urgent} urgentes.`}
        actions={
          <>
            <div className="border-mist flex rounded-xl border bg-white p-1">
              <button
                type="button"
                onClick={() => setView("board")}
                aria-pressed={view === "board"}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg",
                  view === "board" ? "bg-ink text-white" : "text-slate hover:bg-paper",
                )}
                aria-label="Vista de tablero"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setView("table")}
                aria-pressed={view === "table"}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg",
                  view === "table" ? "bg-ink text-white" : "text-slate hover:bg-paper",
                )}
                aria-label="Vista de tabla"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
            <Button
              onClick={() => {
                setShowForm((value) => !value);
                createMutation.reset();
              }}
              variant={showForm ? "outline" : "primary"}
            >
              {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showForm ? "Cancelar" : "Nueva orden"}
            </Button>
          </>
        }
      />

      {showForm && (
        <Card className="border-teal/20 bg-teal/5">
          <CardHeader>
            <CardTitle>Nueva orden</CardTitle>
            <p className="text-slate text-sm">Asociá un cliente y definí prioridad y fecha.</p>
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
                  Título *
                </label>
                <Input id="title" placeholder="Ej.: Instalación de equipo split" {...register("title")} />
                {errors.title && (
                  <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="scheduled_at" className="text-ink mb-1 block text-sm font-medium">
                  Fecha programada
                </label>
                <Input id="scheduled_at" type="datetime-local" {...register("scheduled_at")} />
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
                  {createMutation.isPending ? "Guardando..." : "Guardar orden"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {ordersQuery.isLoading ? (
        <Card className="text-slate p-6 text-sm">Cargando órdenes...</Card>
      ) : orders.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon={LayoutGrid}
            title="No hay órdenes"
            description="Creá una orden o convertí una solicitud."
            action={
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4" />
                Nueva orden
              </Button>
            }
          />
        </Card>
      ) : view === "board" ? (
        <div className="overflow-x-auto pb-2">
          <div className="grid min-w-[980px] grid-cols-5 gap-3">
            {boardColumns.map((status) => {
              const columnOrders = orders.filter(
                (order) => order.operational_status === status,
              );
              return (
                <section key={status} className="bg-mist/40 rounded-2xl p-2.5">
                  <div className="flex items-center justify-between px-1.5 py-1.5">
                    <h2 className="text-ink text-xs font-semibold tracking-wide uppercase">
                      {OPERATIONAL_STATUS_LABELS[status]}
                    </h2>
                    <span className="bg-white text-slate rounded-full px-2 py-0.5 text-[11px] font-semibold">
                      {columnOrders.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {columnOrders.map((order) => (
                      <Link
                        key={order.id}
                        href={`/orders/${order.id}`}
                        className="border-mist hover:border-teal/40 block rounded-xl border bg-white p-3 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate font-mono text-[10px]">{order.code}</span>
                          <Badge variant={priorityVariant[order.priority] ?? "neutral"}>
                            {PRIORITY_LABELS[order.priority] ?? order.priority}
                          </Badge>
                        </div>
                        <p className="text-ink mt-2 line-clamp-2 text-sm leading-snug font-semibold">
                          {order.title}
                        </p>
                        <p className="text-slate mt-1 truncate text-xs">
                          {customerName(order.customer_id)}
                        </p>
                        <p className="text-slate/80 mt-2 text-[11px]">
                          {order.scheduled_at ? formatDate(order.scheduled_at) : "Sin programar"}
                        </p>
                      </Link>
                    ))}
                    {columnOrders.length === 0 && (
                      <p className="text-slate/70 px-1.5 py-3 text-xs">Sin órdenes.</p>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-paper text-slate text-xs tracking-wide uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Orden</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Prioridad</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Programada</th>
                  <th className="px-4 py-3 text-right font-medium">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-mist divide-y">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-paper/70 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-slate font-mono text-xs">{order.code}</p>
                      <p className="text-ink font-semibold">{order.title}</p>
                    </td>
                    <td className="text-slate px-4 py-3">{customerName(order.customer_id)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={priorityVariant[order.priority] ?? "neutral"}>
                        {PRIORITY_LABELS[order.priority] ?? order.priority}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant[order.operational_status] ?? "neutral"}>
                        {OPERATIONAL_STATUS_LABELS[order.operational_status] ??
                          order.operational_status}
                      </Badge>
                    </td>
                    <td className="text-slate px-4 py-3 text-xs">
                      {order.scheduled_at ? formatDate(order.scheduled_at) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/orders/${order.id}`}
                        className="border-mist text-ink hover:bg-paper inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium"
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
        </Card>
      )}
    </div>
  );
}
