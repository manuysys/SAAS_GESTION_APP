import type { EmailStatus } from "@/lib/api";

export type EmailFeedbackTone = "success" | "warning" | "info";

export type EmailFeedback = {
  tone: EmailFeedbackTone;
  message: string;
};

/**
 * Traduce el estado de envío a un mensaje honesto. `sent` significa que el proveedor
 * aceptó el correo, no que haya llegado a la bandeja: nunca se afirma entrega.
 */
export function emailDeliveryFeedback(
  status: EmailStatus | string,
  recipient: string,
): EmailFeedback {
  switch (status) {
    case "sent":
      return {
        tone: "success",
        message: `El proveedor aceptó el email para ${recipient}. No podemos confirmar que haya llegado a la bandeja.`,
      };
    case "failed":
      return {
        tone: "warning",
        message: `No pudimos enviar el email a ${recipient}. El enlace igual se generó: copiálo y compartilo por otro medio.`,
      };
    case "console":
      return {
        tone: "info",
        message:
          "El envío por email está desactivado en este entorno: no salió ningún correo. Copiá el enlace y compartilo manualmente.",
      };
    case "not_sent":
      return {
        tone: "info",
        message: "No se envió email. El enlace está listo para copiar y compartir.",
      };
    default:
      return {
        tone: "info",
        message:
          "No sabemos si el email salió. Copiá el enlace y compartilo manualmente si hace falta.",
      };
  }
}
