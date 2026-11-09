import { Check } from "lucide-react";
import Link from "next/link";

import { plans, planFeatures } from "@/lib/brand";
import { pricingCopy } from "@/lib/marketing/content";
import { formatPlanPrice, planLimitItems } from "@/lib/marketing/pricing";
import { cn } from "@/lib/utils";

import { SectionHeading } from "./section-heading";
import { ctaOutlineInk, ctaPrimary, focusDark, focusLight } from "./ui";

/* Precios: el plan recomendado es la única tarjeta oscura; el resto, paper. */
export function Pricing() {
  return (
    <section
      id="precios"
      aria-labelledby="pricing-title"
      className="scroll-mt-16 bg-paper py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Precios"
          title="Elegí el plan para tu equipo."
          text={pricingCopy.description}
          titleId="pricing-title"
        />
        <div className="mt-6 flex flex-wrap gap-2">
          <p className="inline-flex rounded-full bg-amber/30 px-3 py-1 text-xs font-semibold text-ink">
            {pricingCopy.title}
          </p>
          <p className="inline-flex rounded-full border border-ink/20 px-3 py-1 text-xs font-medium text-ink">
            Prueba de 14 días: en implementación
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3 lg:items-stretch">
          {plans.map((plan) => {
            const recommended = plan.code === "professional";
            return (
              <article
                key={plan.code}
                className={cn(
                  "flex flex-col rounded-2xl border p-6 sm:p-7",
                  recommended
                    ? "border-mk-ink-2 bg-mk-ink-2 text-white shadow-[0_30px_80px_-30px_rgb(11_31_51/0.6)] ring-1 ring-amber/50 lg:-translate-y-4"
                    : "border-mist bg-white text-ink",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-display text-xl font-semibold">{plan.name}</h3>
                  {recommended && (
                    <span className="rounded-full bg-amber px-2.5 py-1 text-xs font-semibold text-ink">
                      Recomendado
                    </span>
                  )}
                </div>
                <p
                  className={cn(
                    "mt-2 min-h-[3rem] text-sm leading-6",
                    recommended ? "text-white/80" : "text-ink/75",
                  )}
                >
                  {plan.tagline}
                </p>

                <p className="mt-6 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-semibold tracking-tight">
                    {formatPlanPrice(plan.priceArs)}
                  </span>
                  <span className={cn("text-sm", recommended ? "text-white/75" : "text-slate")}>
                    ARS / mes
                  </span>
                </p>

                <ul
                  className={cn(
                    "mt-6 space-y-2.5 border-t pt-6 text-sm",
                    recommended ? "border-white/15" : "border-mist",
                  )}
                >
                  {planLimitItems(plan).map((item) => (
                    <li key={item} className="flex gap-2.5">
                      <Check
                        className={cn(
                          "mt-0.5 size-4 shrink-0",
                          recommended ? "text-mk-teal" : "text-teal",
                        )}
                        aria-hidden="true"
                      />
                      {item}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/register"
                  className={cn(
                    "mt-8 justify-center",
                    recommended ? cn(ctaPrimary, focusDark) : cn(ctaOutlineInk, focusLight),
                  )}
                >
                  Empezar con {plan.name}
                </Link>
              </article>
            );
          })}
        </div>

        <div className="mt-10 rounded-2xl bg-mk-tint p-6 sm:p-7">
          <h3 className="font-display text-lg font-semibold text-ink">{pricingCopy.included}</h3>
          <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {planFeatures.map((feature) => (
              <li key={feature} className="flex gap-2.5 text-sm text-ink">
                <Check className="mt-0.5 size-4 shrink-0 text-teal" aria-hidden="true" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
