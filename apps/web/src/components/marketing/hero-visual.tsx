"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import type { ReactNode } from "react";
import { useCallback, useRef, useState } from "react";

import { formatPlanPrice } from "@/lib/marketing/pricing";
import { cn } from "@/lib/utils";

import { HeroFallback } from "./hero-fallback";
import { HeroScene } from "./hero-scene";
import { delayStyle } from "./ui";

type LiveCardProps = {
  className: string;
  delay: number;
  accent: "teal" | "amber";
  children: ReactNode;
};

function LiveCard({ className, delay, accent, children }: LiveCardProps) {
  return (
    <div
      className={cn(
        "mk-rise absolute w-56 rounded-xl border border-white/15 bg-mk-ink-2/95 p-3.5 text-white shadow-[0_24px_50px_-20px_rgb(0_0_0/0.8)] sm:w-64",
        className,
      )}
      style={delayStyle(delay)}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-3 left-0 w-0.5 rounded-full",
          accent === "amber" ? "bg-amber" : "bg-teal",
        )}
      />
      {children}
    </div>
  );
}

/*
 * Visual del hero: escena isométrica (3D en desktop, SVG en el resto) con
 * tarjetas de producto que flotan. Las tarjetas muestran datos ilustrativos.
 * El parallax respeta prefers-reduced-motion.
 */
export function HeroVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const [sceneReady, setSceneReady] = useState(false);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const sceneY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [30, -50]);
  const cardsY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [-12, 40]);

  const handleReady = useCallback(() => setSceneReady(true), []);

  return (
    <div
      ref={ref}
      className="relative mx-auto aspect-[4/4.4] w-full max-w-[36rem] sm:aspect-[5/4] lg:aspect-[6/5] lg:max-w-none"
    >
      <motion.div className="absolute inset-0" style={{ y: sceneY }}>
        <HeroFallback
          className={cn("transition-opacity duration-700", sceneReady && "opacity-0")}
        />
        <HeroScene onReady={handleReady} />
      </motion.div>

      <motion.div className="pointer-events-none absolute inset-0" style={{ y: cardsY }}>
        <LiveCard className="top-[4%] left-0" delay={200} accent="teal">
          <p className="flex items-center gap-2 text-[11px] font-medium text-white/75">
            <span className="mk-ping relative size-2 rounded-full bg-mk-teal text-mk-teal" />
            En vivo · OT-0142
          </p>
          <p className="mt-2 text-sm font-semibold">Instalación de A/C</p>
          <p className="text-[11px] text-white/70">Martín · 08:30 · En curso</p>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/15">
            <span className="block h-full w-3/5 rounded-full bg-teal" />
          </div>
        </LiveCard>

        <LiveCard className="right-0 bottom-[12%]" delay={360} accent="amber">
          <p className="text-[11px] font-medium text-amber">Presupuesto aprobado</p>
          <p className="mt-1 text-sm font-semibold">QT-2026-0001</p>
          <p className="font-mono text-xs text-white/85">{formatPlanPrice(95500)}</p>
          <p className="mt-2 text-[10px] text-white/60">Aprobado desde el link público</p>
        </LiveCard>

        <LiveCard className="bottom-[34%] left-[3%] hidden sm:block" delay={520} accent="teal">
          <p className="flex items-center gap-2 text-[11px] font-medium text-white/75">
            <span className="mk-ping relative size-2 rounded-full bg-amber text-amber" />
            Cobro registrado
          </p>
          <p className="mt-2 text-xs text-white/80">
            Saldo pendiente <span className="font-mono">{formatPlanPrice(45500)}</span>
          </p>
        </LiveCard>
      </motion.div>

      <p className="absolute right-3 bottom-1 text-[10px] text-white/55">Datos ilustrativos</p>
    </div>
  );
}
