import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { demoAccount, heroCopy } from "@/lib/marketing/content";
import { cn } from "@/lib/utils";

import { HeroVisual } from "./hero-visual";
import { ctaGhostDark, ctaPrimary, delayStyle, focusDark } from "./ui";

/* Hero full-bleed en ink. El texto entra con CSS (sin esperar JS) para que el LCP sea el titular. */
export function Hero() {
  return (
    <section
      id="contenido"
      aria-labelledby="hero-title"
      className="relative isolate flex min-h-[100svh] scroll-mt-16 items-center overflow-hidden bg-ink pt-24 pb-14 text-white sm:pb-20 lg:pt-28"
    >
      <div aria-hidden="true" className="mk-grid-dark mk-grid-fade absolute inset-0 -z-10" />
      <div aria-hidden="true" className="mk-scan" />

      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.02fr_1fr] lg:gap-10">
        <div>
          <p
            className="mk-rise inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/85"
            style={delayStyle(0)}
          >
            <span aria-hidden="true" className="size-1.5 rounded-full bg-amber" />
            {heroCopy.eyebrow}
          </p>

          <h1
            id="hero-title"
            className="mk-rise mt-6 font-display text-[clamp(2.6rem,6.2vw,5.25rem)] leading-[0.98] font-semibold tracking-[-0.035em] text-balance"
            style={delayStyle(80)}
          >
            {heroCopy.title} <span className="text-amber">{heroCopy.titleAccent}</span>
          </h1>

          <p
            className="mk-rise mt-6 max-w-xl text-base leading-7 text-white/80 sm:text-lg"
            style={delayStyle(160)}
          >
            {heroCopy.description}
          </p>

          <div className="mk-rise mt-8 flex flex-col gap-3 sm:flex-row" style={delayStyle(240)}>
            <Link href="/register" className={cn(ctaPrimary, focusDark)}>
              Crear mi empresa
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link href="/login" className={cn(ctaGhostDark, focusDark)}>
              Probar la demo
            </Link>
          </div>
          <p className="mk-rise mt-3 text-xs text-white/65" style={delayStyle(280)}>
            Prueba gratuita de 14 días: en implementación. Hoy no se cobra al registrarse.
          </p>

          <div
            className="mk-rise mt-8 max-w-md rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm"
            style={delayStyle(320)}
          >
            <p className="font-semibold">Cuenta demo con datos de ejemplo</p>
            <p className="mt-1 text-white/75">
              Email: <code className="font-mono text-white">{demoAccount.email}</code>
            </p>
            <p className="text-white/75">
              Contraseña: <code className="font-mono text-white">{demoAccount.password}</code>
            </p>
          </div>
        </div>

        <HeroVisual />
      </div>
    </section>
  );
}
