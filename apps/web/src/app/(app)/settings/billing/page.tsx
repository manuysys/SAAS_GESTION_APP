"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  PLAN_LIMIT_ITEMS,
  SUBSCRIPTION_STATUS_CLASSES,
  SUBSCRIPTION_STATUS_LABELS,
  isSubscriptionStatus,
  periodLabel,
} from "@/lib/billing";
import { api, errorMessage, type Plan, type SubscriptionDetail } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { readLimit, usagePercent } from "@/lib/usage";
import { cn, formatCurrency, formatDate, formatNumber } from "@/lib/utils";

const ADMIN_ROLES = ["owner", "admin"];

export default function BillingPage() {
  const { activeTenantId, tenants } = useAuth();
  const queryClient = useQueryClient();
  const [pendingPlan, setPendingPlan] = useState<Plan | null>(null);
  const activeTenant = tenants.find((tenant) => tenant.id === activeTenantId);
  const canManage = ADMIN_ROLES.includes(activeTenant?.role ?? "");

  const subscriptionQuery = useQuery({
    queryKey: ["billing-subscription", activeTenantId],
    queryFn: () => api.billing.subscription(activeTenantId ?? ""),
    enabled: Boolean(activeTenantId) && canManage,
  });

  const plansQuery = useQuery({
    queryKey: ["billing-plans", activeTenantId],
    queryFn: () => api.billing.plans(activeTenantId ?? ""),
    enabled: Boolean(activeTenantId) && canManage,
  });

  const changePlanMutation = useMutation({
    mutationFn: (planCode: string) => api.billing.changePlan(activeTenantId ?? "", planCode),
    onSuccess: () => {
      setPendingPlan(null);
      void queryClient.invalidateQueries({ queryKey: ["billing-subscription"] });
      void queryClient.invalidateQueries({ queryKey: ["billing-plans"] });
    },
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
        Solo los administradores de la empresa pueden ver la facturación.
      </div>
    );
  }

  const detail = subscriptionQuery.data;
  const plans = plansQuery.data ?? [];
  const currentPlanCode = detail?.subscription.plan.code;
  const isOwner = activeTenant?.role === "owner";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Facturación</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Plan, uso y límites de {activeTenant?.name ?? "tu empresa"}. Precios en ARS.
        </p>
      </div>

      {subscriptionQuery.isLoading ? (
        <p className="text-sm text-zinc-500">Cargando suscripción...</p>
      ) : subscriptionQuery.isError ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage(subscriptionQuery.error, "No se pudo cargar la suscripción.")}
        </p>
      ) : detail ? (
        <CurrentPlanCard detail={detail} />
      ) : null}

      {detail && <UsageSection detail={detail} />}

      <section aria-labelledby="plans-title" className="space-y-4">
        <div>
          <h2 id="plans-title" className="text-lg font-semibold">
            Planes disponibles
          </h2>
          {!isOwner && (
            <p className="mt-1 text-sm text-zinc-600">
              Solo el propietario de la empresa puede cambiar de plan.
            </p>
          )}
        </div>

        {changePlanMutation.error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage(changePlanMutation.error, "No se pudo cambiar el plan.")}
          </p>
        )}

        {pendingPlan && (
          <section
            aria-labelledby="confirm-plan-title"
            className="rounded-2xl border border-amber-300 bg-amber-50 p-5"
          >
            <h3 id="confirm-plan-title" className="text-sm font-semibold text-amber-950">
              Confirmar cambio de plan
            </h3>
            <p className="mt-1 text-sm text-amber-950">
              Vas a cambiar a <strong>{pendingPlan.name}</strong> por{" "}
              {formatCurrency(pendingPlan.price_ars)} por {periodLabel(pendingPlan.billing_period)}.
              Los nuevos límites aplican desde este momento.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setPendingPlan(null)}
                disabled={changePlanMutation.isPending}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => changePlanMutation.mutate(pendingPlan.code)}
                disabled={changePlanMutation.isPending || !isOwner}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-60"
              >
                {changePlanMutation.isPending ? "Cambiando..." : "Confirmar cambio"}
              </button>
            </div>
          </section>
        )}

        {plansQuery.isLoading ? (
          <p className="text-sm text-zinc-500">Cargando planes...</p>
        ) : plansQuery.isError ? (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage(plansQuery.error, "No se pudieron cargar los planes.")}
          </p>
        ) : plans.length === 0 ? (
          <p className="text-sm text-zinc-500">No hay planes disponibles.</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {plans
              .filter((plan) => plan.active || plan.code === currentPlanCode)
              .map((plan) => {
                const isCurrent = plan.code === currentPlanCode;
                return (
                  <li
                    key={plan.id}
                    className={cn(
                      "flex flex-col rounded-2xl border bg-white p-5",
                      isCurrent ? "border-zinc-900" : "border-zinc-200",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-base font-semibold">{plan.name}</h3>
                        <p className="text-xs text-zinc-500">Código: {plan.code}</p>
                      </div>
                      {isCurrent && (
                        <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-xs font-medium text-white">
                          Plan actual
                        </span>
                      )}
                    </div>
                    <p className="mt-3 text-2xl font-semibold">
                      {formatCurrency(plan.price_ars)}
                      <span className="text-sm font-normal text-zinc-500">
                        {" "}
                        / {periodLabel(plan.billing_period)}
                      </span>
                    </p>
                    <PlanLimitsList limits={plan.limits} />
                    <div className="mt-auto pt-4">
                      {isCurrent ? (
                        <button
                          type="button"
                          disabled
                          className="w-full rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-500"
                        >
                          Plan actual
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setPendingPlan(plan)}
                          disabled={!isOwner || changePlanMutation.isPending}
                          className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-60"
                        >
                          Cambiar a este plan
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
          </ul>
        )}
      </section>
    </div>
  );
}

function CurrentPlanCard({ detail }: { detail: SubscriptionDetail }) {
  const { subscription } = detail;
  const status = isSubscriptionStatus(subscription.status) ? subscription.status : null;
  return (
    <section
      aria-labelledby="current-plan-title"
      className="rounded-2xl border border-zinc-200 bg-white p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="current-plan-title" className="text-sm font-medium text-zinc-500">
            Plan actual
          </h2>
          <p className="mt-1 text-xl font-semibold">{subscription.plan.name}</p>
          <p className="text-sm text-zinc-600">
            {formatCurrency(subscription.price_snapshot)} por{" "}
            {periodLabel(subscription.plan.billing_period)} (precio contratado)
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:text-right">
          <dt className="text-zinc-500">Estado</dt>
          <dd>
            {status ? (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  SUBSCRIPTION_STATUS_CLASSES[status],
                )}
              >
                {SUBSCRIPTION_STATUS_LABELS[status]}
              </span>
            ) : (
              <span className="text-zinc-700">{subscription.status}</span>
            )}
          </dd>
          <dt className="text-zinc-500">Período hasta</dt>
          <dd className="font-medium">
            {subscription.current_period_end ? formatDate(subscription.current_period_end) : "—"}
          </dd>
        </dl>
      </div>
    </section>
  );
}

function UsageSection({ detail }: { detail: SubscriptionDetail }) {
  const { usage, subscription } = detail;
  return (
    <section
      aria-labelledby="usage-title"
      className="rounded-2xl border border-zinc-200 bg-white p-5"
    >
      <h2 id="usage-title" className="text-sm font-semibold">
        Uso frente a los límites del plan
      </h2>
      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        {PLAN_LIMIT_ITEMS.map((item) => {
          const used = usage[item.usageKey];
          const limit = readLimit(subscription.plan.limits, item.key);
          return <UsageBar key={item.key} label={item.label} used={used} limit={limit} />;
        })}
      </div>
    </section>
  );
}

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const percent = usagePercent(used, limit);
  const text =
    limit === null
      ? `${formatNumber(used, 0)} (sin límite configurado)`
      : `${formatNumber(used, 0)} de ${formatNumber(limit, 0)}`;

  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium text-zinc-800">{label}</span>
        <span className="text-zinc-600">{text}</span>
      </div>
      {percent !== null && (
        <div
          role="progressbar"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-valuetext={`${percent}% usado`}
          className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-200"
        >
          <div
            className={cn("h-full rounded-full", percent >= 90 ? "bg-red-600" : "bg-zinc-900")}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
    </div>
  );
}

function PlanLimitsList({ limits }: { limits: Record<string, unknown> | null }) {
  return (
    <ul className="mt-4 space-y-1 text-sm text-zinc-700">
      {PLAN_LIMIT_ITEMS.map((item) => {
        const limit = readLimit(limits, item.key);
        return (
          <li key={item.key} className="flex justify-between gap-2">
            <span>{item.label}</span>
            <span className="font-medium">
              {limit === null ? "Sin límite" : formatNumber(limit, 0)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
