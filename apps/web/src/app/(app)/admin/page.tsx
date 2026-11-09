"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  SUBSCRIPTION_STATUSES,
  SUBSCRIPTION_STATUS_LABELS,
  isSubscriptionStatus,
} from "@/lib/billing";
import {
  ApiError,
  api,
  errorMessage,
  type AdminMetrics,
  type AdminTenant,
  type Plan,
  type SubscriptionStatus,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatCurrency, formatDateOnly, formatNumber } from "@/lib/utils";

const FORBIDDEN_MESSAGE = "No tenés acceso al panel global.";

const selectClass =
  "rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-zinc-900 disabled:opacity-60";

function isForbidden(error: unknown): boolean {
  return error instanceof ApiError && error.status === 403;
}

export default function AdminPage() {
  const { activeTenantId } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const metricsQuery = useQuery({
    queryKey: ["admin-metrics", activeTenantId],
    queryFn: () => api.admin.metrics(activeTenantId ?? ""),
    enabled: Boolean(activeTenantId),
    retry: false,
  });

  const tenantsQuery = useQuery({
    queryKey: ["admin-tenants", activeTenantId, search.trim()],
    queryFn: () => api.admin.tenants(activeTenantId ?? "", search),
    enabled: Boolean(activeTenantId),
    retry: false,
    placeholderData: keepPreviousData,
  });

  const plansQuery = useQuery({
    queryKey: ["billing-plans", activeTenantId],
    queryFn: () => api.billing.plans(activeTenantId ?? ""),
    enabled: Boolean(activeTenantId),
    retry: false,
  });

  const updateMutation = useMutation({
    mutationFn: (input: { targetTenantId: string; planCode: string; status: SubscriptionStatus }) =>
      api.admin.updateSubscription(
        activeTenantId ?? "",
        input.targetTenantId,
        input.planCode,
        input.status,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-metrics"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-tenants"] });
    },
  });

  if (!activeTenantId) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-sm text-zinc-600">
        No hay una empresa activa. Cerrá sesión y volvé a ingresar.
      </div>
    );
  }

  const forbidden = isForbidden(metricsQuery.error) || isForbidden(tenantsQuery.error);

  if (forbidden) {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-zinc-200 bg-white p-8 text-sm text-zinc-700"
      >
        {FORBIDDEN_MESSAGE}
      </div>
    );
  }

  const plans = plansQuery.data ?? [];
  const tenants = tenantsQuery.data?.items ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin SaaS</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Métricas agregadas y estado de suscripciones. No muestra datos de clientes ni órdenes
          individuales.
        </p>
      </div>

      <MetricsSection
        metrics={metricsQuery.data}
        loading={metricsQuery.isLoading}
        error={metricsQuery.error}
      />

      <section
        aria-labelledby="tenants-title"
        className="rounded-2xl border border-zinc-200 bg-white"
      >
        <div className="flex flex-col gap-3 border-b border-zinc-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="tenants-title" className="text-sm font-semibold">
              Empresas
            </h2>
            <p className="text-xs text-zinc-500">
              {tenantsQuery.data ? `${tenantsQuery.data.total} resultado(s)` : " "}
            </p>
          </div>
          <div className="w-full sm:w-72">
            <label htmlFor="tenant-search" className="mb-1 block text-xs font-medium text-zinc-600">
              Buscar por nombre de empresa
            </label>
            <input
              id="tenant-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Ej.: Electricidad"
              autoComplete="off"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900"
            />
          </div>
        </div>

        {updateMutation.error && (
          <p role="alert" className="mx-4 mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage(updateMutation.error, "No se pudo actualizar la suscripción.")}
          </p>
        )}
        {updateMutation.isSuccess && (
          <p
            role="status"
            className="mx-4 mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
          >
            Suscripción actualizada.
          </p>
        )}

        {plansQuery.isError && (
          <p role="alert" className="mx-4 mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage(plansQuery.error, "No se pudieron cargar los planes.")}
          </p>
        )}

        {tenantsQuery.isLoading ? (
          <p className="p-6 text-sm text-zinc-500">Cargando empresas...</p>
        ) : tenantsQuery.isError ? (
          <p role="alert" className="p-6 text-sm text-red-600">
            {errorMessage(tenantsQuery.error, "No se pudieron cargar las empresas.")}
          </p>
        ) : tenants.length === 0 ? (
          <p className="p-6 text-sm text-zinc-500">
            No hay empresas que coincidan con la búsqueda.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <caption className="sr-only">Empresas registradas y su suscripción</caption>
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs tracking-wide text-zinc-500 uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Empresa
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Plan
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Estado
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Usuarios
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Órdenes
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Precio
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Alta
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Cambiar suscripción
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {tenants.map((tenant) => (
                  <TenantRow
                    key={`${tenant.id}-${tenant.plan_code ?? "none"}-${tenant.subscription_status ?? "none"}`}
                    tenant={tenant}
                    plans={plans}
                    saving={
                      updateMutation.isPending &&
                      updateMutation.variables?.targetTenantId === tenant.id
                    }
                    disabled={updateMutation.isPending}
                    onSave={(planCode, status) =>
                      updateMutation.mutate({ targetTenantId: tenant.id, planCode, status })
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function MetricsSection({
  metrics,
  loading,
  error,
}: {
  metrics: AdminMetrics | undefined;
  loading: boolean;
  error: unknown;
}) {
  if (loading) {
    return <p className="text-sm text-zinc-500">Cargando métricas...</p>;
  }
  if (error) {
    return (
      <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
        {errorMessage(error, "No se pudieron cargar las métricas.")}
      </p>
    );
  }
  if (!metrics) return null;

  const cards: { label: string; value: string }[] = [
    { label: "Empresas", value: formatNumber(metrics.tenants_total, 0) },
    { label: "Suscripciones activas", value: formatNumber(metrics.active_subscriptions, 0) },
    { label: "En prueba", value: formatNumber(metrics.trialing_subscriptions, 0) },
    { label: "MRR", value: formatCurrency(metrics.mrr_ars) },
    { label: "Órdenes totales", value: formatNumber(metrics.orders_total, 0) },
    { label: "Órdenes este mes", value: formatNumber(metrics.orders_this_month, 0) },
    { label: "Tokens de IA este mes", value: formatNumber(metrics.ai_tokens_this_month, 0) },
  ];

  return (
    <section aria-labelledby="metrics-title">
      <h2 id="metrics-title" className="sr-only">
        Métricas globales
      </h2>
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card) => (
          <li key={card.label} className="rounded-2xl border border-zinc-200 bg-white p-4">
            <p className="text-xs text-zinc-500">{card.label}</p>
            <p className="mt-1 text-xl font-semibold break-words">{card.value}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TenantRow({
  tenant,
  plans,
  saving,
  disabled,
  onSave,
}: {
  tenant: AdminTenant;
  plans: Plan[];
  saving: boolean;
  disabled: boolean;
  onSave: (planCode: string, status: SubscriptionStatus) => void;
}) {
  const initialStatus: SubscriptionStatus = isSubscriptionStatus(tenant.subscription_status)
    ? tenant.subscription_status
    : "trialing";
  const initialPlan = tenant.plan_code ?? plans[0]?.code ?? "";
  const [planCode, setPlanCode] = useState(initialPlan);
  const [status, setStatus] = useState<SubscriptionStatus>(initialStatus);

  return (
    <tr className="align-middle hover:bg-zinc-50">
      <th scope="row" className="px-4 py-3 text-left font-medium text-zinc-900">
        {tenant.name}
      </th>
      <td className="px-4 py-3 text-zinc-700">{tenant.plan_name ?? "Sin plan"}</td>
      <td className="px-4 py-3">
        {tenant.subscription_status ? (
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-800">
            {isSubscriptionStatus(tenant.subscription_status)
              ? SUBSCRIPTION_STATUS_LABELS[tenant.subscription_status]
              : tenant.subscription_status}
          </span>
        ) : (
          <span className="text-zinc-500">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-zinc-700">{formatNumber(tenant.users_count, 0)}</td>
      <td className="px-4 py-3 text-zinc-700">{formatNumber(tenant.orders_count, 0)}</td>
      <td className="px-4 py-3 text-zinc-700">{formatCurrency(tenant.price_snapshot)}</td>
      <td className="px-4 py-3 text-xs whitespace-nowrap text-zinc-600">
        <time dateTime={tenant.created_at}>{formatDateOnly(tenant.created_at)}</time>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor={`plan-${tenant.id}`}>
            Plan de {tenant.name}
          </label>
          <select
            id={`plan-${tenant.id}`}
            value={planCode}
            onChange={(event) => setPlanCode(event.target.value)}
            disabled={disabled || plans.length === 0}
            className={selectClass}
          >
            {plans.map((plan) => (
              <option key={plan.id} value={plan.code}>
                {plan.name}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor={`status-${tenant.id}`}>
            Estado de {tenant.name}
          </label>
          <select
            id={`status-${tenant.id}`}
            value={status}
            onChange={(event) => {
              if (isSubscriptionStatus(event.target.value)) setStatus(event.target.value);
            }}
            disabled={disabled}
            className={selectClass}
          >
            {SUBSCRIPTION_STATUSES.map((value) => (
              <option key={value} value={value}>
                {SUBSCRIPTION_STATUS_LABELS[value]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onSave(planCode, status)}
            disabled={disabled || planCode === ""}
            aria-label={`Actualizar suscripción de ${tenant.name}`}
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Actualizar"}
          </button>
        </div>
      </td>
    </tr>
  );
}
