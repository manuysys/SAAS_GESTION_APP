import { z } from "zod";

import { ApiError } from "@/lib/api";
import type {
  OnboardingDaySchedule,
  OnboardingService,
  OnboardingState,
  Weekday,
} from "@/lib/onboarding-api";

export const ONBOARDING_STEP_COUNT = 4;

export const ONBOARDING_STEPS = [
  {
    step: 1,
    title: "Empresa",
    description: "Nombre, zona horaria y moneda.",
  },
  {
    step: 2,
    title: "Servicios y horarios",
    description: "Qué ofrecés, cuánto dura y cuándo atendés.",
  },
  {
    step: 3,
    title: "Equipo",
    description: "Invitá a quienes trabajan con vos.",
  },
  {
    step: 4,
    title: "Primeros datos",
    description: "Cargá tus primeros clientes.",
  },
] as const;

export const ONBOARDING_TIMEZONES = [
  "America/Argentina/Buenos_Aires",
  "America/Argentina/Cordoba",
  "America/Argentina/Mendoza",
] as const;

export type OnboardingTimezone = (typeof ONBOARDING_TIMEZONES)[number];

export const DEFAULT_TIMEZONE: OnboardingTimezone = "America/Argentina/Buenos_Aires";
export const DEFAULT_CURRENCY = "ARS";
export const DEFAULT_START_TIME = "09:00";
export const DEFAULT_END_TIME = "18:00";
export const MAX_SERVICES = 20;

export const WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const satisfies readonly Weekday[];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miércoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sábado",
  sunday: "Domingo",
};

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const PRICE_PATTERN = /^\d{1,12}([.,]\d{1,2})?$/;

export function isOnboardingTimezone(value: string): value is OnboardingTimezone {
  return (ONBOARDING_TIMEZONES as readonly string[]).includes(value);
}

export function clampStep(value: unknown): number {
  if (typeof value === "number" && Number.isInteger(value)) {
    return Math.min(Math.max(value, 1), ONBOARDING_STEP_COUNT);
  }
  return 1;
}

/** Completa los campos faltantes del estado guardado. Tolera `state: null` del backend. */
export function normalizeOnboardingState(
  state: OnboardingState | null | undefined,
): Required<OnboardingState> {
  return {
    step: clampStep(state?.step),
    company: state?.company ?? null,
    services: state?.services ?? [],
    schedule: state?.schedule ?? {},
    team_invited: state?.team_invited ?? false,
    first_customer: state?.first_customer ?? false,
  };
}

export function isValidTime(value: string): boolean {
  return TIME_PATTERN.test(value);
}

/**
 * Convierte precio ingresado en formato argentino simple ("15000", "15000,5", "15000.50")
 * a string Decimal con dos decimales. No acepta separadores de miles para evitar ambigüedad.
 */
export function parsePriceInput(raw: string): string | null {
  const value = raw.trim();
  if (!PRICE_PATTERN.test(value)) {
    return null;
  }
  const [integerPart, decimalPart = ""] = value.replace(",", ".").split(".");
  return `${integerPart}.${decimalPart.padEnd(2, "0")}`;
}

export function timeOrderError(start: string, end: string): string | null {
  if (!isValidTime(start) || !isValidTime(end)) {
    return "Usá el formato HH:MM, por ejemplo 09:00.";
  }
  return end > start ? null : "La hora de fin debe ser posterior a la de inicio.";
}

export type ScheduleDayForm = {
  enabled: boolean;
  start: string;
  end: string;
};

export type ScheduleForm = Record<Weekday, ScheduleDayForm>;

/** Valida la franja semanal. Devuelve el primer error o null si es válida. */
export function validateScheduleDays(days: ScheduleForm): string | null {
  const enabledDays = WEEKDAYS.filter((day) => days[day].enabled);
  if (enabledDays.length === 0) {
    return "Elegí al menos un día de atención.";
  }
  for (const day of enabledDays) {
    const error = timeOrderError(days[day].start, days[day].end);
    if (error) {
      return `${WEEKDAY_LABELS[day]}: ${error}`;
    }
  }
  return null;
}

/** Solo se envían los días habilitados; el resto queda fuera del horario. */
export function buildSchedulePayload(
  days: ScheduleForm,
): Partial<Record<Weekday, OnboardingDaySchedule>> {
  const payload: Partial<Record<Weekday, OnboardingDaySchedule>> = {};
  for (const day of WEEKDAYS) {
    const value = days[day];
    if (value.enabled) {
      payload[day] = { start: value.start, end: value.end };
    }
  }
  return payload;
}

