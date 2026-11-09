import { z } from "zod";

import type { WhatsAppConfigInput } from "@/lib/api";

const DIGITS_PATTERN = /^\d+$/;
const PHONE_PATTERN = /^\+?\d{8,15}$/;

export const whatsappConfigFormSchema = z.object({
  phone_number_id: z
    .string()
    .trim()
    .min(1, "Ingresá el phone_number_id de Meta")
    .max(32, "Máximo 32 caracteres")
    .regex(DIGITS_PATTERN, "Solo números"),
  business_account_id: z
    .string()
    .trim()
    .min(1, "Ingresá el business_account_id de Meta")
    .max(32, "Máximo 32 caracteres")
    .regex(DIGITS_PATTERN, "Solo números"),
  /** Vacío = conservar el secreto existente. */
  access_token: z.string().trim().max(1024, "Máximo 1024 caracteres"),
  verify_token: z.string().trim().max(256, "Máximo 256 caracteres"),
  app_secret: z.string().trim().max(256, "Máximo 256 caracteres"),
  active: z.boolean(),
});

export type WhatsAppConfigFormValues = z.infer<typeof whatsappConfigFormSchema>;

/**
 * Arma el payload de configuración. Los secretos vacíos no se envían,
 * así el backend conserva los existentes; nunca se muestran valores guardados.
 */
export function buildWhatsAppConfigInput(values: WhatsAppConfigFormValues): WhatsAppConfigInput {
  return {
    phone_number_id: values.phone_number_id,
    business_account_id: values.business_account_id,
    active: values.active,
    access_token: values.access_token === "" ? undefined : values.access_token,
    verify_token: values.verify_token === "" ? undefined : values.verify_token,
    app_secret: values.app_secret === "" ? undefined : values.app_secret,
  };
}

export const whatsappSendSchema = z.object({
  to_phone: z
    .string()
    .trim()
    .regex(PHONE_PATTERN, "Ingresá el número en formato internacional, por ejemplo +5491155550000"),
  body: z.string().trim().min(1, "Escribí un mensaje").max(4096, "Máximo 4096 caracteres"),
});

export type WhatsAppSendFormValues = z.infer<typeof whatsappSendSchema>;
