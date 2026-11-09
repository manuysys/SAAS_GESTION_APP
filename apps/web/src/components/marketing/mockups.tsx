import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/*
 * Mockups de producto en CSS, con estética oscura. Son decorativos (aria-hidden):
 * los textos de cada sección describen la pantalla. Todos los datos son ilustrativos.
 */

const BAR_HEIGHTS = [45, 62, 38, 80, 56, 70, 90];

export function MockFrame({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "overflow-hidden rounded-2xl border border-white/10 bg-mk-ink-2 text-white shadow-[0_30px_70px_-30px_rgb(0_0_0/0.75)]",
        className,
      )}
    >
      <div className="flex items-center gap-1.5 border-b border-white/10 bg-ink/60 px-3 py-2">
        <span className="size-2 rounded-full bg-white/25" />
        <span className="size-2 rounded-full bg-white/25" />
        <span className="size-2 rounded-full bg-white/25" />
        {title && (
          <span className="ml-2 truncate text-[11px] font-medium text-white/65">{title}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function Tag({
  tone = "muted",
  children,
}: {
  tone?: "ok" | "warn" | "muted";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
        tone === "ok" && "bg-teal/35 text-mk-teal",
        tone === "warn" && "bg-amber/20 text-amber",
        tone === "muted" && "bg-white/10 text-white/85",
      )}
    >
      {children}
    </span>
  );
}

function Caption() {
  return (
    <p className="border-t border-white/10 bg-ink/40 px-3 py-1.5 text-[10px] text-white/60">
      Datos ilustrativos
    </p>
  );
}