/** Valores iniciales del horario: los guardados o lunes a viernes por defecto. */
export function scheduleFormDefaults(
  schedule: OnboardingState["schedule"] | undefined,
): ScheduleForm {
  const hasSaved = schedule !== undefined && Object.keys(schedule).length > 0;
  const defaultEnabled = (day: Weekday) => !hasSaved && day !== "saturday" && day !== "sunday";

  const result = {} as ScheduleForm;
  for (const day of WEEKDAYS) {
    const saved = schedule?.[day];
    result[day] = {
      enabled: saved !== undefined || defaultEnabled(day),
      start: saved?.start ?? DEFAULT_START_TIME,
      end: saved?.end ?? DEFAULT_END_TIME,
    };
  }
  return result;
}

export const companyStepSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Ingresá el nombre de la empresa")
    .max(120, "Máximo 120 caracteres"),
  timezone: z.enum(ONBOARDING_TIMEZONES, { error: "Elegí una zona horaria" }),
});

export type CompanyStepValues = z.infer<typeof companyStepSchema>;

export const serviceFormSchema = z.object({
  name: z.string().trim().min(2, "Ingresá el nombre del servicio").max(80, "Máximo 80 caracteres"),
  duration: z
    .string()
    .regex(/^\d+$/, "Ingresá minutos en número entero")
    .refine((value) => {
      const minutes = Number(value);
      return minutes >= 15 && minutes <= 1440;
    }, "Entre 15 y 1440 minutos"),
  price: z.string().refine((value) => parsePriceInput(value) !== null, {
    error: "Ingresá un precio válido, por ejemplo 15000 o 15000,50",
  }),
});

export type ServiceFormValues = z.infer<typeof serviceFormSchema>;

const scheduleDaySchema = z.object({
  enabled: z.boolean(),
  start: z.string(),
  end: z.string(),
});

export const servicesStepSchema = z.object({
  services: z
    .array(serviceFormSchema)
    .min(1, "Agregá al menos un servicio")
    .max(MAX_SERVICES, `Máximo ${MAX_SERVICES} servicios`),
  days: z.record(z.enum(WEEKDAYS), scheduleDaySchema).superRefine((value, ctx) => {
    const message = validateScheduleDays(value);
    if (message) {
      ctx.addIssue({ code: "custom", message });
    }
  }),
});

export type ServicesStepValues = z.infer<typeof servicesStepSchema>;

/** Convierte valores validados del formulario al contrato de la API. */
export function buildServicesPayload(services: ServiceFormValues[]): OnboardingService[] {
  return services.map((service) => ({
    name: service.name,
    duration_minutes: Number(service.duration),
    price: parsePriceInput(service.price) ?? "0.00",
  }));
}

export function servicesFormDefaults(services: OnboardingService[]): ServiceFormValues[] {
  if (services.length === 0) {
    return [{ name: "", duration: "60", price: "" }];
  }
  return services.map((service) => ({
    name: service.name,
    duration: String(service.duration_minutes),
    price: service.price,
  }));
}

export type OnboardingChecklistItem = {
  key: "company" | "services" | "team" | "customers";
  label: string;
  done: boolean;
  href: string;
};

/**
 * Estado real de la configuración para el checklist del dashboard.
 * El backend fusiona valores por defecto (servicio "Instalación", horario lun–vie y nombre
 * "Mi Empresa"), así que la presencia de datos no indica que el usuario los haya cargado.
 * Un paso se considera hecho solo cuando el asistente avanzó más allá de él (`step` > n).
 */
export function onboardingChecklist(state: Required<OnboardingState>): OnboardingChecklistItem[] {
  return [
    {
      key: "company",
      label: "Datos de la empresa",
      done: state.step > 1,
      href: "/onboarding",
    },
    {
      key: "services",
      label: "Servicios y horarios",
      done: state.step > 2,
      href: "/onboarding",
    },
    {
      key: "team",
      label: "Equipo invitado",
      done: state.team_invited,
      href: "/settings/team",
    },
    {
      key: "customers",
      label: "Primeros clientes",
      done: state.first_customer,
      href: "/settings/import",
    },
  ];
}

/** Mensaje honesto para errores del asistente. Un 404 indica endpoint no desplegado. */
export function onboardingErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof TypeError) {
    return "No pudimos conectar con el servidor. Revisá tu conexión e intentá de nuevo.";
  }
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return error.detail;
    }
    if (error.status === 404) {
      return "La configuración inicial todavía no está disponible en este entorno.";
    }
    if (error.status >= 400 && error.status < 500 && error.detail.trim() !== "") {
      return error.detail;
    }
  }
  return fallback;
}
