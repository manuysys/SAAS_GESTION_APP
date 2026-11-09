"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { useRef, useState, type KeyboardEvent } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  DETERMINISTIC_NOTICE,
  DETERMINISTIC_PROVIDER,
  NOT_CONFIGURED_NOTICE,
  capabilityToPrompt,
  isAiBlocked,
  suggestedPrompts,
} from "@/lib/ai";
import { api, errorMessage, type AIStatus } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import { usagePercent } from "@/lib/usage";

const MANAGE_ROLES = ["owner", "admin", "dispatcher"];

const assistantFormSchema = z.object({
  message: z.string().trim().min(1, "Escribí una pregunta").max(2000, "Máximo 2000 caracteres"),
});

type AssistantFormValues = z.infer<typeof assistantFormSchema>;

type ChatMessage =
  | { id: string; role: "user"; content: string }
  | {
      id: string;
      role: "assistant";
      content: string;
      inputTokens: number;
      outputTokens: number;
      usedTokens: number;
      estimatedCost: string;
    };

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900 aria-[invalid=true]:border-red-600";

export default function AssistantPage() {
  const { activeTenantId, tenants } = useAuth();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const activeTenant = tenants.find((tenant) => tenant.id === activeTenantId);
  const canUse = MANAGE_ROLES.includes(activeTenant?.role ?? "");

  const form = useForm<AssistantFormValues>({
    resolver: zodResolver(assistantFormSchema),
    defaultValues: { message: "" },
  });
  const messageField = form.register("message");

  const statusQuery = useQuery({
    queryKey: ["ai-status", activeTenantId],
    queryFn: () => api.ai.status(activeTenantId ?? ""),
    enabled: Boolean(activeTenantId) && canUse,
  });

  const chatMutation = useMutation({
    mutationFn: (message: string) => api.ai.chat(activeTenantId ?? "", message),
    onSuccess: (response) => {
      setMessages((previous) => [
        ...previous,
        {
          id: `assistant-${previous.length}`,
          role: "assistant",
          content: response.reply,
          inputTokens: response.input_tokens,
          outputTokens: response.output_tokens,
          usedTokens: response.used_tokens,
          estimatedCost: response.estimated_cost,
        },
      ]);
      void queryClient.invalidateQueries({ queryKey: ["ai-status", activeTenantId] });
    },
  });

  if (!activeTenantId) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-sm text-zinc-600">
        No hay una empresa activa. Cerrá sesión y volvé a ingresar.
      </div>
    );
  }

  if (!canUse) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-sm text-zinc-600">
        El asistente está disponible para owner, administración y despacho.
      </div>
    );
  }

  const status = statusQuery.data;
  const blocked = status ? isAiBlocked(status) : true;
  const sending = chatMutation.isPending;

  function submit(values: AssistantFormValues) {
    if (blocked || sending || !status) return;
    setMessages((previous) => [
      ...previous,
      { id: `user-${previous.length}`, role: "user", content: values.message },
    ]);
    form.reset({ message: "" });
    chatMutation.mutate(values.message);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void form.handleSubmit(submit)();
    }
  }

  function applyPrompt(prompt: string) {
    form.setValue("message", prompt, { shouldDirty: true, shouldValidate: true });
    textareaRef.current?.focus();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Asistente</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Consultas sobre los datos de {activeTenant?.name ?? "tu empresa"}.
        </p>
      </div>

      {statusQuery.isLoading && (
        <p className="text-sm text-zinc-500">Cargando estado del asistente...</p>
      )}

      {statusQuery.isError && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage(statusQuery.error, "No se pudo cargar el estado del asistente.")}
        </p>
      )}

      {status && <StatusPanel status={status} />}

      {status && status.provider === DETERMINISTIC_PROVIDER && (
        <p className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          {DETERMINISTIC_NOTICE}
        </p>
      )}

      {status && blocked && (
        <p
          role="status"
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          {NOT_CONFIGURED_NOTICE}
        </p>
      )}

      <section aria-labelledby="chat-title" className="rounded-2xl border border-zinc-200 bg-white">
        <h2 id="chat-title" className="border-b border-zinc-200 px-4 py-3 text-sm font-semibold">
          Conversación
        </h2>

        <div
          role="log"
          aria-live="polite"
          aria-label="Mensajes del asistente"
          className="flex max-h-[55vh] min-h-[220px] flex-col gap-3 overflow-y-auto p-4"
        >
          {messages.length === 0 ? (
            <p className="m-auto text-center text-sm text-zinc-500">
              Elegí una pregunta rápida o escribí tu consulta.
            </p>
          ) : (
            messages.map((message) => <MessageBubble key={message.id} message={message} />)
          )}
          {sending && <p className="text-sm text-zinc-500">Consultando datos de la empresa...</p>}
        </div>

        {chatMutation.error && (
          <p role="alert" className="mx-4 mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage(chatMutation.error, "No se pudo obtener la respuesta.")}
          </p>
        )}

        {status && status.capabilities.length > 0 && (
          <div className="border-t border-zinc-200 px-4 py-3">
            <p className="mb-2 text-xs font-medium text-zinc-500">Preguntas rápidas</p>
            <ul className="flex flex-wrap gap-2">
              {suggestedPrompts(status.capabilities).map((capability) => (
                <li key={capability}>
                  <button
                    type="button"
                    onClick={() => applyPrompt(capabilityToPrompt(capability))}
                    disabled={blocked}
                    className="rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
                  >
                    {capabilityToPrompt(capability)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <form
          onSubmit={form.handleSubmit(submit)}
          noValidate
          aria-describedby="composer-help"
          className="flex flex-col gap-2 border-t border-zinc-200 p-4 sm:flex-row sm:items-end"
        >
          <div className="min-w-0 flex-1">
            <label htmlFor="assistant-message" className="sr-only">
              Mensaje para el asistente
            </label>
            <textarea
              id="assistant-message"
              rows={2}
              disabled={blocked || !status}
              placeholder="Escribí tu consulta..."
              aria-invalid={Boolean(form.formState.errors.message)}
              aria-describedby={
                form.formState.errors.message ? "assistant-message-error" : undefined
              }
              onKeyDown={handleKeyDown}
              className={cn(inputClass, "resize-y disabled:bg-zinc-100")}
              name={messageField.name}
              onChange={messageField.onChange}
              onBlur={messageField.onBlur}
              ref={(element) => {
                messageField.ref(element);
                textareaRef.current = element;
              }}
            />
            {form.formState.errors.message && (
              <p id="assistant-message-error" className="mt-1 text-xs text-red-600">
                {form.formState.errors.message.message}
              </p>
            )}
            <p id="composer-help" className="mt-1 text-xs text-zinc-500">
              Enter envía · Shift+Enter agrega una línea.
            </p>
          </div>
          <button
            type="submit"
            disabled={blocked || !status || sending}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-60"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            Enviar
          </button>
        </form>
      </section>

      <p className="text-xs text-zinc-500">
        Las cifras salen de los datos registrados en la empresa. Verificá montos y fechas antes de
        tomar decisiones con respuestas del asistente.
      </p>
    </div>
  );
}

function StatusPanel({ status }: { status: AIStatus }) {
  const percent = usagePercent(status.tokens_used, status.monthly_token_limit);
  return (
    <section
      aria-labelledby="ai-status-title"
      className="rounded-2xl border border-zinc-200 bg-white p-5"
    >
      <h2 id="ai-status-title" className="text-sm font-semibold">
        Estado del proveedor
      </h2>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs text-zinc-500">Proveedor</dt>
          <dd className="font-medium">{status.provider}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Modelo</dt>
          <dd className="font-medium break-all">{status.model || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Disponible</dt>
          <dd className="font-medium">
            {status.available ? "Sí" : "No"}
            {status.configured ? "" : " (sin configurar)"}
          </dd>
        </div>
      </dl>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-2 text-xs text-zinc-600">
          <span>Tokens usados este mes</span>
          <span>
            {formatNumber(status.tokens_used, 0)} de {formatNumber(status.monthly_token_limit, 0)}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Tokens de IA usados este mes"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent ?? 0}
          aria-valuetext={percent === null ? "Sin límite" : `${percent}% usado`}
          className="mt-1 h-2 w-full overflow-hidden rounded-full bg-zinc-200"
        >
          <div
            className={cn(
              "h-full rounded-full",
              (percent ?? 0) >= 90 ? "bg-red-600" : "bg-zinc-900",
            )}
            style={{ width: `${percent ?? 0}%` }}
          />
        </div>
      </div>
    </section>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-zinc-900 px-4 py-2 text-sm whitespace-pre-wrap text-white">
        <p className="sr-only">Vos:</p>
        {message.content}
      </div>
    );
  }

  return (
    <div className="mr-auto max-w-[85%] rounded-2xl rounded-bl-sm border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm text-zinc-900">
      <p className="sr-only">Asistente:</p>
      <p className="whitespace-pre-wrap">{message.content}</p>
      <p className="mt-2 text-xs text-zinc-500">
        Tokens: {formatNumber(message.inputTokens, 0)} entrada +{" "}
        {formatNumber(message.outputTokens, 0)} salida · Costo estimado:{" "}
        {formatCurrency(message.estimatedCost)}
      </p>
    </div>
  );
}
