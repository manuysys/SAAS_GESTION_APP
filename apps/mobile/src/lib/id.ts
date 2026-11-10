/** ID estable para idempotencia offline, sin depender de crypto nativo. */
export function clientId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
