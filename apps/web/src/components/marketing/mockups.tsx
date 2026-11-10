import type { ReactNode } from "react";

import {
  AGENDA_DAY_MINUTES,
  DEMO_REFERENCE_DATE,
  demoOperation,
  demoRefs,
  daysBetween,
  getCustomer,
  getDemoSummary,
  getOrder,
  getQuote,
  getQuoteBalance,
  getQuoteTotalPaid,
  getTechnician,
  orderStatusLabel,
  quoteStatusLabel,
  timeToMinutes,
  type DemoOrderStatus,
} from "@/lib/marketing/demo-data";
import { formatArs } from "@/lib/marketing/pricing";
import { cn } from "@/lib/utils";

/*
 * Mockups de producto en CSS, con estética oscura. Son decorativos (aria-hidden).
 * Todos los datos salen de lib/marketing/demo-data.ts. Los textos de cada
 * sección indican que son datos ilustrativos (una vez por composición).
 */

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

type TagTone = "ok" | "warn" | "muted";

function Tag({ tone = "muted", children }: { tone?: TagTone; children: ReactNode }) {
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

const orderTone: Record<DemoOrderStatus, TagTone> = {
  en_curso: "ok",
  pendiente: "warn",
  agendada: "muted",
};

const panelLabel: Record<DemoOrderStatus, string> = {
  en_curso: orderStatusLabel.en_curso,
  pendiente: "Sin aprobar",
  agendada: orderStatusLabel.agendada,
};

function plural(count: number, singular: string, pluralForm: string) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

export function PanelMockup({ className }: { className?: string }) {
  const summary = getDemoSummary();
  const technicianRows = demoOperation.technicians.map((technician) => {
    const visits = demoOperation.appointments.filter(
      (appointment) =>
        appointment.technicianId === technician.id && appointment.date === DEMO_REFERENCE_DATE,
    ).length;
    return { id: technician.id, name: technician.fullName, visits };
  });
  const unassigned = demoOperation.orders.filter((order) => order.technicianId === null).length;

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
              <p className="mt-0.5 text-base font-semibold">{summary.ordersToday}</p>
            </div>
            <div className="rounded-xl bg-white/[0.06] p-2.5">
              <p className="text-[10px] text-white/60">Sin aprobar</p>
              <p className="mt-0.5 text-base font-semibold">{summary.quotesAwaitingResponse}</p>
            </div>
            <div className="rounded-xl bg-white/[0.06] p-2.5">
              <p className="text-[10px] text-white/60">Por cobrar</p>
              <p className="mt-0.5 truncate text-sm font-semibold">
                {formatArs(summary.pendingBalance)}
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-white/10 p-3">
            <p className="mb-2 text-[11px] font-medium text-white/65">Técnicos hoy</p>
            <ul className="space-y-1.5 text-[11px]">
              {technicianRows.map((row) => (
                <li key={row.id} className="flex justify-between gap-2">
                  <span>{row.name}</span>
                  <span className="text-white/70">{plural(row.visits, "visita", "visitas")}</span>
                </li>
              ))}
              <li className="flex justify-between gap-2">
                <span>Sin técnico</span>
                <span className="text-amber">{plural(unassigned, "orden", "órdenes")}</span>
              </li>
            </ul>
          </div>
          <ul className="divide-y divide-white/10 rounded-xl border border-white/10">
            {demoOperation.orders.map((order) => (
              <li key={order.id} className="flex items-center gap-2 px-3 py-2">
                <span className="font-mono text-[10px] text-white/60">{order.id}</span>
                <span className="min-w-0 flex-1 truncate text-[11px]">{order.title}</span>
                <Tag tone={orderTone[order.status]}>{panelLabel[order.status]}</Tag>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </MockFrame>
  );
}

export function OrdersMockup({ className }: { className?: string }) {
  const columns: { title: string; status: DemoOrderStatus }[] = [
    { title: "Pendiente", status: "pendiente" },
    { title: "Agendada", status: "agendada" },
    { title: "En curso", status: "en_curso" },
  ];

  return (
    <MockFrame title="Órdenes de trabajo" className={className}>
      <div className="grid grid-cols-3 gap-2 p-3">
        {columns.map((column) => {
          const items = demoOperation.orders.filter((order) => order.status === column.status);
          return (
            <div key={column.title} className="rounded-xl bg-white/[0.05] p-2">
              <p className="mb-2 text-[10px] font-semibold text-white/65">{column.title}</p>
              <div className="space-y-2">
                {items.map((order) => (
                  <div key={order.id} className="rounded-lg border border-white/10 bg-ink/50 p-2">
                    <p className="text-[10px] leading-snug font-medium">{order.title}</p>
                    <p className="mt-1 font-mono text-[9px] text-white/60">{order.id}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </MockFrame>
  );
}

export function QuoteMockup({ className }: { className?: string }) {
  const quote = getQuote(demoRefs.pendingQuoteId);

  return (
    <MockFrame title={`Presupuesto ${quote.id}`} className={className}>
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold">{getOrder(quote.orderId).title}</p>
          <Tag tone="warn">{quoteStatusLabel[quote.status]}</Tag>
        </div>
        <ul className="space-y-1.5 text-[11px]">
          {quote.items.map((item) => (
            <li key={item.description} className="flex justify-between gap-2">
              <span>{item.description}</span>
              <span className="font-mono">{formatArs(item.amount)}</span>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between border-t border-white/10 pt-2">
          <span className="text-[11px] text-white/65">Total</span>
          <span className="font-display text-base font-semibold">{formatArs(quote.total)}</span>
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
    </MockFrame>
  );
}

export function AgendaMockup({ className }: { className?: string }) {
  const span = AGENDA_DAY_MINUTES.end - AGENDA_DAY_MINUTES.start;
  const slots = demoOperation.appointments
    .filter((appointment) => appointment.date === DEMO_REFERENCE_DATE)
    .map((appointment) => {
      const start = timeToMinutes(appointment.startTime);
      const end = timeToMinutes(appointment.endTime);
      return {
        id: appointment.id,
        time: appointment.startTime,
        title: getOrder(appointment.orderId).title,
        who: getTechnician(appointment.technicianId).firstName,
        active: getOrder(appointment.orderId).status === "en_curso",
        top: `${((start - AGENDA_DAY_MINUTES.start) / span) * 100}%`,
        height: `${((end - start) / span) * 100}%`,
      };
    });

  return (
    <MockFrame title="Agenda · Hoy" className={className}>
      <div className="relative h-56 p-3">
        <div className="absolute inset-x-3 top-3 bottom-3 space-y-0">
          {[0, 1, 2, 3, 4].map((line) => (
            <div key={line} className="border-t border-dashed border-white/10" />
          ))}
        </div>
        <div className="relative h-full">
          {slots.map((slot) => (
            <div
              key={slot.id}
              className={cn(
                "absolute right-0 left-0 rounded-lg border-l-4 px-2 py-1.5",
                slot.active ? "border-teal bg-teal/25" : "border-amber bg-amber/15",
              )}
              style={{ top: slot.top, height: slot.height }}
            >
              <p className="text-[10px] font-semibold">
                {slot.time} · {slot.title}
              </p>
              <p className="text-[9px] text-white/70">{slot.who}</p>
            </div>
          ))}
        </div>
      </div>
    </MockFrame>
  );
}

export function PhoneTechMockup({ className }: { className?: string }) {
  const technician = getTechnician(demoRefs.technicianId);
  const visits = demoOperation.appointments
    .filter((appointment) => appointment.technicianId === technician.id)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  return (
    <div
      aria-hidden="true"
      className={cn(
        "mx-auto w-[15.5rem] rounded-[2.25rem] border-[7px] border-[#06121F] bg-mk-ink-2 p-2 shadow-[0_30px_70px_-30px_rgb(0_0_0/0.8)]",
        className,
      )}
    >
      <div className="space-y-2.5 rounded-[1.5rem] bg-ink p-3">
        <p className="text-[10px] font-semibold text-white/70">
          Hola, {technician.firstName} · Hoy
        </p>
        {visits.map((appointment) => {
          const order = getOrder(appointment.orderId);
          const customer = getCustomer(order.customerId);
          const active = order.status === "en_curso";
          return (
            <div key={appointment.id} className="rounded-xl bg-white/[0.07] p-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] text-white/60">{appointment.startTime}</span>
                <Tag tone={active ? "ok" : "muted"}>{orderStatusLabel[order.status]}</Tag>
              </div>
              <p className="mt-1 text-xs font-semibold">{order.title}</p>
              {active && (
                <>
                  <p className="text-[10px] text-white/65">{customer.address}</p>
                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    <span className="rounded-md bg-teal py-1.5 text-center text-[10px] font-semibold text-white">
                      Cerrar visita
                    </span>
                    <span className="rounded-md border border-white/25 py-1.5 text-center text-[10px] font-semibold">
                      Fotos
                    </span>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PaymentsMockup({ className }: { className?: string }) {
  const quote = getQuote(demoRefs.approvedQuoteId);
  const paid = getQuoteTotalPaid(quote.id);
  const balance = getQuoteBalance(quote.id);
  const payment = demoOperation.payments.find((item) => item.id === demoRefs.paymentId);
  const percent = Math.round((paid / quote.total) * 100);

  return (
    <MockFrame title={`Pagos · ${quote.orderId}`} className={className}>
      <div className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-white/[0.06] p-2.5">
            <p className="text-[10px] text-white/60">Total</p>
            <p className="font-semibold">{formatArs(quote.total)}</p>
          </div>
          <div className="rounded-xl bg-amber/20 p-2.5">
            <p className="text-[10px] text-white/75">Saldo pendiente</p>
            <p className="font-semibold text-amber">{formatArs(balance)}</p>
          </div>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/15">
          <div className="h-full rounded-full bg-teal" style={{ width: `${percent}%` }} />
        </div>
        <p className="text-[10px] text-white/65">
          Cobrado: {formatArs(paid)}
          {payment ? ` · ${payment.method}` : ""}
        </p>
      </div>
    </MockFrame>
  );
}

export function AutomationMockup({ className }: { className?: string }) {
  const quote = getQuote(demoRefs.approvedQuoteId);
  const technician = getTechnician(demoRefs.technicianId);
  const steps = [
    { label: `Presupuesto ${quote.id} aprobado`, tag: "Disparador", tone: "ok" },
    { label: "Notificar a la oficina", tag: "Notifica", tone: "muted" },
    { label: `Notificar a ${technician.firstName}`, tag: "Notifica", tone: "muted" },
  ] as const;

  return (
    <MockFrame title="Reglas · Al aprobar un presupuesto" className={className}>
      <div className="space-y-2 p-4">
        {steps.map((step, index) => (
          <div key={step.label} className="flex items-center gap-2">
            <span className="grid size-5 place-items-center rounded-full bg-amber text-[10px] font-semibold text-ink">
              {index + 1}
            </span>
            <span className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[11px]">
              {step.label}
            </span>
            <Tag tone={step.tone}>{step.tag}</Tag>
          </div>
        ))}
      </div>
    </MockFrame>
  );
}

export function AiMockup({ className }: { className?: string }) {
  const summary = getDemoSummary();
  const quote = getQuote(demoRefs.pendingQuoteId);
  const days = daysBetween(quote.sentOn, DEMO_REFERENCE_DATE);

  return (
    <MockFrame title="Asistente" className={className}>
      <div className="space-y-2.5 p-4 text-[11px]">
        <p className="ml-auto w-4/5 rounded-xl rounded-br-sm bg-white/15 px-3 py-2">
          ¿Cuántos presupuestos siguen sin aprobar?
        </p>
        <p className="w-11/12 rounded-xl rounded-bl-sm bg-teal/25 px-3 py-2">
          Hay {plural(summary.quotesAwaitingResponse, "presupuesto", "presupuestos")} sin respuesta:{" "}
          {quote.id} por {formatArs(quote.total)}, enviado hace {plural(days, "día", "días")}. Solo
          consulta datos de tu empresa; no ejecuta acciones.
        </p>
      </div>
    </MockFrame>
  );
}

export function ClientsMockup({ className }: { className?: string }) {
  const customer = getCustomer(demoRefs.customerId);
  const orderCount = demoOperation.orders.filter(
    (order) => order.customerId === customer.id,
  ).length;

  return (
    <MockFrame title="Cliente · Ficha" className={className}>
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-full bg-teal text-xs font-semibold text-white">
            {customer.initials}
          </span>
          <div>
            <p className="text-xs font-semibold">{customer.name}</p>
            <p className="text-[10px] text-white/65">
              {customer.zone} · {plural(orderCount, "orden", "órdenes")}
            </p>
          </div>
        </div>
        <div className="space-y-1.5 rounded-xl bg-white/[0.06] p-2.5 text-[10px]">
          <p>{customer.address}</p>
          <p className="text-white/65">Equipos: {customer.equipment.join(", ")}</p>
        </div>
      </div>
    </MockFrame>
  );
}

export function WhatsAppMockup({ className }: { className?: string }) {
  const appointment = demoOperation.appointments.find(
    (item) => item.orderId === demoRefs.activeOrderId,
  );
  const arrival = appointment
    ? `entre las ${appointment.startTime} y las ${appointment.endTime}`
    : "en el horario acordado";

  return (
    <MockFrame title="Mensaje de ejemplo" className={className}>
      <div className="space-y-2 p-4 text-[11px]">
        <p className="w-4/5 rounded-xl rounded-bl-sm bg-white/[0.08] px-3 py-2">
          Tu técnico llega {arrival}.
        </p>
        <p className="ml-auto w-3/5 rounded-xl rounded-br-sm bg-teal/35 px-3 py-2">
          Confirmado, gracias.
        </p>
      </div>
    </MockFrame>
  );
}

export function QuoteStatusMockup({ className }: { className?: string }) {
  const quote = getQuote(demoRefs.pendingQuoteId);

  return (
    <MockFrame title="Link público" className={className}>
      <div className="space-y-2 p-4 text-[11px]">
        <p className="font-semibold">
          Presupuesto {quote.id} · {formatArs(quote.total)}
        </p>
        <p className="text-white/70">Sin cuenta: se abre desde el link.</p>
        <span className="inline-block rounded-lg bg-teal px-3 py-1.5 text-[11px] font-semibold text-white">
          Ver y aprobar
        </span>
      </div>
    </MockFrame>
  );
}
