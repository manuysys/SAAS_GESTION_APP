import { OPERATIONAL_TRANSITIONS } from "@/lib/order-status";

export const ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;

export const MATERIAL_UNITS = ["u", "m", "m²", "kg", "l", "h", "caja", "rollo"] as const;

export type TechnicianAction = {
  to: "in_progress" | "waiting" | "finished";
  label: string;
};

const TECHNICIAN_ACTION_LABELS: Record<TechnicianAction["to"], string> = {
  in_progress: "Iniciar",
  waiting: "En espera",
  finished: "Finalizar",
};

/**
 * Acciones que el técnico puede disparar desde la orden. Se derivan de la misma
 * tabla de transiciones que usa el panel; el backend valida igualmente.
 */
export function technicianActions(operationalStatus: string): TechnicianAction[] {
  const allowed = OPERATIONAL_TRANSITIONS[operationalStatus] ?? [];
  const actions: TechnicianAction[] = [];
  for (const to of ["in_progress", "waiting", "finished"] as const) {
    if (allowed.includes(to)) {
      actions.push({ to, label: TECHNICIAN_ACTION_LABELS[to] });
    }
  }
  return actions;
}

/**
 * Normaliza una cantidad ingresada en formato es-AR ("1,5") a decimal con punto.
 * Devuelve null si no es un número positivo válido con hasta 3 decimales.
 */
export function normalizeQuantity(input: string): string | null {
  const trimmed = input.trim().replace(",", ".");
  if (!/^\d{1,8}(\.\d{1,3})?$/.test(trimmed)) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value <= 0) return null;
  return trimmed;
}

/** Valida tipo y tamaño antes de subir. Devuelve el mensaje de error o null. */
export function validateAttachmentFile(file: { type: string; size: number }): string | null {
  if (!file.type.startsWith("image/")) {
    return "Solo se pueden subir imágenes.";
  }
  if (file.size > ATTACHMENT_MAX_BYTES) {
    return "La imagen supera el máximo de 5 MB.";
  }
  if (file.size === 0) {
    return "El archivo está vacío.";
  }
  return null;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}
