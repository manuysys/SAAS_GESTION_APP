"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, FileText, Plus, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { QuoteForm } from "@/components/quotes/quote-form";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { QUOTE_STATUS_LABELS, quoteStatusLabel } from "@/lib/quote-status";
import { cn, formatCurrency, formatDate, formatDateOnly } from "@/lib/utils";

const statusVariant: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  draft: "neutral",
  sent: "warning",
  approved: "success",
  rejected: "danger",
  expired: "neutral",
};

const filters = [
  { value: "", label: "Todos" },
  { value: "draft", label: "Borradores" },
  { value: "sent", label: "Enviados" },
  { value: "approved", label: "Aprobados" },
  { value: "rejected", label: "Rechazados" },
  { value: "expired", label: "Vencidos" },
] as const;

export default function QuotesPage() {
  const { activeTenantId, tenants } = useAuth();
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const activeTenant = tenants.find((tenant) => tenant.id === activeTenantId);

  const quotesQuery = useQuery({
    queryKey: ["quotes", activeTenantId, statusFilter],
    queryFn: () => api.quotes.list(activeTenantId ?? "", statusFilter || undefined),
    enabled: Boolean(activeTenantId),
  });

  const customersQuery = useQuery({
    queryKey: ["customers", activeTenantId, ""],
    queryFn: () => api.customers.list(activeTenantId ?? ""),
    enabled: Boolean(activeTenantId),
  });

  if (!activeTenantId) {
    return <Card className="text-slate p-8 text-sm">No hay una empresa activa.</Card>;
  }

  const quotes = quotesQuery.data?.items ?? [];
  const total = quotesQuery.data?.total ?? 0;
  const customers = customersQuery.data?.items ?? [];
  const customerName = (id: string) =>
    customers.find((customer) => customer.id === id)?.name ?? "Cliente";
  const sent = quotes.filter((quote) => quote.status === "sent").length;
  const approved = quotes.filter((quote) => quote.status === "approved").length;
  const amount = quotes.reduce((sum, quote) => sum + Number(quote.total), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Comercial"
        title="Presupuestos"
        description={`${total} presupuesto${total === 1 ? "" : "s"} en ${activeTenant?.name ?? "tu empresa"}.`}
        actions={
          <Button
            onClick={() => setShowForm((value) => !value)}
            aria-expanded={showForm}
            variant={showForm ? "outline" : "primary"}
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? "Cancelar" : "Nuevo presupuesto"}
          </Button>
        }
      />

      {showForm && <QuoteForm tenantId={activeTenantId} onCancel={() => setShowForm(false)} />}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total"
          value={total}
          hint="Presupuestos registrados"
          icon={FileText}
          className="border-ink/10 bg-ink/5"
        />
        <StatCard
          label="Enviados"
          value={sent}
          hint="Esperando respuesta"
          icon={FileText}
          tone="amber"
          className="border-amber/20 bg-amber/10"
        />
        <StatCard
          label="Aprobados"
          value={approved}
          hint="Listos para ejecutar"
          icon={FileText}
          tone="teal"
          className="border-teal/15 bg-teal/5"
        />
        <StatCard
          label="Monto total"
          value={formatCurrency(amount)}
          hint="Suma de la página actual"
          icon={FileText}
          tone="teal"
          className="border-teal/15 bg-teal/5"
        />
      </div>

      <Card>
        <div className="border-mist flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filtrar presupuestos">
            {filters.map((filter) => {
              const active = statusFilter === filter.value;
              return (
                <button
                  key={filter.value || "all"}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setStatusFilter(filter.value)}
                  className={cn(
                    "min-h-9 shrink-0 rounded-full px-3 text-xs font-semibold transition-colors",
                    active
                      ? "bg-ink text-white"
                      : "border-mist text-slate border bg-white hover:bg-paper",
                  )}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
          <p className="text-slate text-xs">
            {Object.keys(QUOTE_STATUS_LABELS).length} estados posibles
          </p>
        </div>

        {quotesQuery.isLoading ? (
          <p className="text-slate p-6 text-sm">Cargando presupuestos...</p>
        ) : quotesQuery.isError ? (
          <p className="p-6 text-sm text-red-600">No se pudieron cargar los presupuestos.</p>
        ) : quotes.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={FileText}
              title="No hay presupuestos"
              description={
                statusFilter
                  ? "Probá con otro estado o creá un presupuesto nuevo."
                  : "Creá el primero para enviárselo a tus clientes."
              }
              action={
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4" />
                  Nuevo presupuesto
                </Button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-paper text-slate text-xs tracking-wide uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Número
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Cliente
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Estado
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Total
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Fecha
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Detalle
                  </th>
                </tr>
              </thead>
              <tbody className="divide-mist divide-y">
                {quotes.map((quote) => (
                  <tr key={quote.id} className="hover:bg-paper/70 transition-colors">
                    <td className="text-ink px-4 py-3 font-mono text-xs font-semibold">
                      {quote.number}
                    </td>
                    <td className="text-slate px-4 py-3">{customerName(quote.customer_id)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant[quote.status] ?? "neutral"}>
                        {quoteStatusLabel(quote.status)}
                      </Badge>
                    </td>
                    <td className="text-ink px-4 py-3 text-right font-semibold">
                      {formatCurrency(quote.total)}
                    </td>
                    <td className="text-slate px-4 py-3 text-xs">
                      {quote.sent_at ? (
                        <p>Enviado {formatDate(quote.sent_at)}</p>
                      ) : (
                        <p>Sin enviar</p>
                      )}
                      {quote.valid_until && (
                        <p className="mt-0.5">Válido hasta {formatDateOnly(quote.valid_until)}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/quotes/${quote.id}`}
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
        )}
      </Card>
    </div>
  );
}
