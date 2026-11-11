/** El portal usa enlaces de un solo uso para crear sesión; se muestran una sola vez. */
export const PORTAL_ACCESS_NOTICE =
  "Este enlace se muestra una sola vez y vence. Si lo perdés o vence, generá uno nuevo.";

/** Solo se puede enviar por email si el cliente tiene un correo cargado. */
export function canSendPortalEmail(email: string | null | undefined): boolean {
  return typeof email === "string" && email.trim() !== "";
}

/** Acepta solo enlaces http(s) para mostrarlos como texto copiable. */
export function isSafePortalUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
