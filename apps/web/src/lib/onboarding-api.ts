import { readJsonOrThrow, sessionFetch } from "@/lib/api-session";

export type Weekday =
  "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

export type OnboardingCompany = {
  name: string;
  timezone: string;
  currency: string;
};

/** `price` llega como string (Decimal serializado). Nunca convertir a number para persistir. */
export type OnboardingService = {
  name: string;
  duration_minutes: number;
  price: string;
};

/** Horas en formato HH:MM, hora local de la empresa. */
export type OnboardingDaySchedule = {
  start: string;
  end: string;
};

export type OnboardingState = {
  step: number;
  company?: OnboardingCompany | null;
  services?: OnboardingService[];
  /** Solo contiene los días en que la empresa atiende. */
  schedule?: Partial<Record<Weekday, OnboardingDaySchedule>>;
  team_invited?: boolean;
  first_customer?: boolean;
};

export type OnboardingStatus = {
  completed: boolean;
  state: OnboardingState | null;
};

/** Merge parcial del estado. Puede incluir `step` para avanzar o retroceder. */
export type OnboardingPatch = Partial<OnboardingState>;

/** Solo owner y admin. Devuelve el estado guardado después del merge. */
export async function getOnboarding(tenantId: string): Promise<OnboardingStatus> {
  const response = await sessionFetch("/api/v1/onboarding", { method: "GET", tenantId });
  return readJsonOrThrow<OnboardingStatus>(response, "No se pudo cargar la configuración inicial.");
}

export async function patchOnboarding(
  tenantId: string,
  patch: OnboardingPatch,
): Promise<OnboardingStatus> {
  const response = await sessionFetch("/api/v1/onboarding", {
    method: "PATCH",
    tenantId,
    json: patch,
  });
  return readJsonOrThrow<OnboardingStatus>(response, "No se pudo guardar el paso.");
}

export async function completeOnboarding(tenantId: string): Promise<{ completed: boolean }> {
  const response = await sessionFetch("/api/v1/onboarding/complete", {
    method: "POST",
    tenantId,
    json: {},
  });
  return readJsonOrThrow<{ completed: boolean }>(
    response,
    "No se pudo finalizar la configuración.",
  );
}
