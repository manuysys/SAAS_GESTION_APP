import { BadgeDollarSign, Link2, MapPin, Smartphone } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { productStats, trustItems } from "@/lib/marketing/content";

import { Counter } from "./counter";
import { SectionHeading } from "./section-heading";

const icons: Record<(typeof trustItems)[number]["id"], LucideIcon> = {
  pwa: Smartphone,
  ars: BadgeDollarSign,
  "public-link": Link2,
  ar: MapPin,
};

/* Cifras del producto con contadores y puntos clave. Sin métricas de clientes. */
export function TrustStrip() {
  return (
    <section aria-labelledby="stats-title" className="bg-paper py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end lg:gap-16">
          <SectionHeading
            eyebrow="Qué incluye"
            title="Pocas piezas, con los mismos datos."
            titleId="stats-title"
          />

          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-mist bg-mist">
            {productStats.map((stat) => (
              <div key={stat.label} className="bg-white p-5 sm:p-6">
                <dt className="text-xs leading-5 text-slate">{stat.detail}</dt>
                <dd className="mt-2 flex items-baseline gap-2 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
                  <Counter value={stat.value} />
                  <span className="text-sm font-medium text-slate">{stat.label}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {trustItems.map((item) => {
            const Icon = icons[item.id];
            return (
              <li key={item.id} className="flex items-start gap-3 border-t border-ink/15 pt-5">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-ink">
                  <Icon className="size-4 text-amber" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">{item.label}</p>
                  <p className="mt-0.5 text-xs leading-5 text-slate">{item.detail}</p>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-8 text-xs text-slate">
          Cifras del producto, no de clientes. Las pantallas muestran datos de ejemplo.
        </p>
      </div>
    </section>
  );
}
