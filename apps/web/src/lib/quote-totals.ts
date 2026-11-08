/**
 * Vista previa de totales de presupuesto. Es orientativa: el total oficial lo
 * calcula y persiste el backend. Usa aritmética en centavos redondeados por
 * línea para evitar acumulación de errores de punto flotante.
 */

export type QuoteDraftItem = {
  quantity: string;
  unit_price: string;
  discount_rate: string;
  tax_rate: string;
};

export type QuoteTotals = {
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
};

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function calculateQuoteTotals(items: QuoteDraftItem[]): QuoteTotals {
  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;

  for (const item of items) {
    const gross = roundMoney(toNumber(item.quantity) * toNumber(item.unit_price));
    const discount = roundMoney((gross * toNumber(item.discount_rate)) / 100);
    const net = roundMoney(gross - discount);
    const tax = roundMoney((net * toNumber(item.tax_rate)) / 100);

    subtotal = roundMoney(subtotal + gross);
    discountTotal = roundMoney(discountTotal + discount);
    taxTotal = roundMoney(taxTotal + tax);
  }

  const total = roundMoney(subtotal - discountTotal + taxTotal);
  return { subtotal, discountTotal, taxTotal, total };
}
