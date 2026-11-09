import type { CSSProperties } from "react";

/* Clases compartidas de la landing. Contraste AA sobre cada fondo. */

export const focusLight =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal";
export const focusDark =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber";
export const focusOnTeal =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

export const ctaPrimary =
  "mk-glow-amber inline-flex items-center justify-center gap-2 rounded-xl bg-amber px-5 py-3 text-sm font-semibold text-ink transition-[filter,transform] hover:brightness-105 active:scale-[0.99]";
export const ctaGhostDark =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 px-5 py-3 text-sm font-semibold text-white transition-colors hover:border-white hover:bg-white/10";
export const ctaInk =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-mk-ink-3";
export const ctaOutlineInk =
  "inline-flex items-center justify-center rounded-xl border border-ink px-5 py-3 text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-white";

/** Retraso de la entrada CSS (`.mk-rise`), en milisegundos. */
export function delayStyle(ms: number): CSSProperties {
  return { "--mk-delay": `${ms}ms` } as CSSProperties;
}
