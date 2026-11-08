"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  Send,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { QUOTE_EVENT_LABELS, quoteStatusLabel, quoteStatusStyle } from "@/lib/quote-status";
import {
  downloadBlob,
  formatCurrency,
  formatDate,
  formatDateOnly,
  formatNumber,
} from "@/lib/utils";

type QuoteAction = "send" | "approve" | "reject";

const ACTION_FEEDBACK: Record<QuoteAction, string> = {
  send: "Presupuesto enviado al cliente.",
  approve: "Presupuesto aprobado.",
  reject: "Presupuesto rechazado.",
};

const ACTION_CALLS: Record<QuoteAction, (tenantId: string, quoteId: string) => Promise<unknown>> = {
  send: (tenantId, quoteId) => api.quotes.send(tenantId, quoteId),
  approve: (tenantId, quoteId) => api.quotes.approve(tenantId, quoteId),
  reject: (tenantId, quoteId) => api.quotes.reject(tenantId, quoteId),
};

export default function QuoteDetailPage() {
  const params = useParams<{ id: string }>();
  const quoteId = params.id;
  const { activeTenantId, tenants } = useAuth();
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<string | null>(null);
  const activeTenant = tenants.find((tenant) => tenant.id === activeTenantId);

  const quoteQuery = useQuery({
    queryKey: ["quote", activeTenantId, quoteId],
    queryFn: () => api.quotes.get(activeTenantId ?? "", quoteId),
    enabled: Boolean(activeTenantId && quoteId),
  });

  const eventsQuery = useQuery({
    queryKey: ["quote-events", activeTenantId, quoteId],
    queryFn: () => api.quotes.events(activeTenantId ?? "", quoteId),
    enabled: Boolean(activeTenantId && quoteId),
  });

  const customersQuery = useQuery({
    queryKey: ["customers", activeTenantId, ""],
    queryFn: () => api.customers.list(activeTenantId ?? ""),
    enabled: Boolean(activeTenantId),
  });

  const refreshQuote = () => {
    void queryClient.invalidateQueries({ queryKey: ["quote", activeTenantId, quoteId] });
    void queryClient.invalidateQueries({ queryKey: ["quote-events", activeTenantId, quoteId] });
    void queryClient.invalidateQueries({ queryKey: ["quotes", activeTenantId] });
  };

  const actionMutation = useMutation({
    mutationFn: (action: QuoteAction) => ACTION_CALLS[action](activeTenantId ?? "", quoteId),
    onSuccess: (_data, action) => {
      setFeedback(ACTION_FEEDBACK[action]);
      refreshQuote();
    },
    onError: () => setFeedback(null),
  });

  const pdfMutation = useMutation({
    mutationFn: (fileNumber: string) =>
      api.quotes.pdf(activeTenantId ?? "", quoteId).then((blob) => ({ blob, fileNumber })),
    onSuccess: ({ blob, fileNumber }) => {
      downloadBlob(blob, `presupuesto-${fileNumber}.pdf`);
    },
  });

  if (!activeTenantId) {
    return <p className="text-sm text-zinc-600">No hay una empresa activa.</p>;
  }

  if (quoteQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-600">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando presupuesto...
      </div>
    );
  }

  if (quoteQuery.isError || !quoteQuery.data) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-8">
        <p className="text-sm font-medium text-zinc-800">No se encontró el presupuesto</p>
        <Link href="/quotes" className="mt-3 inline-block text-sm text-zinc-700 underline">
          Volver a presupuestos
        </Link>
      </div>
    );
  }

  const quote = quoteQuery.data;
  const customer = customersQuery.data?.items.find((item) => item.id === quote.customer_id);
  const events = eventsQuery.data ?? [];
  const canSend = quote.status === "draft";
  // ADR-008: solo un presupuesto enviado puede aprobarse o rechazarse.
  const canDecide = quote.status === "sent";
  const actionError = actionMutation.error
    ? errorMessage(actionMutation.error, "No se pudo completar la acción")
    : null;
  const pdfError = pdfMutation.error
    ? errorMessage(pdfMutation.error, "No se pudo descargar el PDF")
    : null;

  async function copyPublicLink(token: string) {
    const link = `${window.location.origin}/q/${token}`;
    try {
      await navigator.clipboard.writeText(link);
      setFeedback("Link público copiado al portapapeles.");
    } catch {
      setFeedback(`No pudimos copiar automáticamente. Copiá este link: ${link}`);
    }
  }

  function runAction(action: QuoteAction) {
    if (action === "reject" && !window.confirm("¿Rechazar este presupuesto?")) {
      return;
    }
    setFeedback(null);
    actionMutation.mutate(action);
  }

  const isBusy = actionMutation.isPending || pdfMutation.isPending;

  return (
    <div className="space-y-6">
      <Link
        href="/quotes"
        className="inline-flex items-center gap-1 text-sm font-medium text-zinc-600 hover:text-zinc-950"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a presupuestos
      </Link>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-xs text-zinc-500">{quote.number}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              Presupuesto {quote.number}
            </h1>
            <p className="mt-1 text-sm text-zinc-600">
              {customer?.name ?? "Cliente"} · {activeTenant?.name ?? "Empresa"}
            </p>
          </div>
          <span
            className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${quoteStatusStyle(quote.status)}`}
          >
            {quoteStatusLabel(quote.status)}
          </span>
        </div>

        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs text-zinc-500">Válido hasta</dt>
            <dd className="mt-1 font-medium">
              {quote.valid_until ? formatDateOnly(quote.valid_until) : "Sin vencimiento"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Enviado</dt>
            <dd className="mt-1 font-medium">{quote.sent_at ? formatDate(quote.sent_at) : "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Aprobado</dt>
            <dd className="mt-1 font-medium">
              {quote.approved_at ? formatDate(quote.approved_at) : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Rechazado</dt>
            <dd className="mt-1 font-medium">
              {quote.rejected_at ? formatDate(quote.rejected_at) : "—"}
            </dd>
          </div>
        </dl>
      </section>

      <section
        aria-labelledby="quote-actions-title"
        className="rounded-2xl border border-zinc-200 bg-white p-6"
      >
        <h2 id="quote-actions-title" className="text-sm font-semibold">
          Acciones
        </h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {canSend && (
            <button
              type="button"
              onClick={() => runAction("send")}
              disabled={isBusy}
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              Enviar al cliente
            </button>
          )}
          {canDecide && (
            <>
              <button
                type="button"
                onClick={() => runAction("approve")}
                disabled={isBusy}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
              >
                <Check className="h-4 w-4" />
                Aprobar
              </button>
              <button
                type="button"
                onClick={() => runAction("reject")}
                disabled={isBusy}
                className="inline-flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
              >
                <X className="h-4 w-4" />
                Rechazar
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => pdfMutation.mutate(quote.number)}
            disabled={isBusy}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
          >
            {pdfMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {pdfMutation.isPending ? "Generando PDF..." : "Descargar PDF"}
          </button>
          {quote.public_token && (
            <>
              <button
                type="button"
                onClick={() => void copyPublicLink(quote.public_token ?? "")}
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
              >
                <Copy className="h-4 w-4" />
                Copiar link público
              </button>
              <Link
                href={`/q/${quote.public_token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
              >
                <ExternalLink className="h-4 w-4" />
                Ver como cliente
              </Link>
            </>
          )}
        </div>

        <div aria-live="polite" className="mt-3 space-y-2">
          {feedback && (
            <p
              role="status"
              className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
            >
              {feedback}
            </p>
          )}
          {actionError && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {actionError}
            </p>
          )}
          {pdfError && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {pdfError}
            </p>
          )}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section
          aria-labelledby="quote-items-title"
          className="rounded-2xl border border-zinc-200 bg-white lg:col-span-2"
        >
          <h2
            id="quote-items-title"
            className="border-b border-zinc-200 px-5 py-4 text-sm font-semibold"
          >
            Conceptos
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-zinc-50 text-xs tracking-wide text-zinc-500 uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Concepto
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Cant.
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    P. unitario
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Desc.
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    IVA
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Subtotal línea
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {quote.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 font-medium text-zinc-900">{item.description}</td>
                    <td className="px-4 py-3 text-right text-zinc-600">
                      {formatNumber(item.quantity)}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-600">
                      {formatCurrency(item.unit_price)}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-600">
                      {formatNumber(item.discount_rate, 2)}%
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-600">
                      {formatNumber(item.tax_rate, 2)}%
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-zinc-900">
                      {formatCurrency(item.line_total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <dl className="space-y-1.5 border-t border-zinc-200 px-5 py-4 text-sm sm:ml-auto sm:max-w-xs">
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-600">Subtotal</dt>
              <dd className="font-medium">{formatCurrency(quote.subtotal)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-600">Descuentos</dt>
              <dd className="font-medium">− {formatCurrency(quote.discount_total)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-600">IVA</dt>
              <dd className="font-medium">{formatCurrency(quote.tax_total)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-zinc-200 pt-2 text-base">
              <dt className="font-semibold">Total</dt>
              <dd className="font-semibold">{formatCurrency(quote.total)}</dd>
            </div>
          </dl>
        </section>

        <div className="space-y-6">
          {quote.notes && (
            <section className="rounded-2xl border border-zinc-200 bg-white p-5">
              <h2 className="text-sm font-semibold">Notas</h2>
              <p className="mt-2 text-sm whitespace-pre-line text-zinc-700">{quote.notes}</p>
            </section>
          )}

          <section className="rounded-2xl border border-zinc-200 bg-white p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Clock className="h-4 w-4 text-zinc-400" />
              Historial
            </h2>
            {eventsQuery.isError ? (
              <p className="mt-3 text-sm text-red-600">No se pudo cargar el historial.</p>
            ) : events.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">Sin eventos registrados.</p>
            ) : (
              <ol className="mt-4 space-y-3">
                {events.map((event) => (
                  <li key={event.id} className="border-l-2 border-zinc-200 pl-3">
                    <p className="text-sm font-medium text-zinc-800">
                      {QUOTE_EVENT_LABELS[event.event_type] ??
                        (event.to_status
                          ? `Estado: ${quoteStatusLabel(event.to_status)}`
                          : event.event_type)}
                    </p>
                    <p className="text-xs text-zinc-500">{formatDate(event.created_at)}</p>
                    {event.payload && typeof event.payload.notes === "string" && (
                      <p className="mt-1 text-xs text-zinc-600">{event.payload.notes}</p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
