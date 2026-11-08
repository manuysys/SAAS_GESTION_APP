"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, X } from "lucide-react";

import { api, errorMessage } from "@/lib/api";
import { quoteStatusLabel, quoteStatusStyle } from "@/lib/quote-status";
import { formatCurrency, formatDateOnly, formatNumber } from "@/lib/utils";

type Decision = "approve" | "reject";

type PublicQuoteViewProps = {
  token: string;
};

export function PublicQuoteView({ token }: PublicQuoteViewProps) {
  const queryClient = useQueryClient();

  const quoteQuery = useQuery({
    queryKey: ["public-quote", token],
    queryFn: () => api.publicQuotes.get(token),
    retry: false,
  });

  const decisionMutation = useMutation({
    mutationFn: (decision: Decision) =>
      decision === "approve" ? api.publicQuotes.approve(token) : api.publicQuotes.reject(token),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["public-quote", token] });
    },
  });

  if (quoteQuery.isLoading) {
    return (
      <div role="status" className="flex items-center gap-2 text-sm text-zinc-600">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Cargando presupuesto...
      </div>
    );
  }

  if (quoteQuery.isError || !quoteQuery.data) {
    return (
      <section className="rounded-2xl border border-zinc-200 bg-white p-8 text-center">
        <h1 className="text-lg font-semibold">No encontramos este presupuesto</h1>
        <p className="mt-2 text-sm text-zinc-600">
          El enlace puede estar incompleto o ya no es válido. Pedile a la empresa que te envíe un
          nuevo presupuesto.
        </p>
      </section>
    );
  }

  const quote = quoteQuery.data;
  const canDecide = quote.status === "sent";
  const decisionError = decisionMutation.error
    ? errorMessage(
        decisionMutation.error,
        "No se pudo registrar tu respuesta. Intentá nuevamente en unos minutos.",
      )
    : null;

  function handleDecision(decision: Decision) {
    if (
      decision === "reject" &&
      !window.confirm("¿Confirmás que querés rechazar este presupuesto?")
    ) {
      return;
    }
    decisionMutation.mutate(decision);
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-zinc-200 bg-white p-6">
        <p className="text-sm text-zinc-600">{quote.tenant_name}</p>
        <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Presupuesto {quote.number}</h1>
          <span
            className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${quoteStatusStyle(quote.status)}`}
          >
            {quoteStatusLabel(quote.status)}
          </span>
        </div>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-zinc-500">Para</dt>
            <dd className="mt-1 font-medium">{quote.customer_name}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Válido hasta</dt>
            <dd className="mt-1 font-medium">
              {quote.valid_until ? formatDateOnly(quote.valid_until) : "Sin vencimiento"}
            </dd>
          </div>
        </dl>
      </header>

      {quote.status === "approved" && (
        <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="flex items-center gap-2 font-semibold text-emerald-900">
            <Check className="h-5 w-5" aria-hidden="true" />
            Aprobaste este presupuesto
          </p>
          <p className="mt-1 text-sm text-emerald-900">
            Gracias. {quote.tenant_name} recibió tu aprobación y se va a comunicar con vos para
            coordinar los próximos pasos.
          </p>
        </div>
      )}

      {quote.status === "rejected" && (
        <div role="status" className="rounded-2xl border border-zinc-300 bg-white p-5">
          <p className="flex items-center gap-2 font-semibold text-zinc-900">
            <X className="h-5 w-5" aria-hidden="true" />
            Rechazaste este presupuesto
          </p>
          <p className="mt-1 text-sm text-zinc-700">
            Si cambiás de opinión, comunicate con {quote.tenant_name}.
          </p>
        </div>
      )}

      <section
        aria-labelledby="public-items-title"
        className="rounded-2xl border border-zinc-200 bg-white"
      >
        <h2
          id="public-items-title"
          className="border-b border-zinc-200 px-5 py-4 text-sm font-semibold"
        >
          Detalle
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
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
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {quote.items.map((item, index) => (
                <tr key={`${index}-${item.description}`}>
                  <td className="px-4 py-3 font-medium text-zinc-900">{item.description}</td>
                  <td className="px-4 py-3 text-right text-zinc-600">
                    {formatNumber(item.quantity)}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-600">
                    {formatCurrency(item.unit_price)}
                    {Number(item.discount_rate) > 0 && (
                      <span className="block text-xs text-zinc-500">
                        Desc. {formatNumber(item.discount_rate, 2)}%
                      </span>
                    )}
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

      {quote.notes && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold">Notas</h2>
          <p className="mt-2 text-sm whitespace-pre-line text-zinc-700">{quote.notes}</p>
        </section>
      )}

      {canDecide ? (
        <section
          aria-labelledby="public-decision-title"
          className="rounded-2xl border border-zinc-200 bg-white p-5"
        >
          <h2 id="public-decision-title" className="text-sm font-semibold">
            ¿Querés aprobar este presupuesto?
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            Tu respuesta queda registrada y {quote.tenant_name} la va a ver de inmediato.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => handleDecision("approve")}
              disabled={decisionMutation.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
            >
              {decisionMutation.isPending && decisionMutation.variables === "approve" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Check className="h-4 w-4" aria-hidden="true" />
              )}
              Aprobar presupuesto
            </button>
            <button
              type="button"
              onClick={() => handleDecision("reject")}
              disabled={decisionMutation.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
            >
              {decisionMutation.isPending && decisionMutation.variables === "reject" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <X className="h-4 w-4" aria-hidden="true" />
              )}
              Rechazar
            </button>
          </div>
          {decisionError && (
            <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {decisionError}
            </p>
          )}
        </section>
      ) : quote.status === "expired" ? (
        <p className="text-sm text-zinc-600">
          Este presupuesto venció. Pedile a {quote.tenant_name} que te envíe uno nuevo.
        </p>
      ) : (
        quote.status !== "approved" &&
        quote.status !== "rejected" && (
          <p className="text-sm text-zinc-600">
            Este presupuesto todavía no está disponible para responder. Consultá con{" "}
            {quote.tenant_name}.
          </p>
        )
      )}
    </div>
  );
}
