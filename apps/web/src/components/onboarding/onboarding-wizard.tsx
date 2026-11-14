"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, RefreshCw, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { CompanyStep } from "@/components/onboarding/company-step";
import { FirstDataStep } from "@/components/onboarding/first-data-step";
import { OnboardingProgress } from "@/components/onboarding/onboarding-progress";
import { ServicesStep } from "@/components/onboarding/services-step";
import { TeamStep } from "@/components/onboarding/team-step";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  completeOnboarding,
  getOnboarding,
  patchOnboarding,
  type OnboardingPatch,
  type OnboardingStatus,
} from "@/lib/onboarding-api";
import { ADMIN_ROLES } from "@/lib/navigation";
import {
  ONBOARDING_STEPS,
  ONBOARDING_STEP_COUNT,
  normalizeOnboardingState,
  onboardingErrorMessage,
} from "@/lib/onboarding-utils";

/**
 * Entrada del asistente. El contenido se monta una vez por empresa: formularios, errores y
 * mutaciones no pasan de una empresa a otra aunque cambie el tenant activo.
 */
export function OnboardingWizard() {
  const { activeTenantId } = useAuth();
  return <OnboardingSession key={activeTenantId ?? "sin-empresa"} />;
}

function onboardingKey(tenantId: string) {
  return ["onboarding", tenantId] as const;
}

function OnboardingSession() {
  const { activeTenantId, tenants } = useAuth();
  const queryClient = useQueryClient();
  const tenantId = activeTenantId ?? "";
  const activeTenant = tenants.find((tenant) => tenant.id === activeTenantId);
  const canManage = ADMIN_ROLES.includes(activeTenant?.role ?? "");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [finishError, setFinishError] = useState<string | null>(null);

  const statusQuery = useQuery({
    queryKey: onboardingKey(tenantId),
    queryFn: () => getOnboarding(tenantId),
    enabled: Boolean(tenantId) && canManage,
  });

  const state = normalizeOnboardingState(statusQuery.data?.state);
  const step = state.step;
  const onStepFour = step === ONBOARDING_STEP_COUNT;

  const customersQuery = useQuery({
    queryKey: ["customers", tenantId, ""],
    queryFn: () => api.customers.list(tenantId, ""),
    enabled: Boolean(tenantId) && canManage && onStepFour,
  });

  // Las mutaciones llevan el tenant en sus variables: la respuesta solo actualiza esa caché.
  const saveMutation = useMutation({
    mutationFn: (input: { tenantId: string; patch: OnboardingPatch }) =>
      patchOnboarding(input.tenantId, input.patch),
    onMutate: () => {
      setSaveError(null);
      setFinishError(null);
    },
    onSuccess: (status, input) => {
      queryClient.setQueryData<OnboardingStatus>(onboardingKey(input.tenantId), status);
    },
    onError: (error) =>
      setSaveError(
        onboardingErrorMessage(
          error,
          "No se pudo guardar el paso. Revisá los datos y probá de nuevo.",
        ),
      ),
  });

  const completeMutation = useMutation({
    mutationFn: (targetTenantId: string) => completeOnboarding(targetTenantId),
    onSuccess: (result, targetTenantId) => {
      if (!result.completed) return;
      // Marca completo solo la caché de la empresa que finalizó, con la confirmación del backend.
      queryClient.setQueryData<OnboardingStatus>(onboardingKey(targetTenantId), (previous) =>
        previous ? { ...previous, completed: true } : previous,
      );
      toast.success("Configuración inicial finalizada");
    },
    onError: (error) =>
      setFinishError(
        onboardingErrorMessage(error, "No se pudo finalizar la configuración. Probá de nuevo."),
      ),
  });

  const pending = saveMutation.isPending || completeMutation.isPending;
  const completed = statusQuery.data?.completed === true;

  function saveStep(patch: OnboardingPatch) {
    saveMutation.mutate({ tenantId, patch });
  }

  function finish(withFirstCustomer: boolean) {
    const patch: OnboardingPatch = withFirstCustomer
      ? { first_customer: true, step: ONBOARDING_STEP_COUNT }
      : { step: ONBOARDING_STEP_COUNT };
    // Orden obligatorio: primero se guarda el último paso; si falla, no se completa.
    saveMutation.mutate(
      { tenantId, patch },
      { onSuccess: () => completeMutation.mutate(tenantId) },
    );
  }

  if (!tenantId) {
    return (
      <Card className="p-8 text-sm text-slate">
        No hay una empresa activa. Cerrá sesión y volvé a ingresar.
      </Card>
    );
  }

  if (!canManage) {
    return (
      <Card className="flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-900">
          <ShieldAlert className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-semibold text-ink">
            No tenés permisos para esta configuración
          </p>
          <p className="mt-1 text-sm text-slate">
            Solo el propietario o un administrador de {activeTenant?.name ?? "la empresa"} puede
            completar los primeros pasos.
          </p>
        </div>
      </Card>
    );
  }

  if (statusQuery.isPending) {
    return (
      <Card className="p-6 text-sm text-slate" role="status">
        Cargando tu progreso...
      </Card>
    );
  }

  if (statusQuery.isError) {
    return (
      <Card className="space-y-3 p-6">
        <p role="alert" className="text-sm text-red-700">
          {onboardingErrorMessage(
            statusQuery.error,
            "No pudimos cargar tu progreso. Probá de nuevo.",
          )}
        </p>
        <Button variant="outline" onClick={() => void statusQuery.refetch()}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Reintentar
        </Button>
      </Card>
    );
  }

  if (completed) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Puesta en marcha" title="Primeros pasos" />
        <Card className="space-y-4 p-6">
          <p className="flex items-center gap-2 text-base font-semibold text-ink">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" />
            La configuración inicial está completa
          </p>
          <p className="text-sm text-slate">
            Podés seguir ajustando la empresa, el equipo y los clientes desde sus secciones.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href="/dashboard" className={buttonVariants({ variant: "primary" })}>
              Ir al panel
            </Link>
            <Link href="/settings/import" className={buttonVariants({ variant: "outline" })}>
              Importar clientes
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const currentStep = ONBOARDING_STEPS[step - 1] ?? ONBOARDING_STEPS[0];
  const goBack = () => saveStep({ step: step - 1 });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Puesta en marcha"
        title="Primeros pasos"
        description="Configurá tu empresa en cuatro pasos. Tu avance se guarda: podés salir y retomar después."
      />

      <OnboardingProgress current={step} />

      {saveError && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {saveError}
        </p>
      )}
      {finishError && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {finishError}
        </p>
      )}

      <Card>
        <CardHeader>
          <p className="text-xs font-semibold tracking-wide text-slate uppercase">
            Paso {step} de {ONBOARDING_STEP_COUNT}
          </p>
          <CardTitle>{currentStep.title}</CardTitle>
          <p className="text-sm text-slate">{currentStep.description}</p>
        </CardHeader>
        <CardContent aria-busy={pending || undefined}>
          {step === 1 && (
            <CompanyStep
              state={state}
              tenantName={activeTenant?.name ?? ""}
              pending={pending}
              onSave={saveStep}
            />
          )}
          {step === 2 && (
            <ServicesStep state={state} pending={pending} onSave={saveStep} onBack={goBack} />
          )}
          {step === 3 && (
            <TeamStep state={state} pending={pending} onSave={saveStep} onBack={goBack} />
          )}
          {step === 4 && (
            <FirstDataStep
              customersCount={customersQuery.data?.total ?? null}
              customersError={customersQuery.isError}
              pending={pending}
              onBack={goBack}
              onFinish={finish}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
