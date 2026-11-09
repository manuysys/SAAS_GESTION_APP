import type { Plan } from "@/lib/brand";

const arsFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const countFormatter = new Intl.NumberFormat("es-AR");

export function formatPlanPrice(priceArs: number) {
  return arsFormatter.format(priceArs);
}

export function formatCount(value: number) {
  return countFormatter.format(value);
}

/** Límites del plan en texto listo para mostrar en la landing. */
export function planLimitItems(plan: Plan) {
  const { users, technicians, ordersPerMonth, aiTokens } = plan.limits;
  return [
    `${formatCount(users)} ${users === 1 ? "usuario" : "usuarios"}`,
    `${formatCount(technicians)} ${technicians === 1 ? "técnico" : "técnicos"}`,
    `${formatCount(ordersPerMonth)} órdenes por mes`,
    `${formatCount(aiTokens)} tokens de IA por mes`,
  ];
}
