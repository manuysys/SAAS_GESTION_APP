import {
  Bot,
  CalendarDays,
  ClipboardList,
  FileText,
  MessageCircle,
  Smartphone,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { featureCards } from "@/lib/marketing/content";
import { cn } from "@/lib/utils";

import {
  AgendaMockup,
  AiMockup,
  AutomationMockup,
  ClientsMockup,
  OrdersMockup,
  PaymentsMockup,
  PhoneTechMockup,
  QuoteStatusMockup,
  WhatsAppMockup,
} from "./mockups";
import { SectionHeading } from "./section-heading";
import { TiltCard } from "./tilt-card";

type FeatureId = (typeof featureCards)[number]["id"];
type Tone = "light" | "dark" | "teal" | "amber";

const icons: Record<FeatureId, LucideIcon> = {
  clients: Users,
  orders: ClipboardList,
  quotes: FileText,
  agenda: CalendarDays,
  pwa: Smartphone,
  payments: Wallet,
  automations: Zap,
  ai: Bot,
  whatsapp: MessageCircle,
};

/** Tamaño del bento: en desktop, algunas tarjetas ocupan dos columnas. */
const spans: Record<FeatureId, string> = {
  clients: "lg:col-span-2",
  orders: "lg:col-span-1",
  quotes: "lg:col-span-2",
  agenda: "lg:col-span-1",
  pwa: "lg:col-span-1",
  payments: "lg:col-span-1",
  automations: "lg:col-span-2",
  ai: "lg:col-span-1",
  whatsapp: "lg:col-span-1",
};

/** Tono de cada tarjeta: el blanco es acento, no base. */
const tones: Record<FeatureId, Tone> = {
  clients: "light",
  orders: "dark",
  quotes: "teal",
  agenda: "light",
  pwa: "amber",
  payments: "light",
  automations: "dark",
  ai: "light",
  whatsapp: "light",
};

const toneClasses: Record<Tone, { card: string; icon: string; text: string; badge: string }> = {
  light: {
    card: "border-mist bg-white text-ink",
    icon: "bg-ink text-amber",
    text: "text-ink/75",
    badge: "border-slate/40 bg-paper text-ink",
  },
  dark: {
    card: "border-white/10 bg-mk-ink-2 text-white",
    icon: "bg-amber text-ink",
    text: "text-white/75",
    badge: "border-white/25 bg-white/10 text-white",
  },
  teal: {
    card: "border-teal bg-teal text-white",
    icon: "bg-white/15 text-white",
    text: "text-white/90",
    badge: "border-white/40 bg-white/10 text-white",
  },
  amber: {
    card: "border-amber bg-amber text-ink",
    icon: "bg-ink text-amber",
    text: "text-ink/80",
    badge: "border-ink/30 bg-white/40 text-ink",
  },
};

const previews: Record<FeatureId, ReactNode> = {
  clients: <ClientsMockup className="w-full" />,
  orders: <OrdersMockup className="w-full" />,
  quotes: <QuoteStatusMockup className="w-full" />,
  agenda: <AgendaMockup className="w-full" />,
  pwa: <PhoneTechMockup className="w-[11rem] max-w-full" />,
  payments: <PaymentsMockup className="w-full" />,
  automations: <AutomationMockup className="w-full" />,
  ai: <AiMockup className="w-full" />,
  whatsapp: <WhatsAppMockup className="w-full" />,
};

export function FeaturesBento() {
  return (
    <section
      id="funciones"
      aria-labelledby="features-title"
      className="scroll-mt-16 bg-paper py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Funciones"
          title="Cada área de la empresa, conectada a la misma orden."
          text="Clientes, órdenes, presupuestos, agenda, técnicos, pagos y automatizaciones comparten datos. Lo que pasa en la calle se ve en la oficina."
          titleId="features-title"
        />

        <div className="mt-14 grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featureCards.map((feature, index) => {
            const Icon = icons[feature.id];
            const tone = toneClasses[tones[feature.id]];
            const badge = "badge" in feature ? feature.badge : null;
            return (
              <TiltCard key={feature.id} className={spans[feature.id]} delay={(index % 3) * 0.08}>
                <article
                  className={cn(
                    "flex h-full flex-col gap-5 rounded-2xl border p-5 sm:p-6",
                    tone.card,
                  )}
                >
                  <div>
                    <span className={cn("grid size-9 place-items-center rounded-lg", tone.icon)}>
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <h3 className="mt-4 font-display text-lg font-semibold tracking-tight">
                      {feature.title}
                    </h3>
                    <p className={cn("mt-1.5 text-sm leading-6", tone.text)}>{feature.text}</p>
                  </div>
                  {badge && (
                    <p
                      className={cn(
                        "inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-medium",
                        tone.badge,
                      )}
                    >
                      {badge}
                    </p>
                  )}
                  <div className="mt-auto">{previews[feature.id]}</div>
                </article>
              </TiltCard>
            );
          })}
        </div>
        <p className="mt-8 text-xs text-slate">
          Datos ilustrativos: todas las vistas muestran una misma operación de ejemplo, no clientes
          reales.
        </p>
      </div>
    </section>
  );
}
