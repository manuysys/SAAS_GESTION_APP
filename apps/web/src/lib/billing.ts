import type { SubscriptionStatus, SubscriptionUsage } from "@/lib/api";

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  trialing: "En prueba",
  active: "Activa",
  past_due: "Pago pendiente",
  cancelled: "Cancelada",
};

export const SUBSCRIPTION_STATUS_CLASSES: Record<SubscriptionStatus, string> = {
  trialing: "bg-sky-50 text-sky-800",
  active: "bg-emerald-50 text-emerald-700",
  past_due: "bg-amber-50 text-amber-800",
  cancelled: "bg-zinc-100 text-zinc-700",
};

export const SUBSCRIPTION_STATUSES = [
  "trialing",
  "active",
  "past_due",
  "cancelled",
] as const satisfies readonly SubscriptionStatus[];

/** Límites del plan y el campo de uso que se compara contra cada uno. */
export const PLAN_LIMIT_ITEMS = [
  { key: "max_users", label: "Usuarios", usageKey: "users_count" },
  { key: "max_technicians", label: "Técnicos", usageKey: "technicians_count" },
  { key: "max_orders_per_month", label: "Órdenes por mes", usageKey: "orders_this_month" },
  { key: "ai_monthly_tokens", label: "Tokens de IA por mes", usageKey: "ai_tokens_used" },
] as const satisfies readonly {
  key: string;
  label: string;
  usageKey: keyof SubscriptionUsage;
}[];

export function isSubscriptionStatus(
  value: string | null | undefined,
): value is SubscriptionStatus {
  return SUBSCRIPTION_STATUSES.some((status) => status === value);
}

export function periodLabel(billingPeriod: string): string {
  return billingPeriod === "monthly" ? "mes" : billingPeriod;
}
