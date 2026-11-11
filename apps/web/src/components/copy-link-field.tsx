"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

type CopyLinkFieldProps = {
  id: string;
  label: string;
  value: string;
  helpText: string;
};

/** Muestra un enlace de solo lectura con botón de copia. El valor nunca se persiste. */
export function CopyLinkField({ id, label, value, helpText }: CopyLinkFieldProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  const status =
    copyState === "copied"
      ? "Enlace copiado."
      : copyState === "failed"
        ? "No pudimos copiar automáticamente. Seleccioná el texto y copialo manualmente."
        : helpText;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={id}
          readOnly
          value={value}
          onFocus={(event) => event.currentTarget.select()}
          className="min-h-10 w-full min-w-0 rounded-xl border border-mist bg-white px-3 py-2 font-mono text-xs text-ink outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
        />
        <Button type="button" variant="outline" onClick={() => void copy()} className="shrink-0">
          {copyState === "copied" ? (
            <Check className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Copy className="h-4 w-4" aria-hidden="true" />
          )}
          Copiar
        </Button>
      </div>
      <p
        role="status"
        aria-live="polite"
        className={copyState === "failed" ? "text-xs text-red-700" : "text-xs text-slate"}
      >
        {status}
      </p>
    </div>
  );
}
