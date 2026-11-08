import Link from "next/link";
import { ArrowRight, CheckCircle2, ClipboardList, Users, Wrench } from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Clientes e historial",
    description: "Centralizá datos, direcciones, equipos y todas las interacciones.",
  },
  {
    icon: ClipboardList,
    title: "Solicitudes y órdenes",
    description: "Convertí una consulta en orden de trabajo sin volver a cargar datos.",
  },
  {
    icon: Wrench,
    title: "Técnicos y agenda",
    description: "Asigná visitas, detectá conflictos y seguí el trabajo desde el celular.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-sm font-bold text-white">
            SG
          </div>
          <span className="text-lg font-semibold tracking-tight">SaaS Gestión</span>
        </div>
        <nav className="flex items-center gap-3 text-sm">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 font-medium text-zinc-700 hover:bg-zinc-100"
          >
            Ingresar
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700"
          >
            Crear cuenta
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl gap-12 px-6 py-16 md:grid-cols-2 md:items-center md:py-24">
        <div>
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Hecho para empresas de servicios técnicos
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 md:text-5xl">
            Toda tu operación, desde la consulta hasta el cobro.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-600">
            Clientes, solicitudes, presupuestos, órdenes, visitas y pagos en un solo lugar. Menos
            planillas, menos WhatsApp disperso, más control.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-700"
            >
              Empezar ahora
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
            >
              Ya tengo cuenta
            </Link>
          </div>
          <p className="mt-4 text-xs text-zinc-500">Sin tarjeta. Entorno de demostración local.</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-semibold text-zinc-700">Panel operativo</span>
            <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800">
              En vivo
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-xs text-zinc-500">Clientes activos</p>
              <p className="mt-1 text-2xl font-semibold">128</p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-xs text-zinc-500">Órdenes del día</p>
              <p className="mt-1 text-2xl font-semibold">14</p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-xs text-zinc-500">Presupuestos sin aprobar</p>
              <p className="mt-1 text-2xl font-semibold">7</p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-xs text-zinc-500">Pendiente de cobro</p>
              <p className="mt-1 text-2xl font-semibold">$ 1.240.000</p>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-dashed border-zinc-300 p-4 text-xs text-zinc-500">
            Los datos de esta vista son ilustrativos. El panel real se alimenta de la API.
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-200 bg-zinc-50">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 py-16 md:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="rounded-2xl border border-zinc-200 bg-white p-6">
              <feature.icon className="h-6 w-6 text-zinc-900" />
              <h2 className="mt-4 text-lg font-semibold">{feature.title}</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-8 text-xs text-zinc-500 md:flex-row md:items-center md:justify-between">
        <span>© 2026 SaaS Gestión. Proyecto en desarrollo.</span>
        <span>Argentina · ARS · America/Argentina/Buenos_Aires</span>
      </footer>
    </main>
  );
}