export function PanelMockup({ className }: { className?: string }) {
  const rows = [
    { code: "OT-0142", what: "Instalación de aire acondicionado", tag: "En curso", tone: "ok" },
    { code: "OT-0143", what: "Revisión de caldera", tag: "Presupuesto", tone: "warn" },
    { code: "OT-0144", what: "Cambio de cañería", tag: "Agendada", tone: "muted" },
  ] as const;

  return (
    <MockFrame title="Panel · Hoy" className={className}>
      <div className="grid grid-cols-[2.75rem_1fr] sm:grid-cols-[3.25rem_1fr]">
        <aside className="flex flex-col items-center gap-3 border-r border-white/10 bg-ink py-4">
          {[0, 1, 2, 3].map((index) => (
            <span
              key={index}
              className={cn("size-6 rounded-md", index === 0 ? "bg-amber" : "bg-white/15")}
            />
          ))}
        </aside>
        <div className="min-w-0 space-y-3 p-3 sm:p-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-white/[0.06] p-2.5">
              <p className="text-[10px] text-white/60">Órdenes hoy</p>
              <p className="mt-0.5 text-base font-semibold">14</p>
            </div>
            <div className="rounded-xl bg-white/[0.06] p-2.5">
              <p className="text-[10px] text-white/60">Sin aprobar</p>
              <p className="mt-0.5 text-base font-semibold">7</p>
            </div>
            <div className="rounded-xl bg-white/[0.06] p-2.5">
              <p className="text-[10px] text-white/60">Por cobrar</p>
              <p className="mt-0.5 truncate text-sm font-semibold">$ 1.240.000</p>
            </div>
          </div>
          <div className="rounded-xl border border-white/10 p-3">
            <p className="mb-2 text-[11px] font-medium text-white/65">Carga semanal de técnicos</p>
            <div className="flex h-20 items-end gap-1.5">
              {BAR_HEIGHTS.map((height, index) => (
                <span
                  key={index}
                  className={cn("flex-1 rounded-t", index === 3 ? "bg-amber" : "bg-teal")}
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
          </div>
          <ul className="divide-y divide-white/10 rounded-xl border border-white/10">
            {rows.map((row) => (
              <li key={row.code} className="flex items-center gap-2 px-3 py-2">
                <span className="font-mono text-[10px] text-white/60">{row.code}</span>
                <span className="min-w-0 flex-1 truncate text-[11px]">{row.what}</span>
                <Tag tone={row.tone}>{row.tag}</Tag>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <Caption />
    </MockFrame>
  );
}

export function OrdersMockup({ className }: { className?: string }) {
  const columns = [
    { title: "Pendientes", items: ["Revisión de caldera", "Filtración en baño"] },
    { title: "En curso", items: ["Instalación de A/C"] },
    { title: "Cerradas", items: ["Cambio de termotanque"] },
  ];

  return (
    <MockFrame title="Órdenes de trabajo" className={className}>
      <div className="grid grid-cols-3 gap-2 p-3">
        {columns.map((column, columnIndex) => (
          <div key={column.title} className="rounded-xl bg-white/[0.05] p-2">
            <p className="mb-2 text-[10px] font-semibold text-white/65">{column.title}</p>
            <div className="space-y-2">
              {column.items.map((item, itemIndex) => (
                <div key={item} className="rounded-lg border border-white/10 bg-ink/50 p-2">
                  <p className="text-[10px] leading-snug font-medium">{item}</p>
                  <p className="mt-1 font-mono text-[9px] text-white/60">
                    OT-014{columnIndex + itemIndex}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <Caption />
    </MockFrame>
  );
}

export function QuoteMockup({ className }: { className?: string }) {
  return (
    <MockFrame title="Presupuesto QT-2026-0001" className={className}>
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold">Revisión de caldera</p>
          <Tag tone="warn">Enviado</Tag>
        </div>
        <ul className="space-y-1.5 text-[11px]">
          <li className="flex justify-between gap-2">
            <span>Mano de obra</span>
            <span className="font-mono">$ 45.000</span>
          </li>
          <li className="flex justify-between gap-2">
            <span>Válvula de seguridad</span>
            <span className="font-mono">$ 38.500</span>
          </li>
          <li className="flex justify-between gap-2">
            <span>Gas y materiales</span>
            <span className="font-mono">$ 12.000</span>
          </li>
        </ul>
        <div className="flex items-center justify-between border-t border-white/10 pt-2">
          <span className="text-[11px] text-white/65">Total</span>
          <span className="font-display text-base font-semibold">$ 95.500</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <span className="rounded-lg bg-teal py-2 text-center text-[11px] font-semibold text-white">
            Aprobar
          </span>
          <span className="rounded-lg border border-white/25 py-2 text-center text-[11px] font-semibold text-white">
            Rechazar
          </span>
        </div>
      </div>
      <Caption />
    </MockFrame>
  );
}

export function AgendaMockup({ className }: { className?: string }) {
  const slots = [
    { time: "08:30", who: "Equipo A", what: "Instalación A/C", top: "0%", height: "34%" },
    { time: "11:00", who: "Equipo B", what: "Revisión caldera", top: "40%", height: "26%" },
    { time: "15:00", who: "Equipo A", what: "Cambio cañería", top: "72%", height: "22%" },
  ];

  return (
    <MockFrame title="Agenda · Martes" className={className}>
      <div className="relative h-56 p-3">
        <div className="absolute inset-x-3 top-3 bottom-3 space-y-0">
          {[0, 1, 2, 3, 4].map((line) => (
            <div key={line} className="border-t border-dashed border-white/10" />
          ))}
        </div>
        <div className="relative h-full">
          {slots.map((slot, index) => (
            <div
              key={slot.time}
              className={cn(
                "absolute right-0 left-0 rounded-lg border-l-4 px-2 py-1.5",
                index === 1 ? "border-amber bg-amber/15" : "border-teal bg-teal/25",
              )}
              style={{ top: slot.top, height: slot.height }}
            >
              <p className="text-[10px] font-semibold">
                {slot.time} · {slot.what}
              </p>
              <p className="text-[9px] text-white/70">{slot.who}</p>
            </div>
          ))}
        </div>
      </div>
      <Caption />
    </MockFrame>
  );
}

export function PhoneTechMockup({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "mx-auto w-[15.5rem] rounded-[2.25rem] border-[7px] border-[#06121F] bg-mk-ink-2 p-2 shadow-[0_30px_70px_-30px_rgb(0_0_0/0.8)]",
        className,
      )}
    >
      <div className="space-y-2.5 rounded-[1.5rem] bg-ink p-3">
        <p className="text-[10px] font-semibold text-white/70">Hola, Martín · Hoy</p>
        <div className="rounded-xl bg-white/[0.07] p-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] text-white/60">08:30</span>
            <Tag tone="ok">En curso</Tag>
          </div>
          <p className="mt-1 text-xs font-semibold">Instalación de A/C</p>
          <p className="text-[10px] text-white/65">Av. Ejemplo 1234, piso 2</p>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <span className="rounded-md bg-teal py-1.5 text-center text-[10px] font-semibold text-white">
              Cerrar visita
            </span>
            <span className="rounded-md border border-white/25 py-1.5 text-center text-[10px] font-semibold">
              Fotos
            </span>
          </div>
        </div>
        <div className="rounded-xl bg-white/[0.07] p-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] text-white/60">11:00</span>
            <Tag tone="muted">Agendada</Tag>
          </div>
          <p className="mt-1 text-xs font-semibold">Revisión de caldera</p>
        </div>
      </div>
    </div>
  );
}

export function PaymentsMockup({ className }: { className?: string }) {
  return (
    <MockFrame title="Pagos · OT-0142" className={className}>
      <div className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-white/[0.06] p-2.5">
            <p className="text-[10px] text-white/60">Total</p>
            <p className="font-semibold">$ 95.500</p>
          </div>
          <div className="rounded-xl bg-amber/20 p-2.5">
            <p className="text-[10px] text-white/75">Saldo pendiente</p>
            <p className="font-semibold text-amber">$ 45.500</p>
          </div>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/15">
          <div className="h-full w-1/2 rounded-full bg-teal" />
        </div>
        <p className="text-[10px] text-white/65">Cobrado: $ 50.000 · Transferencia</p>
      </div>
      <Caption />
    </MockFrame>
  );
}

export function AutomationMockup({ className }: { className?: string }) {
  const steps = [
    { label: "Presupuesto aprobado", tone: "ok" },
    { label: "Notificar a oficina", tone: "muted" },
    { label: "Crear visita pendiente", tone: "muted" },
  ] as const;

  return (
    <MockFrame title="Regla · Al aprobar presupuesto" className={className}>
      <div className="space-y-2 p-4">
        {steps.map((step, index) => (
          <div key={step.label} className="flex items-center gap-2">
            <span className="grid size-5 place-items-center rounded-full bg-amber text-[10px] font-semibold text-ink">
              {index + 1}
            </span>
            <span className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[11px]">
              {step.label}
            </span>
            <Tag tone={step.tone}>{step.tone === "ok" ? "Ejecutada" : "Lista"}</Tag>
          </div>
        ))}
      </div>
      <Caption />
    </MockFrame>
  );
}

export function AiMockup({ className }: { className?: string }) {
  return (
    <MockFrame title="Asistente" className={className}>
      <div className="space-y-2.5 p-4 text-[11px]">
        <p className="ml-auto w-4/5 rounded-xl rounded-br-sm bg-white/15 px-3 py-2">
          ¿Cuántos presupuestos siguen sin aprobar?
        </p>
        <p className="w-11/12 rounded-xl rounded-bl-sm bg-teal/25 px-3 py-2">
          Hay 7 presupuestos enviados sin respuesta. El más antiguo tiene 4 días. Los datos salen de
          tu empresa, no de internet.
        </p>
      </div>
      <Caption />
    </MockFrame>
  );
}

export function ClientsMockup({ className }: { className?: string }) {
  return (
    <MockFrame title="Cliente · Ficha" className={className}>
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-full bg-teal text-xs font-semibold text-white">
            LG
          </span>
          <div>
            <p className="text-xs font-semibold">Cliente de ejemplo</p>
            <p className="text-[10px] text-white/65">Zona norte · 3 visitas</p>
          </div>
        </div>
        <div className="space-y-1.5 rounded-xl bg-white/[0.06] p-2.5 text-[10px]">
          <p>Av. Ejemplo 1234, piso 2</p>
          <p className="text-white/65">Equipos: A/C split, caldera mural</p>
        </div>
      </div>
      <Caption />
    </MockFrame>
  );
}

export function WhatsAppMockup({ className }: { className?: string }) {
  return (
    <MockFrame title="Mensajes del negocio" className={className}>
      <div className="space-y-2 p-4 text-[11px]">
        <p className="w-4/5 rounded-xl rounded-bl-sm bg-white/[0.08] px-3 py-2">
          Tu técnico llega entre las 11:00 y las 13:00.
        </p>
        <p className="ml-auto w-3/5 rounded-xl rounded-br-sm bg-teal/35 px-3 py-2">
          Confirmado, gracias.
        </p>
      </div>
      <Caption />
    </MockFrame>
  );
}

export function QuoteStatusMockup({ className }: { className?: string }) {
  return (
    <MockFrame title="Link público" className={className}>
      <div className="space-y-2 p-4 text-[11px]">
        <p className="font-semibold">Presupuesto listo para aprobar</p>
        <p className="text-white/70">Sin cuenta: se abre desde el link.</p>
        <span className="inline-block rounded-lg bg-teal px-3 py-1.5 text-[11px] font-semibold text-white">
          Ver y aprobar
        </span>
      </div>
      <Caption />
    </MockFrame>
  );
}
