import { z } from "zod";

import type {
  AutomationActionType,
  AutomationEventType,
  AutomationExecutionStatus,
  AutomationRuleInput,
} from "@/lib/api";

export const AUTOMATION_EVENT_TYPES = [
  "quote_sent",
  "quote_approved",
  "quote_rejected",
  "work_order_status_changed",
  "appointment_created",
  "payment_registered",
] as const satisfies readonly AutomationEventType[];

export const AUTOMATION_ACTION_TYPES = [
  "notify",
  "notify_user",
  "send_whatsapp",
] as const satisfies readonly AutomationActionType[];

export const EVENT_TYPE_LABELS: Record<AutomationEventType, string> = {
  quote_sent: "Presupuesto enviado",
  quote_approved: "Presupuesto aprobado",
  quote_rejected: "Presupuesto rechazado",
  work_order_status_changed: "Cambio de estado de orden",
  appointment_created: "Turno agendado",
  payment_registered: "Pago registrado",
};

export const ACTION_TYPE_LABELS: Record<AutomationActionType, string> = {
  notify: "Notificar a gestión",
  notify_user: "Notificar a un usuario",
  send_whatsapp: "Enviar WhatsApp",
};

export const EXECUTION_STATUS_LABELS: Record<AutomationExecutionStatus, string> = {
  pending: "Pendiente",
  success: "Exitosa",
  failed: "Fallida",
  skipped: "Omitida",
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export type JsonObjectResult =
  { ok: true; value: Record<string, unknown> | undefined } | { ok: false };

/**
 * Parsea un textarea con JSON opcional. Vacío => undefined; debe ser un objeto JSON.
 * JSON.parse devuelve `unknown` y se valida con type guard (sin `any`).
 */
export function parseOptionalJsonObject(raw: string): JsonObjectResult {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return { ok: true, value: undefined };
  }
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (isPlainObject(parsed)) {
      return { ok: true, value: parsed };
    }
  } catch {
    // Se informa como error de formato en la validación.
  }
  return { ok: false };
}

export const automationFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Ingresá un nombre de al menos 2 caracteres")
      .max(160, "Máximo 160 caracteres"),
    event_type: z.enum(AUTOMATION_EVENT_TYPES, { error: "Elegí un evento" }),
    action_type: z.enum(AUTOMATION_ACTION_TYPES, { error: "Elegí una acción" }),
    conditions: z
      .string()
      .max(4000, "Máximo 4000 caracteres")
      .refine((raw) => parseOptionalJsonObject(raw).ok, "Las condiciones deben ser un objeto JSON"),
    action_config: z
      .string()
      .max(4000, "Máximo 4000 caracteres")
      .refine(
        (raw) => parseOptionalJsonObject(raw).ok,
        "La configuración de la acción debe ser un objeto JSON",
      ),
    /** Solo para `notify_user`: UUID del usuario destinatario. */
    user_id: z.string().trim(),
    active: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (values.action_type !== "notify_user") return;

    if (values.user_id !== "" && !isUuid(values.user_id)) {
      ctx.addIssue({ code: "custom", path: ["user_id"], message: "Ingresá un UUID válido" });
      return;
    }

    const config = parseOptionalJsonObject(values.action_config);
    const configUserId = config.ok ? config.value?.user_id : undefined;
    const hasUser =
      values.user_id !== "" || (typeof configUserId === "string" && isUuid(configUserId));
    if (!hasUser) {
      ctx.addIssue({
        code: "custom",
        path: ["user_id"],
        message: "Indicá el usuario destinatario (UUID)",
      });
    }
  });

export type AutomationFormValues = z.infer<typeof automationFormSchema>;

/**
 * Convierte los valores del formulario al payload del backend.
 * Para `notify_user`, el user_id del campo dedicado sobrescribe el del JSON libre.
 */
export function buildAutomationRuleInput(values: AutomationFormValues): AutomationRuleInput {
  const conditions = parseOptionalJsonObject(values.conditions);
  const actionConfig = parseOptionalJsonObject(values.action_config);

  let config: Record<string, unknown> | undefined =
    actionConfig.ok && actionConfig.value ? { ...actionConfig.value } : undefined;

  if (values.action_type === "notify_user" && values.user_id !== "") {
    config = { ...(config ?? {}), user_id: values.user_id };
  }

  return {
    name: values.name,
    event_type: values.event_type,
    action_type: values.action_type,
    conditions: conditions.ok ? conditions.value : undefined,
    action_config: config,
    active: values.active,
  };
}
