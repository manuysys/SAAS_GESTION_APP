"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { Check } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useState } from "react";

import { tourTabs, type TourTabId } from "@/lib/marketing/content";
import { cn } from "@/lib/utils";

import { OrdersMockup, PanelMockup, PhoneTechMockup, QuoteMockup } from "./mockups";
import { SectionHeading } from "./section-heading";
import { focusOnTeal } from "./ui";

function TourVisual({ id }: { id: TourTabId }) {
  switch (id) {
    case "panel":
      return <PanelMockup className="w-full" />;
    case "orders":
      return <OrdersMockup className="w-full" />;
    case "quote":
      return <QuoteMockup className="w-full max-w-md" />;
    case "tech":
      return <PhoneTechMockup className="w-[15.5rem]" />;
  }
}

/* Product tour sobre teal: pestañas con pastilla que se desliza (layoutId) y contenido animado. */
export function ProductTour() {
  const reduce = useReducedMotion();
  const pillId = useId();
  const [active, setActive] = useState<TourTabId>("panel");
  const current = tourTabs.find((tab) => tab.id === active) ?? tourTabs[0];

  function handleChange(value: string) {
    const next = tourTabs.find((tab) => tab.id === value);
    if (next) setActive(next.id);
  }

  return (
    <section
      id="producto"
      aria-labelledby="tour-title"
      className="scroll-mt-16 bg-teal py-20 text-white sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          tone="teal"
          eyebrow="Producto"
          title="Recorré las pantallas principales."
          text="Panel de la oficina, órdenes, presupuesto público y la vista del técnico en el celular."
          titleId="tour-title"
        />

        <Tabs.Root value={active} onValueChange={handleChange} className="mt-12 w-full">
          <Tabs.List
            aria-label="Pantallas del producto"
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
          >
            {tourTabs.map((tab) => {
              const isActive = tab.id === active;
              return (
                <Tabs.Trigger
                  key={tab.id}
                  value={tab.id}
                  className={cn(
                    "relative shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "border-white text-ink"
                      : "border-white/40 text-white hover:border-white hover:bg-white/10",
                    focusOnTeal,
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId={`${pillId}-pill`}
                      aria-hidden="true"
                      className="absolute inset-0 rounded-full bg-white"
                      transition={
                        reduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 40 }
                      }
                    />
                  )}
                  <span className="relative">{tab.label}</span>
                </Tabs.Trigger>
              );
            })}
          </Tabs.List>

          <Tabs.Content value={current.id} tabIndex={-1} className="mt-10 outline-none">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={current.id}
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14"
              >
                <div>
                  <h3 className="font-display text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                    {current.title}
                  </h3>
                  <p className="mt-3 text-base leading-7 text-white/90">{current.text}</p>
                  <ul className="mt-6 space-y-3">
                    {current.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-3 text-sm leading-6 text-white">
                        <Check className="mt-1 size-4 shrink-0 text-amber" aria-hidden="true" />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-6 text-xs text-white/80">
                    Las pantallas son maquetas con datos ilustrativos, no capturas de clientes
                    reales.
                  </p>
                </div>
                <div className="flex justify-center lg:justify-end">
                  <TourVisual id={current.id} />
                </div>
              </motion.div>
            </AnimatePresence>
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </section>
  );
}
