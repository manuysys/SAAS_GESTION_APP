import type { Appointment } from "@/lib/api";
import { ARGENTINA_TIME_ZONE } from "@/lib/utils";

export const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  scheduled: "Programado",
  completed: "Completado",
  cancelled: "Cancelado",
  no_show: "No asistió",
};

export const APPOINTMENT_STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-sky-50 text-sky-700",
  completed: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-red-50 text-red-700",
  no_show: "bg-amber-50 text-amber-700",
};

export function appointmentStatusLabel(status: string) {
  return APPOINTMENT_STATUS_LABELS[status] ?? status;
}

export function appointmentStatusStyle(status: string) {
  return APPOINTMENT_STATUS_STYLES[status] ?? "bg-zinc-100 text-zinc-700";
}

const dayPartsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: ARGENTINA_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat("es-AR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: ARGENTINA_TIME_ZONE,
});

/** Día civil `YYYY-MM-DD` en zona horaria argentina. */
export function argentinaDayKey(value: Date | string): string {
  const parts = dayPartsFormatter.formatToParts(new Date(value));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function todayArgentinaDay(now: Date = new Date()): string {
  return argentinaDayKey(now);
}

/** Desplaza un día `YYYY-MM-DD` en días civiles (sin efectos de zona horaria). */
export function shiftDay(day: string, delta: number): string {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date + delta)).toISOString().slice(0, 10);
}

export function formatTimeArgentina(value: string): string {
  return timeFormatter.format(new Date(value));
}

/** Turnos cuyo inicio cae en el día civil indicado, ordenados por inicio. */
export function appointmentsOnDay(items: readonly Appointment[], day: string): Appointment[] {
  return items
    .filter((appointment) => argentinaDayKey(appointment.starts_at) === day)
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
}

/** Límites ISO de un día civil argentino, para filtrar en el backend. */
export function dayBoundsIso(day: string): { start: string; end: string } {
  return {
    start: new Date(`${day}T00:00:00-03:00`).toISOString(),
    end: new Date(`${shiftDay(day, 1)}T00:00:00-03:00`).toISOString(),
  };
}

/** Valor para `<input type="datetime-local">` a partir de un día y una hora `HH:mm`. */
export function dateTimeLocalFromDay(day: string, time: string): string {
  return `${day}T${time}`;
}

/** Valor local `YYYY-MM-DDTHH:mm` del instante dado, en la zona del navegador. */
export function formatDateTimeLocal(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `${day}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Convierte un valor de `datetime-local` (hora del navegador, que en Argentina
 * coincide con la zona del usuario) a ISO 8601 UTC para la API.
 */
export function localDateTimeToIso(value: string): string {
  return new Date(value).toISOString();
}
