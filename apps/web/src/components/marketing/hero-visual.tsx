"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import type { ReactNode } from "react";
import { useCallback, useRef, useState } from "react";

import {
  demoOperation,
  demoRefs,
  getCustomer,
  getOrder,
  getQuote,
  getQuoteBalance,
  getQuoteTotalPaid,
  getTechnician,
  orderStatusLabel,
} from "@/lib/marketing/demo-data";
import { formatArs } from "@/lib/marketing/pricing";
import { cn } from "@/lib/utils";

import { HeroFallback } from "./hero-fallback";
import { HeroScene } from "./hero-scene";
import { delayStyle } from "./ui";

type FloatCardProps = {
  className: string;
  delay: number;
  accent: "teal" | "amber";
  children: ReactNode;
};

function FloatCard({ className, delay, accent, children }: FloatCardProps) {
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
 * tarjetas de producto que flotan. Las tarjetas leen el dataset de ejemplo
 * (demo-data.ts) y se rotulan una sola vez como datos ilustrativos.
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

  const activeOrder = getOrder(demoRefs.activeOrderId);
  const activeTechnician = getTechnician(demoRefs.technicianId);
  const activeAppointment = demoOperation.appointments.find(
    (item) => item.orderId === activeOrder.id,
  );
  const approvedQuote = getQuote(demoRefs.approvedQuoteId);
  const paid = getQuoteTotalPaid(approvedQuote.id);
  const balance = getQuoteBalance(approvedQuote.id);
  const customer = getCustomer(activeOrder.customerId);

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
        <FloatCard className="top-[4%] left-0" delay={200} accent="teal">
          <p className="text-[11px] font-medium text-white/75">
            Ejemplo de operación · {activeOrder.id}
          </p>
          <p className="mt-2 text-sm font-semibold">{activeOrder.title}</p>
          <p className="text-[11px] text-white/70">
            {activeTechnician.firstName}
            {activeAppointment ? ` · ${activeAppointment.startTime}` : ""} ·{" "}
            {orderStatusLabel[activeOrder.status]}
          </p>
        </FloatCard>

        <FloatCard className="right-0 bottom-[12%]" delay={360} accent="amber">
          <p className="text-[11px] font-medium text-amber">Presupuesto aprobado</p>
          <p className="mt-1 text-sm font-semibold">{approvedQuote.id}</p>
          <p className="font-mono text-xs text-white/85">{formatArs(approvedQuote.total)}</p>
          <p className="mt-2 text-[10px] text-white/60">Aprobado desde el link público</p>
        </FloatCard>

        <FloatCard className="bottom-[34%] left-[3%] hidden sm:block" delay={520} accent="teal">
          <p className="text-[11px] font-medium text-white/75">Cobro parcial · {customer.name}</p>
          <p className="mt-2 text-xs text-white/80">
            Cobrado <span className="font-mono">{formatArs(paid)}</span> · Saldo{" "}
            <span className="font-mono">{formatArs(balance)}</span>
          </p>
        </FloatCard>
      </motion.div>

      <p className="absolute right-3 bottom-1 text-[10px] text-white/55">Datos ilustrativos</p>
    </div>
  );
}
