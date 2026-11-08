"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Plus, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { QUOTE_STATUS_LABELS, quoteStatusLabel, quoteStatusStyle } from "@/lib/quote-status";
import { formatCurrency, formatDate, formatDateOnly } from "@/lib/utils";
import { QuoteForm } from "@/components/quotes/quote-form";

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
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-sm text-zinc-600">
        No hay una empresa activa.
      </div>
    );
  }

  const quotes = quotesQuery.data?.items ?? [];
  const total = quotesQuery.data?.total ?? 0;
  const customers = customersQuery.data?.items ?? [];
  const customerName = (id: string) =>
    customers.find((customer) => customer.id === id)?.name ?? "Cliente";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Presupuestos</h1>
          <p className="mt-1 text-sm text-zinc-600">
            {total} presupuesto{total === 1 ? "" : "s"} en {activeTenant?.name ?? "tu empresa"}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((value) => !value)}
          aria-expanded={showForm}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Cancelar" : "Nuevo presupuesto"}
        </button>
      </div>

      {showForm && <QuoteForm tenantId={activeTenantId} onCancel={() => setShowForm(false)} />}

      <div className="rounded-2xl border border-zinc-200 bg-white">
        <div className="flex flex-col gap-2 border-b border-zinc-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <label htmlFor="status-filter" className="text-sm font-medium text-zinc-700">
            Filtrar por estado
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm sm:w-56"
          >
            <option value="">Todos</option>
            {Object.entries(QUOTE_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {quotesQuery.isLoading ? (
          <p className="p-6 text-sm text-zinc-500">Cargando presupuestos...</p>
        ) : quotesQuery.isError ? (
          <p className="p-6 text-sm text-red-600">No se pudieron cargar los presupuestos.</p>
        ) : quotes.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-medium text-zinc-800">No hay presupuestos</p>
            <p className="mt-1 text-sm text-zinc-500">
              {statusFilter
                ? "Probá con otro estado o creá un presupuesto nuevo."
                : "Creá el primero para enviárselo a tus clientes."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs tracking-wide text-zinc-500 uppercase">
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
              <tbody className="divide-y divide-zinc-100">
                {quotes.map((quote) => (
                  <tr key={quote.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-zinc-900">
                      {quote.number}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{customerName(quote.customer_id)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${quoteStatusStyle(quote.status)}`}
                      >
                        {quoteStatusLabel(quote.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-zinc-900">
                      {formatCurrency(quote.total)}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">
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
