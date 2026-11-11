import * as SecureStore from "expo-secure-store";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Platform } from "react-native";

import { api, setTechTokens, setTechTokensRefreshedHandler } from "@/src/lib/api";
import { registerForPush } from "@/src/lib/push";
import type { PortalSession, TechSession } from "@/src/lib/types";

const TECH_KEY = "dovexo.tech.session";
const CUSTOMER_KEY = "dovexo.customer.session";

async function readStorage(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return globalThis.localStorage?.getItem(key) ?? null;
  }
  return SecureStore.getItemAsync(key);
}

async function writeStorage(key: string, value: string | null) {
  if (Platform.OS === "web") {
    if (value === null) globalThis.localStorage?.removeItem(key);
    else globalThis.localStorage?.setItem(key, value);
    return;
  }
  if (value === null) await SecureStore.deleteItemAsync(key);
  else await SecureStore.setItemAsync(key, value);
}

type AuthContextValue = {
  loading: boolean;
  techSession: TechSession | null;
  customerSession: PortalSession | null;
  techLogin: (email: string, password: string) => Promise<void>;
  techLogout: () => Promise<void>;
  customerLogin: (session: PortalSession) => Promise<void>;
  customerLogout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [techSession, setTechSession] = useState<TechSession | null>(null);
  const [customerSession, setCustomerSession] = useState<PortalSession | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [techRaw, customerRaw] = await Promise.all([
          readStorage(TECH_KEY),
          readStorage(CUSTOMER_KEY),
        ]);
        if (!mounted) return;
        if (techRaw) {
          const session = JSON.parse(techRaw) as TechSession;
          setTechSession(session);
          setTechTokens(session);
        }
        if (customerRaw) {
          setCustomerSession(JSON.parse(customerRaw) as PortalSession);
        }
      } catch {
        // Sesión corrupta: se ignora y se vuelve a loguear.
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setTechTokensRefreshedHandler((tokens) => {
      setTechSession((current) => {
        if (!current) return current;
        const next = { ...current, ...tokens };
        void writeStorage(TECH_KEY, JSON.stringify(next));
        return next;
      });
    });
    return () => setTechTokensRefreshedHandler(null);
  }, []);

  const techLogin = useCallback(async (email: string, password: string) => {
    const session = await api.techLogin(email, password);
    setTechSession(session);
    setTechTokens(session);
    await writeStorage(TECH_KEY, JSON.stringify(session));
    void registerForPush(session.tenantId);
  }, []);

  const techLogout = useCallback(async () => {
    if (techSession) {
      await api.techLogout(techSession.refreshToken);
    }
    setTechSession(null);
    setTechTokens(null);
    await writeStorage(TECH_KEY, null);
  }, [techSession]);

  const customerLogin = useCallback(async (session: PortalSession) => {
    setCustomerSession(session);
    await writeStorage(CUSTOMER_KEY, JSON.stringify(session));
  }, []);

  const customerLogout = useCallback(async () => {
    setCustomerSession(null);
    await writeStorage(CUSTOMER_KEY, null);
  }, []);

  const value = useMemo(
    () => ({
      loading,
      techSession,
      customerSession,
      techLogin,
      techLogout,
      customerLogin,
      customerLogout,
    }),
    [loading, techSession, customerSession, techLogin, techLogout, customerLogin, customerLogout],
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
