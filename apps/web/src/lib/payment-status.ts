/** Métodos aceptados al registrar un pago. Coincide con los valores de `PAYMENT_METHOD_LABELS`. */
export const PAYMENT_METHODS = ["cash", "transfer", "card", "mercadopago", "other"] as const;

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  card: "Tarjeta",
  mercadopago: "Mercado Pago",
  other: "Otro",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  registered: "Registrado",
  voided: "Anulado",
};

export const PAYMENT_STATUS_STYLES: Record<string, string> = {
  registered: "bg-emerald-50 text-emerald-700",
  voided: "bg-red-50 text-red-700",
};

export function paymentMethodLabel(method: string) {
  return PAYMENT_METHOD_LABELS[method] ?? method;
}

export function paymentStatusLabel(status: string) {
  return PAYMENT_STATUS_LABELS[status] ?? status;
}

export function paymentStatusStyle(status: string) {
  return PAYMENT_STATUS_STYLES[status] ?? "bg-zinc-100 text-zinc-700";
}
