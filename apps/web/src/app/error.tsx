"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="bg-paper flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        <p className="text-xs font-semibold tracking-[0.16em] text-red-600 uppercase">Error</p>
        <h1 className="font-display text-ink mt-3 text-3xl font-semibold tracking-tight">
          Algo salió mal
        </h1>
        <p className="text-slate mt-3 text-sm">
          No pudimos cargar esta pantalla. Probá de nuevo; si el problema sigue, avisanos.
        </p>
        <Button className="mt-6" onClick={reset}>
          Reintentar
        </Button>
      </div>
    </main>
  );
}
