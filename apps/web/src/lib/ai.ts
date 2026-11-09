import type { AIStatus } from "@/lib/api";

export const DETERMINISTIC_PROVIDER = "deterministic";

export const DETERMINISTIC_NOTICE =
  "Asistente determinista local: responde con datos reales, sin LLM externo.";

export const NOT_CONFIGURED_NOTICE =
  "IA externa no configurada. El envío está deshabilitado hasta configurar el proveedor en el servidor.";

/** Preguntas rápidas: máximo 5, tomadas de las capacidades que informa el backend. */
export const MAX_SUGGESTED_PROMPTS = 5;

/** El envío se bloquea solo si el proveedor externo no está configurado. */
export function isAiBlocked(status: AIStatus): boolean {
  return status.provider !== DETERMINISTIC_PROVIDER && !status.configured;
}

export function suggestedPrompts(capabilities: readonly string[]): string[] {
  return capabilities
    .map((capability) => capability.trim())
    .filter((capability) => capability.length > 0)
    .slice(0, MAX_SUGGESTED_PROMPTS);
}

/** Convierte una capacidad ("agenda de hoy") en una consulta completa para el input. */
export function capabilityToPrompt(capability: string): string {
  const trimmed = capability.trim();
  if (trimmed === "") return "";
  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`;
}
