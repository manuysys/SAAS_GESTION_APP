import { ApiError } from "@/lib/api";

export const SESSION_EXPIRED_MESSAGE = "Tu sesión venció. Volvé a ingresar.";

/**
 * Mensaje seguro para el usuario. Solo expone `detail` de errores 4xx (mensajes de
 * negocio del backend); errores 5xx, de red o desconocidos usan `fallback`.
 */
export function userFacingError(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) {
    return fallback;
  }
  if (error.status === 401) {
    return SESSION_EXPIRED_MESSAGE;
  }
  if (error.status >= 400 && error.status < 500 && error.detail.trim() !== "") {
    return error.detail;
  }
  return fallback;
}
