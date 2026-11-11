"use client";

import { Loader2, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { brand } from "@/lib/brand";
import { useAuth } from "@/lib/auth";

/** Shell móvil para técnicos: sin navegación lateral ni módulos financieros. */
export function TechShell({ children }: { children: ReactNode }) {
  const { user, tenants, activeTenantId, setActiveTenant, logout, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center gap-3 text-sm text-slate">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        Cargando sesión...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const activeTenant = tenants.find((tenant) => tenant.id === activeTenantId);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <div className="min-h-dvh bg-paper">
      <header className="sticky top-0 z-20 border-b border-mist bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink text-sm font-bold text-white"
            >
              D
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{brand.name}</p>
              <p className="truncate text-xs text-slate">{user.full_name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-mist bg-white px-3 text-sm font-medium text-ink"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Salir
          </button>
        </div>
        {tenants.length > 1 ? (
          <div className="mx-auto max-w-xl px-4 pb-3">
            <label htmlFor="tech-tenant" className="sr-only">
              Empresa activa
            </label>
            <select
              id="tech-tenant"
              value={activeTenantId ?? ""}
              onChange={(event) => setActiveTenant(event.target.value)}
              className="min-h-11 w-full rounded-xl border border-mist bg-white px-3 text-sm text-ink"
            >
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          activeTenant && (
            <p className="mx-auto max-w-xl truncate px-4 pb-3 text-xs text-slate">
              {activeTenant.name}
            </p>
          )
        )}
      </header>

      <main className="mx-auto max-w-xl px-4 py-4 pb-12">{children}</main>
    </div>
  );
}
