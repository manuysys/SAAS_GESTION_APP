"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { api, errorMessage, type AutomationExecutionStatus } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  ACTION_TYPE_LABELS,
  AUTOMATION_ACTION_TYPES,
  AUTOMATION_EVENT_TYPES,
  EVENT_TYPE_LABELS,
  EXECUTION_STATUS_LABELS,
  automationFormSchema,
  buildAutomationRuleInput,
  type AutomationFormValues,
} from "@/lib/automations";
import { cn, formatDate } from "@/lib/utils";

const MANAGE_ROLES = ["owner", "admin"];

const EXECUTION_STATUS_CLASSES: Record<AutomationExecutionStatus, string> = {
  pending: "bg-amber-50 text-amber-800",
  success: "bg-emerald-50 text-emerald-700",
  failed: "bg-red-50 text-red-700",
  skipped: "bg-zinc-100 text-zinc-700",
};

const EMPTY_VALUES: AutomationFormValues = {
  name: "",
  event_type: "quote_approved",
  action_type: "notify",
  conditions: "",
  action_config: "",
  user_id: "",
  active: true,
};

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900 aria-[invalid=true]:border-red-600";

export default function AutomationsPage() {
  const { activeTenantId, tenants } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const activeTenant = tenants.find((tenant) => tenant.id === activeTenantId);
  const canManage = MANAGE_ROLES.includes(activeTenant?.role ?? "");

  const form = useForm<AutomationFormValues>({
    resolver: zodResolver(automationFormSchema),
    defaultValues: EMPTY_VALUES,
  });
  const actionType = useWatch({ control: form.control, name: "action_type" });

  const rulesQuery = useQuery({
    queryKey: ["automations", activeTenantId],
    queryFn: () => api.automations.list(activeTenantId ?? ""),
    enabled: Boolean(activeTenantId) && canManage,
  });

  const executionsQuery = useQuery({
    queryKey: ["automation-executions", activeTenantId],
    queryFn: () => api.automations.executions(activeTenantId ?? "", 50),
    enabled: Boolean(activeTenantId) && canManage,
  });

  function invalidateAutomations() {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: ["automations"] }),
      queryClient.invalidateQueries({ queryKey: ["automation-executions"] }),
    ]);
  }

  const createMutation = useMutation({
    mutationFn: (values: AutomationFormValues) =>
      api.automations.create(activeTenantId ?? "", buildAutomationRuleInput(values)),
    onSuccess: () => {
      void invalidateAutomations();
      form.reset(EMPTY_VALUES);
      setShowForm(false);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (ruleId: string) => api.automations.toggle(activeTenantId ?? "", ruleId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["automations"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (ruleId: string) => api.automations.remove(activeTenantId ?? "", ruleId),
    onSuccess: () => void invalidateAutomations(),
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
        Solo los administradores de la empresa pueden gestionar automatizaciones.
      </div>
    );
  }

  const rules = rulesQuery.data ?? [];
  const executions = executionsQuery.data ?? [];
  const ruleNames = new Map(rules.map((rule) => [rule.id, rule.name]));
  const actionError = toggleMutation.error ?? deleteMutation.error;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Automatizaciones</h1>
          <p className="mt-1 text-sm text-zinc-600">
            {rules.length} regla{rules.length === 1 ? "" : "s"} en{" "}
            {activeTenant?.name ?? "tu empresa"}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowForm((value) => !value);
            createMutation.reset();
          }}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700"
        >
          {showForm ? (
            <X className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Plus className="h-4 w-4" aria-hidden="true" />
          )}
          {showForm ? "Cancelar" : "Nueva regla"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}
          noValidate
          aria-labelledby="automation-form-title"
          className="rounded-2xl border border-zinc-200 bg-white p-5"
        >
          <h2 id="automation-form-title" className="text-sm font-semibold">
            Nueva regla
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="automation-name" className="mb-1 block text-sm font-medium">
                Nombre *
              </label>
              <input
                id="automation-name"
                aria-invalid={Boolean(form.formState.errors.name)}
                aria-describedby={form.formState.errors.name ? "automation-name-error" : undefined}
                className={inputClass}
                {...form.register("name")}
              />
              <FieldError
                id="automation-name-error"
                message={form.formState.errors.name?.message}
              />
            </div>

            <div>
              <label htmlFor="automation-event" className="mb-1 block text-sm font-medium">
                Evento *
              </label>
              <select id="automation-event" className={inputClass} {...form.register("event_type")}>
                {AUTOMATION_EVENT_TYPES.map((eventType) => (
                  <option key={eventType} value={eventType}>
                    {EVENT_TYPE_LABELS[eventType]}
                  </option>
                ))}
              </select>
              <FieldError
                id="automation-event-error"
                message={form.formState.errors.event_type?.message}
              />
            </div>

            <div>
              <label htmlFor="automation-action" className="mb-1 block text-sm font-medium">
                Acción *
              </label>
              <select
                id="automation-action"
                className={inputClass}
                {...form.register("action_type")}
              >
                {AUTOMATION_ACTION_TYPES.map((actionType) => (
                  <option key={actionType} value={actionType}>
                    {ACTION_TYPE_LABELS[actionType]}
                  </option>
                ))}
              </select>
              <FieldError
                id="automation-action-error"
                message={form.formState.errors.action_type?.message}
              />
            </div>

            {actionType === "notify_user" && (
              <div className="sm:col-span-2">
                <label htmlFor="automation-user" className="mb-1 block text-sm font-medium">
                  ID del usuario destinatario (UUID) *
                </label>
                <input
                  id="automation-user"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={Boolean(form.formState.errors.user_id)}
                  aria-describedby={
                    form.formState.errors.user_id ? "automation-user-error" : undefined
                  }
                  className={cn(inputClass, "font-mono")}
                  {...form.register("user_id")}
                />
                <p className="mt-1 text-xs text-zinc-500">
                  También podés indicarlo en la configuración JSON como <code>user_id</code>.
                </p>
                <FieldError
                  id="automation-user-error"
                  message={form.formState.errors.user_id?.message}
                />
              </div>
            )}

            <div className="sm:col-span-2">
              <label htmlFor="automation-conditions" className="mb-1 block text-sm font-medium">
                Condiciones (JSON, opcional)
              </label>
              <textarea
                id="automation-conditions"
                rows={3}
                spellCheck={false}
                aria-invalid={Boolean(form.formState.errors.conditions)}
                aria-describedby={
                  form.formState.errors.conditions
                    ? "automation-conditions-error"
                    : "automation-conditions-help"
                }
                className={cn(inputClass, "font-mono")}
                {...form.register("conditions")}
              />
              <p id="automation-conditions-help" className="mt-1 text-xs text-zinc-500">
                Un objeto JSON. Vacío = la regla aplica siempre que ocurra el evento.
              </p>
              <FieldError
                id="automation-conditions-error"
                message={form.formState.errors.conditions?.message}
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="automation-config" className="mb-1 block text-sm font-medium">
                Configuración de la acción (JSON, opcional)
              </label>
              <textarea
                id="automation-config"
                rows={3}
                spellCheck={false}
                aria-invalid={Boolean(form.formState.errors.action_config)}
                aria-describedby={
                  form.formState.errors.action_config ? "automation-config-error" : undefined
                }
                className={cn(inputClass, "font-mono")}
                {...form.register("action_config")}
              />
              <FieldError
                id="automation-config-error"
                message={form.formState.errors.action_config?.message}
              />
            </div>

            <div className="flex items-center gap-2 sm:col-span-2">
              <input
                id="automation-active"
                type="checkbox"
                className="h-4 w-4 rounded border-zinc-300"
                {...form.register("active")}
              />
              <label htmlFor="automation-active" className="text-sm font-medium">
                Activar al guardar
              </label>
            </div>
          </div>

          {createMutation.error && (
            <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage(createMutation.error, "No se pudo crear la regla")}
            </p>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-60"
            >
              {createMutation.isPending ? "Guardando..." : "Guardar regla"}
            </button>
          </div>
        </form>
      )}

      {actionError && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage(actionError, "No se pudo completar la acción")}
        </p>
      )}

      <section
        aria-labelledby="rules-title"
        className="rounded-2xl border border-zinc-200 bg-white"
      >
        <h2 id="rules-title" className="border-b border-zinc-200 px-4 py-3 text-sm font-semibold">
          Reglas
        </h2>

        {rulesQuery.isLoading ? (
          <p className="p-6 text-sm text-zinc-500">Cargando reglas...</p>
        ) : rulesQuery.isError ? (
          <p className="p-6 text-sm text-red-600">
            {errorMessage(rulesQuery.error, "No se pudieron cargar las reglas.")}
          </p>
        ) : rules.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-medium text-zinc-800">Todavía no hay reglas</p>
            <p className="mt-1 text-sm text-zinc-500">
              Creá una regla para avisar automáticamente cuando ocurra algo en el negocio.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {rules.map((rule) => {
              const togglePending =
                toggleMutation.isPending && toggleMutation.variables === rule.id;
              const deletePending =
                deleteMutation.isPending && deleteMutation.variables === rule.id;
              return (
                <li
                  key={rule.id}
                  className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-zinc-900">{rule.name}</p>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          rule.active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-zinc-100 text-zinc-700",
                        )}
                      >
                        {rule.active ? "Activa" : "Inactiva"}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-600">
                      {EVENT_TYPE_LABELS[rule.event_type]} → {ACTION_TYPE_LABELS[rule.action_type]}
                    </p>
                    <p className="text-xs text-zinc-500">
                      Actualizada {formatDate(rule.updated_at)}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleMutation.mutate(rule.id)}
                      disabled={togglePending}
                      aria-label={`${rule.active ? "Desactivar" : "Activar"} regla ${rule.name}`}
                      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
                    >
                      {togglePending ? "Guardando..." : rule.active ? "Desactivar" : "Activar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`¿Eliminar la regla "${rule.name}"?`)) {
                          deleteMutation.mutate(rule.id);
                        }
                      }}
                      disabled={deletePending}
                      aria-label={`Eliminar regla ${rule.name}`}
                      className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section
        aria-labelledby="executions-title"
        className="rounded-2xl border border-zinc-200 bg-white"
      >
        <div className="border-b border-zinc-200 px-4 py-3">
          <h2 id="executions-title" className="text-sm font-semibold">
            Historial de ejecuciones
          </h2>
          <p className="text-xs text-zinc-500">Últimas 50 ejecuciones.</p>
        </div>

        {executionsQuery.isLoading ? (
          <p className="p-6 text-sm text-zinc-500">Cargando historial...</p>
        ) : executionsQuery.isError ? (
          <p className="p-6 text-sm text-red-600">
            {errorMessage(executionsQuery.error, "No se pudo cargar el historial.")}
          </p>
        ) : executions.length === 0 ? (
          <p className="p-6 text-sm text-zinc-500">Todavía no se ejecutó ninguna automatización.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs tracking-wide text-zinc-500 uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Fecha
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Regla
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Evento
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Estado
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Intentos
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Error
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {executions.map((execution) => (
                  <tr key={execution.id} className="align-top hover:bg-zinc-50">
                    <td className="px-4 py-3 text-xs whitespace-nowrap text-zinc-600">
                      <time dateTime={execution.created_at}>
                        {formatDate(execution.created_at)}
                      </time>
                    </td>
                    <td className="px-4 py-3 text-zinc-800">
                      {ruleNames.get(execution.rule_id) ?? "Regla eliminada"}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {EVENT_TYPE_LABELS[execution.event_type]}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2 py-1 text-xs font-medium",
                          EXECUTION_STATUS_CLASSES[execution.status],
                        )}
                      >
                        {EXECUTION_STATUS_LABELS[execution.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{execution.attempts}</td>
                    <td className="max-w-xs px-4 py-3 text-xs text-red-700">
                      {execution.error ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
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
