"use client";

import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import Link from "next/link";

import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const REFRESH_INTERVAL_MS = 60_000;

/** Campana del header: muestra la cantidad de notificaciones sin leer del tenant activo. */
export function NotificationsBell() {
  const { activeTenantId } = useAuth();

  const query = useQuery({
    queryKey: ["notifications", activeTenantId],
    queryFn: () => api.notifications.list(activeTenantId ?? ""),
    enabled: Boolean(activeTenantId),
    refetchInterval: REFRESH_INTERVAL_MS,
  });

  if (!activeTenantId) {
    return null;
  }

  const unread = query.data?.unread ?? 0;
  const label =
    unread > 0
      ? `Notificaciones: ${unread} sin leer`
      : "Notificaciones: sin notificaciones sin leer";

  return (
    <Link
      href="/notifications"
      aria-label={label}
      className="relative rounded-lg border border-zinc-200 p-2 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
    >
      <Bell className="h-4 w-4" aria-hidden="true" />
      {unread > 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] leading-none font-semibold text-white"
        >
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
