"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { api, refreshSession, setAccessToken, type Tenant, type User } from "@/lib/api";

type AuthContextValue = {
  user: User | null;
  tenants: Tenant[];
  activeTenantId: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: {
    email: string;
    password: string;
    full_name: string;
    company_name: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  setActiveTenant: (tenantId: string) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const ACTIVE_TENANT_KEY = "saas_gestion_active_tenant";
const SESSION_HINT_KEY = "saas_gestion_session_hint";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const applySession = useCallback((nextUser: User, nextTenants: Tenant[]) => {
    setUser(nextUser);
    setTenants(nextTenants);
    const stored = window.localStorage.getItem(ACTIVE_TENANT_KEY);
    const nextActive =
      nextTenants.find((tenant) => tenant.id === stored)?.id ?? nextTenants[0]?.id ?? null;
    setActiveTenantId(nextActive);
    if (nextActive) {
      window.localStorage.setItem(ACTIVE_TENANT_KEY, nextActive);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const hasSessionHint = window.localStorage.getItem(SESSION_HINT_KEY) === "1";
      if (!hasSessionHint) {
        setLoading(false);
        return;
      }

      try {
        const refresh = await refreshSession();
        if (cancelled) return;
        setAccessToken(refresh.access_token);
        const me = await api.auth.me();
        if (cancelled) return;
        applySession(me.user, me.tenants);
      } catch {
        setAccessToken(null);
        window.localStorage.removeItem(SESSION_HINT_KEY);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [applySession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await api.auth.login({ email, password });
      setAccessToken(response.access_token);
      window.localStorage.setItem(SESSION_HINT_KEY, "1");
      const me = await api.auth.me();
      applySession(me.user, me.tenants);
    },
    [applySession],
  );

  const register = useCallback(
    async (input: { email: string; password: string; full_name: string; company_name: string }) => {
      const response = await api.auth.register(input);
      setAccessToken(response.access_token);
      window.localStorage.setItem(SESSION_HINT_KEY, "1");
      const me = await api.auth.me();
      applySession(me.user, me.tenants);
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } catch {
      // La sesión local se limpia igual.
    }
    setAccessToken(null);
    setUser(null);
    setTenants([]);
    setActiveTenantId(null);
    window.localStorage.removeItem(ACTIVE_TENANT_KEY);
    window.localStorage.removeItem(SESSION_HINT_KEY);
  }, []);

  const setActiveTenant = useCallback((tenantId: string) => {
    setActiveTenantId(tenantId);
    window.localStorage.setItem(ACTIVE_TENANT_KEY, tenantId);
  }, []);

  const value = useMemo(
    () => ({
      user,
      tenants,
      activeTenantId,
      loading,
      login,
      register,
      logout,
      setActiveTenant,
    }),
    [user, tenants, activeTenantId, loading, login, register, logout, setActiveTenant],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return context;
}
