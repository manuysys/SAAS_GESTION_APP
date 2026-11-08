export const OPERATIONAL_STATUS_LABELS: Record<string, string> = {
  new: "Nueva",
  scheduled: "Programada",
  in_progress: "En ejecución",
  waiting: "En espera",
  finished: "Finalizada",
  cancelled: "Cancelada",
};

export const OPERATIONAL_STATUS_STYLES: Record<string, string> = {
  new: "bg-zinc-100 text-zinc-700",
  scheduled: "bg-sky-50 text-sky-700",
  in_progress: "bg-amber-50 text-amber-700",
  waiting: "bg-violet-50 text-violet-700",
  finished: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-red-50 text-red-700",
};

export const REQUEST_STATUS_LABELS: Record<string, string> = {
  new: "Nueva",
  triaged: "Clasificada",
  converted: "Convertida",
  closed: "Cerrada",
};

export const PRIORITY_LABELS: Record<string, string> = {
  low: "Baja",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
};

export const OPERATIONAL_TRANSITIONS: Record<string, string[]> = {
  new: ["scheduled", "cancelled"],
  scheduled: ["in_progress", "cancelled"],
  in_progress: ["waiting", "finished", "cancelled"],
  waiting: ["in_progress", "cancelled"],
  finished: [],
  cancelled: [],
};
