/**
 * Porcentaje de uso frente a un límite, acotado entre 0 y 100 para barras de progreso.
 * `limit === null` significa sin límite configurado: no hay porcentaje.
 */
export function usagePercent(used: number, limit: number | null): number | null {
  if (limit === null) return null;
  if (limit <= 0) return used > 0 ? 100 : 0;
  const percent = Math.round((used / limit) * 100);
  return Math.min(100, Math.max(0, percent));
}

/** Lee un límite numérico de un JSON de entitlements. Valores ausentes o no numéricos => null. */
export function readLimit(
  limits: Record<string, unknown> | null | undefined,
  key: string,
): number | null {
  const value = limits?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
