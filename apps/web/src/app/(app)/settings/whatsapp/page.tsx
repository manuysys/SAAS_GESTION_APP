"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";

import { ApiError, api, errorMessage, type WhatsAppConfig, type WhatsAppMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  buildWhatsAppConfigInput,
  whatsappConfigFormSchema,
  whatsappSendSchema,
  type WhatsAppConfigFormValues,
  type WhatsAppSendFormValues,
} from "@/lib/whatsapp";
import { cn, formatDate } from "@/lib/utils";

const ADMIN_ROLES = ["owner", "admin"];

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900 aria-[invalid=true]:border-red-600";

const DIRECTION_LABELS: Record<string, string> = {
  inbound: "Entrante",
  outbound: "Saliente",
};

export default function WhatsAppSettingsPage() {
  const { activeTenantId, tenants } = useAuth();
  const activeTenant = tenants.find((tenant) => tenant.id === activeTenantId);
  const canManage = ADMIN_ROLES.includes(activeTenant?.role ?? "");

  const configQuery = useQuery({
    queryKey: ["whatsapp-config", activeTenantId],
    queryFn: () => api.whatsapp.getConfig(activeTenantId ?? ""),
    enabled: Boolean(activeTenantId) && canManage,
  });

  const messagesQuery = useQuery({
    queryKey: ["whatsapp-messages", activeTenantId],
    queryFn: () => api.whatsapp.messages(activeTenantId ?? ""),
    enabled: Boolean(activeTenantId) && canManage,
  });

  if (!activeTenantId) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-sm text-zinc-600">
        No hay una empresa activa. Cerrá sesión y volvé a ingresar.
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-sm text-zinc-600">
        Solo los administradores de la empresa pueden configurar WhatsApp.
      </div>
    );
  }

  const config = configQuery.data;
  const messages = messagesQuery.data?.items ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">WhatsApp</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Configuración y mensajes de {activeTenant?.name ?? "tu empresa"}.
        </p>
      </div>

      <p
        role="note"
        className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
      >
        Requiere WhatsApp Business Cloud API oficial. Sin credenciales reales no se puede enviar.
      </p>

      {configQuery.isLoading ? (
        <p className="text-sm text-zinc-500">Cargando configuración...</p>
      ) : configQuery.isError ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage(configQuery.error, "No se pudo cargar la configuración de WhatsApp.")}
        </p>
      ) : config ? (
        <>
          <ConfigSummary config={config} />
          <section
            aria-labelledby="config-title"
            className="rounded-2xl border border-zinc-200 bg-white p-5"
          >
            <h2 id="config-title" className="text-sm font-semibold">
              Configuración
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Los secretos no se muestran. Dejá un campo vacío para conservar el valor guardado.
            </p>
            <WhatsAppConfigForm key={configKey(config)} tenantId={activeTenantId} config={config} />
          </section>
        </>
      ) : null}

      <WhatsAppSendForm tenantId={activeTenantId} />

      <section
        aria-labelledby="messages-title"
        className="rounded-2xl border border-zinc-200 bg-white"
      >
        <div className="border-b border-zinc-200 px-4 py-3">
          <h2 id="messages-title" className="text-sm font-semibold">
            Mensajes
          </h2>
          <p className="text-xs text-zinc-500">Últimos mensajes registrados de la empresa.</p>
        </div>
        {messagesQuery.isLoading ? (
          <p className="p-6 text-sm text-zinc-500">Cargando mensajes...</p>
        ) : messagesQuery.isError ? (
          <p role="alert" className="p-6 text-sm text-red-600">
            {errorMessage(messagesQuery.error, "No se pudieron cargar los mensajes.")}
          </p>
        ) : messages.length === 0 ? (
          <p className="p-6 text-sm text-zinc-500">Todavía no hay mensajes registrados.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {messages.map((message) => (
              <MessageItem key={message.id} message={message} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function configKey(config: WhatsAppConfig): string {
  return [
    config.configured,
    config.active,
    config.phone_number_id ?? "",
    config.business_account_id ?? "",
    config.has_access_token,
    config.has_verify_token,
    config.has_app_secret,
  ].join("|");
}

function ConfigSummary({ config }: { config: WhatsAppConfig }) {
  const secrets: { label: string; loaded: boolean }[] = [
    { label: "Access token", loaded: config.has_access_token },
    { label: "Verify token", loaded: config.has_verify_token },
    { label: "App secret", loaded: config.has_app_secret },
  ];

  return (
    <section
      aria-labelledby="status-title"
      className="rounded-2xl border border-zinc-200 bg-white p-5"
    >
      <h2 id="status-title" className="text-sm font-semibold">
        Estado
      </h2>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge tone={config.configured ? "ok" : "neutral"}>
          {config.configured ? "Configurado" : "Sin configurar"}
        </Badge>
        <Badge tone={config.active ? "ok" : "neutral"}>
          {config.active ? "Activo" : "Inactivo"}
        </Badge>
      </div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-zinc-500">phone_number_id</dt>
          <dd className="font-mono break-all">{config.phone_number_id ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">business_account_id</dt>
          <dd className="font-mono break-all">{config.business_account_id ?? "—"}</dd>
        </div>
      </dl>
      <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-3" aria-label="Secretos cargados">
        {secrets.map((secret) => (
          <li
            key={secret.label}
            className="flex items-center justify-between gap-2 rounded-lg bg-zinc-50 px-3 py-2"
          >
            <span className="text-zinc-700">{secret.label}</span>
            <span className={secret.loaded ? "font-medium text-emerald-700" : "text-zinc-500"}>
              {secret.loaded ? "Cargado" : "No cargado"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Badge({ tone, children }: { tone: "ok" | "neutral"; children: string }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-medium",
        tone === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-700",
      )}
    >
      {children}
    </span>
  );
}

function WhatsAppConfigForm({ tenantId, config }: { tenantId: string; config: WhatsAppConfig }) {
  const queryClient = useQueryClient();
  const form = useForm<WhatsAppConfigFormValues>({
    resolver: zodResolver(whatsappConfigFormSchema),
    defaultValues: {
      phone_number_id: config.phone_number_id ?? "",
      business_account_id: config.business_account_id ?? "",
      access_token: "",
      verify_token: "",
      app_secret: "",
      active: config.active,
    },
  });

  const mutation = useMutation({
    mutationFn: (values: WhatsAppConfigFormValues) =>
      api.whatsapp.updateConfig(tenantId, buildWhatsAppConfigInput(values)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["whatsapp-config", tenantId] });
    },
  });

  function submit(values: WhatsAppConfigFormValues) {
    mutation.mutate(values, {
      onSuccess: () => {
        form.reset({ ...values, access_token: "", verify_token: "", app_secret: "" });
      },
    });
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} noValidate className="mt-4 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="wa-phone-number-id" className="mb-1 block text-sm font-medium">
            phone_number_id *
          </label>
          <input
            id="wa-phone-number-id"
            inputMode="numeric"
            autoComplete="off"
            aria-invalid={Boolean(form.formState.errors.phone_number_id)}
            aria-describedby={
              form.formState.errors.phone_number_id ? "wa-phone-number-id-error" : undefined
            }
            className={inputClass}
            {...form.register("phone_number_id")}
          />
          <FieldError
            id="wa-phone-number-id-error"
            message={form.formState.errors.phone_number_id?.message}
          />
        </div>

        <div>
          <label htmlFor="wa-business-account-id" className="mb-1 block text-sm font-medium">
            business_account_id *
          </label>
          <input
            id="wa-business-account-id"
            inputMode="numeric"
            autoComplete="off"
            aria-invalid={Boolean(form.formState.errors.business_account_id)}
            aria-describedby={
              form.formState.errors.business_account_id ? "wa-business-account-id-error" : undefined
            }
            className={inputClass}
            {...form.register("business_account_id")}
          />
          <FieldError
            id="wa-business-account-id-error"
            message={form.formState.errors.business_account_id?.message}
          />
        </div>

        <SecretField
          id="wa-access-token"
          label="Access token"
          loaded={config.has_access_token}
          error={form.formState.errors.access_token?.message}
          registration={form.register("access_token")}
        />
        <SecretField
          id="wa-verify-token"
          label="Verify token"
          loaded={config.has_verify_token}
          error={form.formState.errors.verify_token?.message}
          registration={form.register("verify_token")}
        />
        <SecretField
          id="wa-app-secret"
          label="App secret"
          loaded={config.has_app_secret}
          error={form.formState.errors.app_secret?.message}
          registration={form.register("app_secret")}
        />

        <div className="flex items-center gap-2 self-end">
          <input
            id="wa-active"
            type="checkbox"
            className="h-4 w-4 rounded border-zinc-300"
            {...form.register("active")}
          />
          <label htmlFor="wa-active" className="text-sm font-medium">
            Integración activa
          </label>
        </div>
      </div>

      {mutation.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage(mutation.error, "No se pudo guardar la configuración.")}
        </p>
      )}
      {mutation.isSuccess && (
        <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Configuración guardada.
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-60"
        >
          {mutation.isPending ? "Guardando..." : "Guardar configuración"}
        </button>
      </div>
    </form>
  );
}

function SecretField({
  id,
  label,
  loaded,
  error,
  registration,
}: {
  id: string;
  label: string;
  loaded: boolean;
  error: string | undefined;
  registration: UseFormRegisterReturn<"access_token" | "verify_token" | "app_secret">;
}) {
  const errorId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}{" "}
        <span className="text-xs font-normal text-zinc-500">
          ({loaded ? "cargado: dejar vacío para conservar" : "no cargado"})
        </span>
      </label>
      <input
        id={id}
        type="password"
        autoComplete="new-password"
        spellCheck={false}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        placeholder={loaded ? "••••••••" : ""}
        className={inputClass}
        {...registration}
      />
      <FieldError id={errorId} message={error} />
    </div>
  );
}

function WhatsAppSendForm({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient();
  const form = useForm<WhatsAppSendFormValues>({
    resolver: zodResolver(whatsappSendSchema),
    defaultValues: { to_phone: "", body: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: WhatsAppSendFormValues) =>
      api.whatsapp.send(tenantId, values.to_phone, values.body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["whatsapp-messages", tenantId] });
    },
  });

  function submit(values: WhatsAppSendFormValues) {
    mutation.mutate(values, {
      onSuccess: () => {
        form.setValue("body", "");
      },
    });
  }

  return (
    <section
      aria-labelledby="send-title"
      className="rounded-2xl border border-zinc-200 bg-white p-5"
    >
      <h2 id="send-title" className="text-sm font-semibold">
        Enviar mensaje de prueba
      </h2>
      <p className="mt-1 text-xs text-zinc-500">
        Si la integración no está configurada, el sistema no simula el envío y muestra el motivo.
      </p>

      <form
        onSubmit={form.handleSubmit(submit)}
        noValidate
        className="mt-4 grid gap-4 sm:grid-cols-2"
      >
        <div>
          <label htmlFor="wa-to-phone" className="mb-1 block text-sm font-medium">
            Teléfono destino *
          </label>
          <input
            id="wa-to-phone"
            type="tel"
            autoComplete="off"
            placeholder="+5491155550000"
            aria-invalid={Boolean(form.formState.errors.to_phone)}
            aria-describedby={form.formState.errors.to_phone ? "wa-to-phone-error" : undefined}
            className={inputClass}
            {...form.register("to_phone")}
          />
          <FieldError id="wa-to-phone-error" message={form.formState.errors.to_phone?.message} />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="wa-body" className="mb-1 block text-sm font-medium">
            Mensaje *
          </label>
          <textarea
            id="wa-body"
            rows={3}
            aria-invalid={Boolean(form.formState.errors.body)}
            aria-describedby={form.formState.errors.body ? "wa-body-error" : undefined}
            className={inputClass}
            {...form.register("body")}
          />
          <FieldError id="wa-body-error" message={form.formState.errors.body?.message} />
        </div>

        {mutation.error && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2"
          >
            {sendErrorMessage(mutation.error)}
          </p>
        )}
        {mutation.isSuccess && (
          <p
            role="status"
            className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 sm:col-span-2"
          >
            Mensaje registrado con estado “{mutation.data.status}”.
          </p>
        )}

        <div className="flex justify-end sm:col-span-2">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-60"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            {mutation.isPending ? "Enviando..." : "Enviar"}
          </button>
        </div>
      </form>
    </section>
  );
}

/** 503 = integración no configurada: se muestra el detalle real del backend, sin simular el envío. */
function sendErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 503) {
    return `WhatsApp no configurado: ${error.detail}`;
  }
  return errorMessage(error, "No se pudo enviar el mensaje.");
}

function MessageItem({ message }: { message: WhatsAppMessage }) {
  return (
    <li className="flex flex-col gap-2 px-4 py-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
        <span
          className={cn(
            "rounded-full px-2 py-0.5 font-medium",
            message.direction === "inbound"
              ? "bg-sky-50 text-sky-800"
              : "bg-zinc-100 text-zinc-800",
          )}
        >
          {DIRECTION_LABELS[message.direction] ?? message.direction}
        </span>
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-700">{message.status}</span>
        <span>{message.message_type}</span>
        <time dateTime={message.created_at} className="ml-auto">
          {formatDate(message.created_at)}
        </time>
      </div>
      <p className="font-mono text-xs break-all text-zinc-600">
        {message.from_phone} → {message.to_phone}
      </p>
      <p className="text-sm whitespace-pre-wrap text-zinc-900">{message.body ?? "(sin texto)"}</p>
    </li>
  );
}

function FieldError({ id, message }: { id: string; message: string | undefined }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-xs text-red-600">
      {message}
    </p>
  );
}
