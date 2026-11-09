"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Receipt, Wallet, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PaymentForm } from "@/components/payments/payment-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { sumMoney } from "@/lib/money";
import { paymentMethodLabel, paymentStatusLabel } from "@/lib/payment-status";
import { formatCurrency, formatDate } from "@/lib/utils";

const paymentVariant: Record<string, "success" | "danger" | "neutral"> = {
  registered: "success",
  voided: "danger",
};

export default function PaymentsPage() {
  const { activeTenantId, tenants } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const activeTenant = tenants.find((tenant) => tenant.id === activeTenantId);
  const canManagePayments = ["owner", "admin", "dispatcher"].includes(activeTenant?.role ?? "");

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
      toast.success("Pago anulado");
      void queryClient.invalidateQueries({ queryKey: ["payments", activeTenantId] });
      void queryClient.invalidateQueries({ queryKey: ["work-orders", activeTenantId] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-summary", activeTenantId] });
    },
    onError: (error) => toast.error(errorMessage(error, "No se pudo anular el pago")),
  });

  if (!activeTenantId) {
    return <Card className="text-slate p-8 text-sm">No hay una empresa activa.</Card>;
  }

  if (!canManagePayments) {
    return <Card className="text-slate p-8 text-sm">No tenés acceso a la información de pagos.</Card>;
  }

  const payments = paymentsQuery.data?.items ?? [];
  const orders = ordersQuery.data?.items ?? [];
  const activeOrders = orders.filter((order) => order.operational_status !== "cancelled");
  const orderCode = (id: string) => orders.find((order) => order.id === id)?.code ?? "—";
  const registeredPayments = payments.filter((payment) => payment.status === "registered");
  const registeredTotal = sumMoney(registeredPayments.map((payment) => payment.amount));
  const average = registeredPayments.length
    ? Number(registeredTotal) / registeredPayments.length
    : 0;
  const voidError = voidMutation.error
    ? errorMessage(voidMutation.error, "No se pudo anular el pago")
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finanzas"
        title="Pagos"
        description={`${paymentsQuery.data?.total ?? 0} pagos en ${activeTenant?.name ?? "tu empresa"}.`}
        actions={
          <Button
            onClick={() => {
              setShowForm((value) => !value);
              voidMutation.reset();
            }}
            aria-expanded={showForm}
            variant={showForm ? "outline" : "primary"}
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? "Cancelar" : "Registrar pago"}
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total registrado"
          value={formatCurrency(registeredTotal)}
          hint="Pagos no anulados de la lista"
          icon={Wallet}
          tone="teal"
          className="border-teal/15 bg-teal/5"
        />
        <StatCard
          label="Pagos registrados"
          value={registeredPayments.length}
          hint={`${payments.length} movimientos en total`}
          icon={Receipt}
          className="border-ink/10 bg-ink/5"
        />
        <StatCard
          label="Ticket promedio"
          value={formatCurrency(average)}
          hint="Sobre pagos registrados"
          icon={Receipt}
          tone="amber"
          className="border-amber/20 bg-amber/10"
        />
      </div>

      {showForm && (
        <PaymentForm
          tenantId={activeTenantId}
          orders={activeOrders}
          onDone={() => setShowForm(false)}
        />
      )}

      {voidError && (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {voidError}
        </p>
      )}

      <Card>
        {paymentsQuery.isLoading ? (
          <p className="text-slate p-6 text-sm">Cargando pagos...</p>
        ) : paymentsQuery.isError ? (
          <p className="p-6 text-sm text-red-600">No se pudieron cargar los pagos.</p>
        ) : payments.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Wallet}
              title="No hay pagos registrados"
              description="Registrá un cobro cuando un cliente pague una orden."
              action={
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4" />
                  Registrar pago
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
              <tbody className="divide-mist divide-y">
                {payments.map((payment) => {
                  const isVoiding = voidMutation.isPending && voidMutation.variables === payment.id;
                  const canVoid = payment.status === "registered";
                  return (
                    <tr key={payment.id} className="hover:bg-paper/70 transition-colors">
                      <td className="text-slate px-4 py-3 text-xs">
                        {formatDate(payment.paid_at)}
                      </td>
                      <td className="text-slate px-4 py-3 font-mono text-xs">
                        {orderCode(payment.work_order_id)}
                      </td>
                      <td className="text-slate px-4 py-3">
                        {paymentMethodLabel(payment.method)}
                      </td>
                      <td className="text-slate px-4 py-3">{payment.reference ?? "—"}</td>
                      <td className="text-ink px-4 py-3 text-right font-semibold">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={paymentVariant[payment.status] ?? "neutral"}>
                          {paymentStatusLabel(payment.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canVoid && (
                          <Button
                            variant="outline"
                            size="sm"
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
                            className="text-red-700 hover:bg-red-50"
                          >
                            {isVoiding ? "Anulando..." : "Anular"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
