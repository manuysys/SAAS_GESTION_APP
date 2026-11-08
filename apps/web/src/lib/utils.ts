import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const ARGENTINA_TIME_ZONE = "America/Argentina/Buenos_Aires";
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | string) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export function formatNumber(value: number | string, maximumFractionDigits = 3) {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits }).format(Number(value));
}

export function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: ARGENTINA_TIME_ZONE,
  }).format(new Date(value));
}

/**
 * Formatea solo la fecha. Las fechas sin hora (YYYY-MM-DD) se tratan como fecha
 * civil para no correrlas un día al interpretarlas como UTC.
 */
export function formatDateOnly(value: string | Date) {
  const isCivilDate = typeof value === "string" && DATE_ONLY_PATTERN.test(value);
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: isCivilDate ? "UTC" : ARGENTINA_TIME_ZONE,
  }).format(new Date(value));
}

/** Descarga un Blob en el navegador con el nombre de archivo indicado. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
