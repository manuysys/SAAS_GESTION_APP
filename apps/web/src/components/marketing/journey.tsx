"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef } from "react";

import { journeySteps } from "@/lib/marketing/content";

const total = journeySteps.length;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

/*
 * Recorrido con GSAP: en desktop la sección queda fijada (pin) y el scroll
 * avanza el paso activo (scrub). En mobile y con reduced motion la lista es
 * estática y todos los pasos quedan visibles. useGSAP limpia los triggers.
 */
export function Journey() {
  const scopeRef = useRef<HTMLElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const scope = scopeRef.current;
      const counter = counterRef.current;
      if (!scope || !counter) return;

      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        gsap.registerPlugin(ScrollTrigger);
        const steps = gsap.utils.toArray<HTMLElement>("[data-journey-step]", scope);
        const bar = scope.querySelector<HTMLElement>("[data-journey-progress]");
        const decor = scope.querySelector<HTMLElement>("[data-parallax]");

        gsap.set(steps, { opacity: 0.3 });

        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: scope,
            start: "top top",
            end: `+=${steps.length * 260}`,
            pin: true,
            scrub: 0.6,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              counter.textContent = pad(Math.min(total, Math.floor(self.progress * total) + 1));
            },
          },
        });

        steps.forEach((step, index) => {
          timeline.to(step, { opacity: 1, duration: 1, ease: "none" }, index);
          if (index < steps.length - 1) {
            timeline.to(step, { opacity: 0.3, duration: 1, ease: "none" }, index + 1);
          }
        });

        if (bar) {
          timeline.fromTo(
            bar,
            { scaleX: 0 },
            { scaleX: 1, duration: steps.length, ease: "none" },
            0,
          );
        }

        if (decor) {
          gsap.to(decor, {
            yPercent: -18,
            ease: "none",
            scrollTrigger: { trigger: scope, start: "top bottom", end: "bottom top", scrub: true },
          });
        }
      });
    },
    { scope: scopeRef },
  );

  return (
    <section
      id="recorrido"
      ref={scopeRef}
      aria-labelledby="journey-title"
      className="relative isolate scroll-mt-16 overflow-hidden bg-ink text-white"
    >
      <div
        aria-hidden="true"
        className="mk-grid-dark mk-grid-fade absolute inset-0 -z-10 opacity-80"
      />

      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 sm:py-24 lg:min-h-screen lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-16 lg:py-16">
        <div>
          <p className="inline-flex items-center gap-3 text-xs font-semibold tracking-[0.14em] text-mk-teal uppercase">
            <span aria-hidden="true" className="h-px w-6 bg-current" />
            Recorrido
          </p>
          <h2
            id="journey-title"
            className="mt-4 font-display text-[clamp(2rem,4.6vw,3.5rem)] leading-[1.02] font-semibold tracking-[-0.03em] text-balance"
          >
            Del primer mensaje al cobro, sin volver a cargar datos.
          </h2>
          <p className="mt-5 max-w-md text-base leading-7 text-white/75">
            Cada paso alimenta al siguiente. La oficina, el técnico y el cliente trabajan sobre el
            mismo registro.
          </p>

          <div className="mt-10 max-w-md" aria-hidden="true">
            <p className="flex items-baseline gap-2 font-mono text-sm text-white/70">
              <span ref={counterRef} className="text-2xl font-semibold text-amber">
                01
              </span>
              / {pad(total)} etapas
            </p>
            <div className="relative mt-3 h-1 overflow-hidden rounded-full bg-white/15">
              <span data-journey-progress className="absolute inset-0 origin-left bg-amber" />
            </div>
          </div>

          <div
            data-parallax
            aria-hidden="true"
            className="mk-grid-dark pointer-events-none mt-12 hidden size-52 rotate-45 border border-white/20 lg:block"
          />
        </div>

        <ol className="relative">
          {journeySteps.map((step, index) => (
            <li
              key={step.id}
              data-journey-step
              className="grid grid-cols-[2.75rem_1fr] gap-4 border-t border-white/10 py-5 sm:py-6"
            >
              <span className="font-mono text-sm font-semibold text-amber">{pad(index + 1)}</span>
              <div>
                <h3 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
                  {step.title}
                </h3>
                <p className="mt-1.5 max-w-lg text-sm leading-6 text-white/75 sm:text-base">
                  {step.text}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
