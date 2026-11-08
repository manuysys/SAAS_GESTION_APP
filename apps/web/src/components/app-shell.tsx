"use client";

import {
  CalendarDays,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Loader2,
  LogOut,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/dashboard", label: "Panel", icon: LayoutDashboard },
  { href: "/customers", label: "Clientes", icon: Users },
  { href: "/orders", label: "Órdenes", icon: ClipboardList, disabled: true },
  { href: "/quotes", label: "Presupuestos", icon: FileText, disabled: true },
  { href: "/agenda", label: "Agenda", icon: CalendarDays, disabled: true },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, tenants, activeTenantId, setActiveTenant, logout, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-3 text-sm text-zinc-600">
        <Loader2 className="h-5 w-5 animate-spin" />
        Cargando sesión...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const activeTenant = tenants.find((tenant) => tenant.id === activeTenantId);

  return (
    <div className="min-h-screen bg-zinc-50">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-zinc-200 bg-white md:flex">
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-sm font-bold text-white">
            SG
          </div>
          <div>
            <p className="text-sm leading-tight font-semibold">SaaS Gestión</p>
            <p className="text-xs text-zinc-500">Panel de empresa</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {navigation.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            if (item.disabled) {
              return (
                <span
                  key={item.href}
                  className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-400"
                  title="Próximamente"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                  <span className="ml-auto rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
                    Pronto
                  </span>
                </span>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                  active
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-zinc-200 p-4">
          <p className="truncate text-sm font-medium">{user.full_name}</p>
          <p className="truncate text-xs text-zinc-500">{user.email}</p>
          <button
            type="button"
            onClick={() => void logout().then(() => router.replace("/login"))}
            className="mt-3 flex w-full items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="md:pl-64">
        <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 backdrop-blur">
          <div className="flex items-center justify-between gap-4 px-4 py-3 md:px-8">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{activeTenant?.name ?? "Mi empresa"}</p>
              <p className="text-xs text-zinc-500">Rol: {activeTenant?.role ?? "—"}</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                aria-label="Empresa activa"
                value={activeTenantId ?? ""}
                onChange={(event) => setActiveTenant(event.target.value)}
                className="max-w-[220px] rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
              >
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void logout().then(() => router.replace("/login"))}
                className="rounded-lg border border-zinc-200 p-2 text-zinc-600 hover:bg-zinc-50 md:hidden"
                aria-label="Cerrar sesión"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-4 pb-2 md:hidden">
            {navigation.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              if (item.disabled) return null;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium",
                    active ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="mx-auto max-w-6xl p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
