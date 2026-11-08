"use client";

import { Loader2, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

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
      <div className="flex min-h-dvh items-center justify-center gap-3 text-sm text-zinc-600">
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
    <div className="min-h-dvh bg-zinc-50">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs text-zinc-500">Técnico</p>
            <p className="truncate text-base font-semibold">{user.full_name}</p>
          </div>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-zinc-300 px-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Salir
          </button>
        </div>
        {tenants.length > 1 && (
          <div className="mx-auto max-w-xl px-4 pb-3">
            <label htmlFor="tech-tenant" className="sr-only">
              Empresa activa
            </label>
            <select
              id="tech-tenant"
              value={activeTenantId ?? ""}
              onChange={(event) => setActiveTenant(event.target.value)}
              className="min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm"
            >
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {tenants.length <= 1 && activeTenant && (
          <p className="mx-auto max-w-xl truncate px-4 pb-3 text-xs text-zinc-500">
            {activeTenant.name}
          </p>
        )}
      </header>

      <main className="mx-auto max-w-xl px-4 py-4 pb-10">{children}</main>
    </div>
  );
}
