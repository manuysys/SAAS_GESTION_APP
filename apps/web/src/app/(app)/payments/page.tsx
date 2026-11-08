"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { useState } from "react";

import { PaymentForm } from "@/components/payments/payment-form";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { sumMoney } from "@/lib/money";
import { paymentMethodLabel, paymentStatusLabel, paymentStatusStyle } from "@/lib/payment-status";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function PaymentsPage() {
  const { activeTenantId, tenants } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const activeTenant = tenants.find((tenant) => tenant.id === activeTenantId);
  const canManagePayments = ["owner", "admin", "dispatcher"].includes(
    activeTenant?.role ?? "",
  );

  const paymentsQuery = useQuery({
    queryKey: ["payments", activeTenantId],
    queryFn: () => api.payments.list(activeTenantId ?? ""),
    enabled: Boolean(activeTenantId) && canManagePayments,
  });

  const ordersQuery = useQuery({
    queryKey: ["work-orders", activeTenantId],
    queryFn: () => api.workOrders.list(activeTenantId ?? ""),
    enabled: Boolean(activeTenantId) && canManagePayments,
  });

  const voidMutation = useMutation({
    mutationFn: (paymentId: string) => api.payments.void(activeTenantId ?? "", paymentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["payments", activeTenantId] });
      void queryClient.invalidateQueries({ queryKey: ["work-orders", activeTenantId] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-summary", activeTenantId] });
    },
  });

  if (!activeTenantId) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-sm text-zinc-600">
        No hay una empresa activa.
      </div>
    );
  }

  if (!canManagePayments) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-sm text-zinc-600">
        No tenés acceso a la información de pagos.
      </div>
    );
  }

  const payments = paymentsQuery.data?.items ?? [];
  const orders = ordersQuery.data?.items ?? [];
  const activeOrders = orders.filter((order) => order.operational_status !== "cancelled");
  const orderCode = (id: string) => orders.find((order) => order.id === id)?.code ?? "—";
  const registeredTotal = sumMoney(
    payments.filter((payment) => payment.status === "registered").map((payment) => payment.amount),
  );
  const voidError = voidMutation.error
    ? errorMessage(voidMutation.error, "No se pudo anular el pago")
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pagos</h1>
          <p className="mt-1 text-sm text-zinc-600">
            {paymentsQuery.data?.total ?? 0} pagos en {activeTenant?.name ?? "tu empresa"}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowForm((value) => !value);
            voidMutation.reset();
          }}
          aria-expanded={showForm}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Cancelar" : "Registrar pago"}
        </button>
      </div>

      <section
        aria-labelledby="payments-total-title"
        className="rounded-2xl border border-zinc-200 bg-white p-5"
      >
        <h2 id="payments-total-title" className="text-sm text-zinc-600">
          Total registrado
        </h2>
        <p className="mt-1 text-2xl font-semibold">{formatCurrency(registeredTotal)}</p>
        <p className="mt-1 text-xs text-zinc-500">
          Suma de los pagos no anulados de la lista cargada.
        </p>
      </section>

      {showForm && (
        <PaymentForm
          tenantId={activeTenantId}
          orders={activeOrders}
          onDone={() => setShowForm(false)}
        />
      )}

      {voidError && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {voidError}
        </p>
      )}

      <div className="rounded-2xl border border-zinc-200 bg-white">
        {paymentsQuery.isLoading ? (
          <p className="p-6 text-sm text-zinc-500">Cargando pagos...</p>
        ) : paymentsQuery.isError ? (
          <p className="p-6 text-sm text-red-600">No se pudieron cargar los pagos.</p>
        ) : payments.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-medium text-zinc-800">No hay pagos registrados</p>
            <p className="mt-1 text-sm text-zinc-500">
              Registrá un cobro cuando un cliente pague una orden.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs tracking-wide text-zinc-500 uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Fecha
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Orden
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Método
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Referencia
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Monto
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Estado
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {payments.map((payment) => {
                  const isVoiding = voidMutation.isPending && voidMutation.variables === payment.id;
                  const canVoid = payment.status === "registered";
                  return (
                    <tr key={payment.id} className="hover:bg-zinc-50">
                      <td className="px-4 py-3 text-xs text-zinc-600">
                        {formatDate(payment.paid_at)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-700">
                        {orderCode(payment.work_order_id)}
                      </td>
                      <td className="px-4 py-3 text-zinc-600">
                        {paymentMethodLabel(payment.method)}
                      </td>
                      <td className="px-4 py-3 text-zinc-600">{payment.reference ?? "—"}</td>
                      <td className="px-4 py-3 text-right font-medium text-zinc-900">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${paymentStatusStyle(payment.status)}`}
                        >
                          {paymentStatusLabel(payment.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canVoid && (
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                window.confirm(
                                  "¿Anular este pago? La anulación no se puede deshacer.",
                                )
                              ) {
                                voidMutation.mutate(payment.id);
                              }
                            }}
                            disabled={isVoiding}
                            aria-label={`Anular pago de ${formatCurrency(payment.amount)} del ${formatDate(payment.paid_at)}`}
                            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                          >
                            {isVoiding ? "Anulando..." : "Anular"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
