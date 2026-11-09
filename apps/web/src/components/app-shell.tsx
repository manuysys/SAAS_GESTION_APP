"use client";

import { LogOut, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { CommandPalette } from "@/components/command-palette";
import { NotificationsBell } from "@/components/notifications-bell";
import { brand } from "@/lib/brand";
import { isActivePath, visibleNavigation } from "@/lib/navigation";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, tenants, activeTenantId, setActiveTenant, logout, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="text-slate flex min-h-screen items-center justify-center gap-3 text-sm">
        <span className="border-teal h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" />
        Cargando sesión...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const activeTenant = tenants.find((tenant) => tenant.id === activeTenantId);
  const role = activeTenant?.role ?? "";
  const items = visibleNavigation(role, user.is_platform_admin);

  function signOut() {
    void logout().then(() => router.replace("/login"));
  }

  return (
    <div className="bg-paper min-h-screen">
      <aside className="bg-ink fixed inset-y-0 left-0 hidden w-64 flex-col text-white md:flex">
        <Link href="/dashboard" className="flex items-center gap-3 px-5 py-5">
          <span className="bg-teal flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white">
            A
          </span>
          <span>
            <span className="font-display block text-sm leading-tight font-semibold">
              {brand.name}
            </span>
            <span className="block text-xs text-white/55">Panel de empresa</span>
          </span>
        </Link>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2" aria-label="Navegación principal">
          {items.map((item) => {
            const active = isActivePath(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-white/12 text-white"
                    : "text-white/65 hover:bg-white/8 hover:text-white",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
                {active && <span className="bg-teal ml-auto h-1.5 w-1.5 rounded-full" />}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <p className="truncate text-sm font-medium">{user.full_name}</p>
          <p className="truncate text-xs text-white/50">{user.email}</p>
          <button
            type="button"
            onClick={signOut}
            className="mt-3 flex w-full items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-sm text-white/75 hover:bg-white/8 hover:text-white"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="bg-ink/50 absolute inset-0 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Cerrar menú"
          />
          <div className="bg-ink relative flex h-full w-72 max-w-[85vw] flex-col text-white shadow-2xl">
            <div className="flex items-center justify-between px-4 py-4">
              <span className="font-display text-sm font-semibold">{brand.name}</span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-2 text-white/70 hover:bg-white/10"
                aria-label="Cerrar menú"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2" aria-label="Navegación móvil">
              {items.map((item) => {
                const active = isActivePath(pathname, item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                      active ? "bg-white/12 text-white" : "text-white/65 hover:bg-white/8",
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-white/10 p-4">
              <p className="truncate text-sm font-medium">{user.full_name}</p>
              <p className="truncate text-xs text-white/50">{user.email}</p>
              <button
                type="button"
                onClick={signOut}
                className="mt-3 flex w-full items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-sm text-white/75"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="md:pl-64">
        <header className="border-mist bg-paper/85 sticky top-0 z-30 border-b backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-8">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="border-mist text-ink rounded-xl border bg-white p-2 md:hidden"
                aria-label="Abrir menú"
                aria-expanded={mobileOpen}
              >
                <Menu className="h-4 w-4" />
              </button>
              <div className="min-w-0">
                <p className="text-ink truncate text-sm font-semibold">
                  {activeTenant?.name ?? "Mi empresa"}
                </p>
                <p className="text-slate text-xs">
                  {role === "owner"
                    ? "Owner"
                    : role === "admin"
                      ? "Administrador"
                      : role === "dispatcher"
                        ? "Coordinador"
                        : role === "technician"
                          ? "Técnico"
                          : role === "viewer"
                            ? "Consulta"
                            : "—"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <CommandPalette items={items} />
              <NotificationsBell />
              <select
                aria-label="Empresa activa"
                value={activeTenantId ?? ""}
                onChange={(event) => setActiveTenant(event.target.value)}
                className="border-mist text-ink hidden max-w-[220px] rounded-xl border bg-white px-3 py-2 text-sm sm:block"
              >
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
