/** Estados según ADR-008: draft → sent → approved | rejected. */
export const QUOTE_STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  sent: "Enviado",
  approved: "Aprobado",
  rejected: "Rechazado",
  expired: "Vencido",
};

export const QUOTE_STATUS_STYLES: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-700",
  sent: "bg-sky-50 text-sky-700",
  approved: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-700",
  expired: "bg-amber-50 text-amber-700",
};

export const QUOTE_EVENT_LABELS: Record<string, string> = {
  created: "Presupuesto creado",
  updated: "Presupuesto editado",
  sent: "Enviado al cliente",
  approved: "Aprobado",
  rejected: "Rechazado",
  expired: "Vencido",
};

export function quoteStatusLabel(status: string) {
  return QUOTE_STATUS_LABELS[status] ?? status;
}

export function quoteStatusStyle(status: string) {
  return QUOTE_STATUS_STYLES[status] ?? "bg-zinc-100 text-zinc-700";
}
