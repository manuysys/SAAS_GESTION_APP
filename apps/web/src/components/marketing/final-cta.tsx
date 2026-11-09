import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { demoAccount } from "@/lib/marketing/content";
import { cn } from "@/lib/utils";

import { ctaGhostDark, ctaPrimary, focusDark } from "./ui";

/* CTA final oscuro: grilla animada, glow amber sutil y dos acciones claras. */
export function FinalCta() {
  return (
    <section
      id="demo"
      aria-labelledby="final-cta-title"
      className="relative isolate scroll-mt-16 overflow-hidden bg-ink text-white"
    >
      <div
        aria-hidden="true"
        className="mk-grid-dark mk-grid-move mk-grid-fade absolute -inset-14 -z-10 opacity-70"
      />
      <div
        aria-hidden="true"
        className="absolute top-0 left-1/2 -z-10 size-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber/15 blur-3xl"
      />

      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-16">
        <div>
          <h2
            id="final-cta-title"
            className="font-display text-[clamp(2.25rem,5.6vw,4.5rem)] leading-[1] font-semibold tracking-[-0.035em] text-balance"
          >
            Probá la demo o creá tu empresa <span className="text-amber">hoy.</span>
          </h2>
          <p className="mt-6 max-w-lg text-base leading-7 text-white/80">
            La demo tiene datos de ejemplo. Al crear tu empresa empezás con un espacio propio, sin
            datos compartidos con otras empresas.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/register" className={cn(ctaPrimary, focusDark)}>
              Crear mi empresa
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link href="/login" className={cn(ctaGhostDark, focusDark)}>
              Probar la demo
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-white/15 bg-mk-ink-2/80 p-6 backdrop-blur-sm">
          <p className="text-sm font-semibold">Cuenta demo</p>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-white/70">Email</dt>
              <dd className="font-mono break-all">{demoAccount.email}</dd>
            </div>
            <div>
              <dt className="text-white/70">Contraseña</dt>
              <dd className="font-mono">{demoAccount.password}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-white/70">
            Datos de ejemplo. No cargues información real de clientes en la demo.
          </p>
        </div>
      </div>
    </section>
  );
}
