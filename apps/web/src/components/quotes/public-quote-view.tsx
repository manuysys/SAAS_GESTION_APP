"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
import { api, errorMessage } from "@/lib/api";
import { quoteStatusLabel } from "@/lib/quote-status";
import { formatCurrency, formatDateOnly, formatNumber } from "@/lib/utils";

type Decision = "approve" | "reject";

type PublicQuoteViewProps = {
  token: string;
};

const statusVariant: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  draft: "neutral",
  sent: "warning",
  approved: "success",
  rejected: "danger",
  expired: "neutral",
};

export function PublicQuoteView({ token }: PublicQuoteViewProps) {
  const queryClient = useQueryClient();
  const [rejectOpen, setRejectOpen] = useState(false);

  const quoteQuery = useQuery({
    queryKey: ["public-quote", token],
    queryFn: () => api.publicQuotes.get(token),
    retry: false,
  });

  const decisionMutation = useMutation({
    mutationFn: (decision: Decision) =>
      decision === "approve" ? api.publicQuotes.approve(token) : api.publicQuotes.reject(token),
    onSuccess: (_data, decision) => {
      toast.success(decision === "approve" ? "Presupuesto aprobado" : "Presupuesto rechazado");
      setRejectOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["public-quote", token] });
    },
    onError: (error) => {
      toast.error(errorMessage(error, "No se pudo registrar tu respuesta."));
    },
  });

  if (quoteQuery.isLoading) {
    return (
      <div role="status" className="text-slate flex items-center gap-2 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Cargando presupuesto...
      </div>
    );
  }

  if (quoteQuery.isError || !quoteQuery.data) {
    return (
      <Card className="p-8 text-center">
        <h1 className="text-ink font-display text-xl font-semibold">
          No encontramos este presupuesto
        </h1>
        <p className="text-slate mx-auto mt-2 max-w-md text-sm">
          El enlace puede estar incompleto o ya no es válido. Pedile a la empresa que te envíe un
          nuevo presupuesto.
        </p>
      </Card>
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

  return (
    <div className="space-y-5">
      <header className="border-mist bg-ink overflow-hidden rounded-3xl border text-white">
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm text-white/70">
              <span className="bg-teal flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white">
                A
              </span>
              {quote.tenant_name}
            </p>
            <h1 className="font-display mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              Presupuesto {quote.number}
            </h1>
            <p className="mt-1 text-sm text-white/60">
              Para {quote.customer_name}
              {quote.valid_until ? ` · Válido hasta ${formatDateOnly(quote.valid_until)}` : ""}
            </p>
          </div>
          <Badge variant={statusVariant[quote.status] ?? "neutral"} className="w-fit">
            {quoteStatusLabel(quote.status)}
          </Badge>
        </div>
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
        <div role="status" className="border-mist rounded-2xl border bg-white p-5">
          <p className="text-ink flex items-center gap-2 font-semibold">
            <X className="h-5 w-5" aria-hidden="true" />
            Rechazaste este presupuesto
          </p>
          <p className="text-slate mt-1 text-sm">
            Si cambiás de opinión, comunicate con {quote.tenant_name}.
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Detalle</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="bg-paper text-slate text-xs tracking-wide uppercase">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">
                    Concepto
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Cant.
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    P. unitario
                  </th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-mist divide-y">
                {quote.items.map((item, index) => (
                  <tr key={`${index}-${item.description}`}>
                    <td className="text-ink px-5 py-3 font-medium">{item.description}</td>
                    <td className="text-slate px-4 py-3 text-right">
                      {formatNumber(item.quantity)}
                    </td>
                    <td className="text-slate px-4 py-3 text-right">
                      {formatCurrency(item.unit_price)}
                      {Number(item.discount_rate) > 0 && (
                        <span className="text-slate/70 block text-xs">
                          Desc. {formatNumber(item.discount_rate, 2)}%
                        </span>
                      )}
                    </td>
                    <td className="text-ink px-5 py-3 text-right font-medium">
                      {formatCurrency(item.line_total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <dl className="border-mist ml-auto space-y-1.5 border-t px-5 py-4 text-sm sm:max-w-xs">
            <div className="flex justify-between gap-4">
              <dt className="text-slate">Subtotal</dt>
              <dd className="text-ink font-medium">{formatCurrency(quote.subtotal)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate">Descuentos</dt>
              <dd className="text-ink font-medium">− {formatCurrency(quote.discount_total)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate">IVA</dt>
              <dd className="text-ink font-medium">{formatCurrency(quote.tax_total)}</dd>
            </div>
            <div className="border-mist flex justify-between gap-4 border-t pt-2 text-base">
              <dt className="text-ink font-semibold">Total</dt>
              <dd className="text-ink font-semibold">{formatCurrency(quote.total)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {quote.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-ink text-sm whitespace-pre-line">{quote.notes}</p>
          </CardContent>
        </Card>
      )}

      {canDecide ? (
        <Card className="border-teal/30 bg-teal/5 sticky bottom-4">
          <CardContent className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-ink font-display text-lg font-semibold">
                  ¿Querés aprobar este presupuesto?
                </h2>
                <p className="text-slate mt-1 text-sm">
                  Tu respuesta queda registrada y {quote.tenant_name} la ve de inmediato.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => decisionMutation.mutate("approve")}
                  disabled={decisionMutation.isPending}
                >
                  {decisionMutation.isPending && decisionMutation.variables === "approve" ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  )}
                  Aprobar presupuesto
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setRejectOpen(true)}
                  disabled={decisionMutation.isPending}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                  Rechazar
                </Button>
              </div>
            </div>
            {decisionError && (
              <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {decisionError}
              </p>
            )}
          </CardContent>
        </Card>
      ) : quote.status === "expired" ? (
        <p className="text-slate text-sm">
          Este presupuesto venció. Pedile a {quote.tenant_name} que te envíe uno nuevo.
        </p>
      ) : (
        quote.status !== "approved" &&
        quote.status !== "rejected" && (
          <p className="text-slate text-sm">
            Este presupuesto todavía no está disponible para responder. Consultá con{" "}
            {quote.tenant_name}.
          </p>
        )
      )}

      <footer className="text-slate flex items-center justify-center gap-1.5 pb-4 text-xs">
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
        Presupuesto gestionado con Arreglo
      </footer>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar presupuesto</DialogTitle>
            <DialogDescription>
              ¿Confirmás que querés rechazar el presupuesto {quote.number}? La empresa va a recibir
              tu respuesta.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button
              variant="danger"
              onClick={() => decisionMutation.mutate("reject")}
              disabled={decisionMutation.isPending}
            >
              {decisionMutation.isPending && decisionMutation.variables === "reject" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <X className="h-4 w-4" aria-hidden="true" />
              )}
              Sí, rechazar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
