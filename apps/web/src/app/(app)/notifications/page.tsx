"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";

import { api, errorMessage, type Notification } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn, formatDate } from "@/lib/utils";

export default function NotificationsPage() {
  const { activeTenantId, tenants } = useAuth();
  const queryClient = useQueryClient();
  const activeTenant = tenants.find((tenant) => tenant.id === activeTenantId);

  const notificationsQuery = useQuery({
    queryKey: ["notifications", activeTenantId],
    queryFn: () => api.notifications.list(activeTenantId ?? ""),
    enabled: Boolean(activeTenantId),
  });

  function invalidateNotifications() {
    return queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }

  const markReadMutation = useMutation({
    mutationFn: (notificationId: string) =>
      api.notifications.markRead(activeTenantId ?? "", notificationId),
    onSuccess: () => invalidateNotifications(),
  });

  const markAllMutation = useMutation({
    mutationFn: () => api.notifications.markAllRead(activeTenantId ?? ""),
    onSuccess: () => invalidateNotifications(),
  });

  if (!activeTenantId) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-sm text-zinc-600">
        No hay una empresa activa. Cerrá sesión y volvé a ingresar.
      </div>
    );
  }

  const items = notificationsQuery.data?.items ?? [];
  const total = notificationsQuery.data?.total ?? 0;
  const unread = notificationsQuery.data?.unread ?? 0;
  const actionError = markReadMutation.error ?? markAllMutation.error;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notificaciones</h1>
          <p className="mt-1 text-sm text-zinc-600">
            {unread} sin leer de {total} en {activeTenant?.name ?? "tu empresa"}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => markAllMutation.mutate()}
          disabled={unread === 0 || markAllMutation.isPending}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <CheckCheck className="h-4 w-4" aria-hidden="true" />
          {markAllMutation.isPending ? "Marcando..." : "Marcar todas como leídas"}
        </button>
      </div>

      {actionError && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage(actionError, "No se pudo actualizar la notificación")}
        </p>
      )}

      <section
        aria-label="Listado de notificaciones"
        className="rounded-2xl border border-zinc-200 bg-white"
      >
        {notificationsQuery.isLoading ? (
          <p className="p-6 text-sm text-zinc-500">Cargando notificaciones...</p>
        ) : notificationsQuery.isError ? (
          <div className="p-6">
            <p className="text-sm text-red-600">
              {errorMessage(notificationsQuery.error, "No se pudieron cargar las notificaciones.")}
            </p>
            <button
              type="button"
              onClick={() => void notificationsQuery.refetch()}
              className="mt-3 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Reintentar
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="mx-auto h-8 w-8 text-zinc-300" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-zinc-800">No tenés notificaciones</p>
            <p className="mt-1 text-sm text-zinc-500">
              Cuando una automatización se dispare, aparecerá acá.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {items.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                pending={
                  markReadMutation.isPending && markReadMutation.variables === notification.id
                }
                onMarkRead={() => markReadMutation.mutate(notification.id)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

type NotificationItemProps = {
  notification: Notification;
  pending: boolean;
  onMarkRead: () => void;
};

function NotificationItem({ notification, pending, onMarkRead }: NotificationItemProps) {
  const isUnread = notification.read_at === null;

  return (
    <li
      className={cn(
        "flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between",
        isUnread && "border-l-4 border-l-zinc-900 bg-zinc-50",
      )}
    >
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          {isUnread && (
            <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-xs font-semibold text-white">
              Nueva
            </span>
          )}
          <span className="rounded-full border border-zinc-300 px-2 py-0.5 text-xs text-zinc-600">
            {notification.type}
          </span>
        </div>
        <p className={cn("text-sm text-zinc-900", isUnread ? "font-semibold" : "font-medium")}>
          {notification.title}
        </p>
        <p className="text-sm whitespace-pre-line text-zinc-700">{notification.message}</p>
        <p className="text-xs text-zinc-500">
          <time dateTime={notification.created_at}>{formatDate(notification.created_at)}</time>
          {!isUnread && notification.read_at && (
            <span> · Leída el {formatDate(notification.read_at)}</span>
          )}
        </p>
      </div>

      {isUnread && (
        <button
          type="button"
          onClick={onMarkRead}
          disabled={pending}
          aria-label={`Marcar como leída: ${notification.title}`}
          className="shrink-0 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-100 disabled:opacity-60"
        >
          {pending ? "Marcando..." : "Marcar como leída"}
        </button>
      )}
    </li>
  );
}
