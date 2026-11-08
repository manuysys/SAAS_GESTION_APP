"use client";

import { useEffect } from "react";

/**
 * Registra el service worker de la PWA. Solo en producción: en desarrollo el
 * caché del SW interferiría con el HMR de Next.js.
 */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // El sitio funciona sin SW; no se muestra error al usuario.
    });
  }, []);

  return null;
}
