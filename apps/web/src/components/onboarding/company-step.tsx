"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { OnboardingPatch, OnboardingState } from "@/lib/onboarding-api";
import {
  DEFAULT_CURRENCY,
  DEFAULT_TIMEZONE,
  ONBOARDING_TIMEZONES,
  companyStepSchema,
  isOnboardingTimezone,
  type CompanyStepValues,
} from "@/lib/onboarding-utils";

const TIMEZONE_LABELS: Record<(typeof ONBOARDING_TIMEZONES)[number], string> = {
  "America/Argentina/Buenos_Aires": "Buenos Aires (hora argentina)",
  "America/Argentina/Cordoba": "Córdoba",
  "America/Argentina/Mendoza": "Mendoza",
};

type CompanyStepProps = {
  state: Required<OnboardingState>;
  tenantName: string;
  pending: boolean;
  onSave: (patch: OnboardingPatch) => void;
};

export function CompanyStep({ state, tenantName, pending, onSave }: CompanyStepProps) {
  const saved = state.company;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CompanyStepValues>({
    resolver: zodResolver(companyStepSchema),
    defaultValues: {
      name: saved?.name ?? tenantName,
      timezone: saved && isOnboardingTimezone(saved.timezone) ? saved.timezone : DEFAULT_TIMEZONE,
    },
  });

  function onSubmit(values: CompanyStepValues) {
    onSave({
      company: { name: values.name, timezone: values.timezone, currency: DEFAULT_CURRENCY },
      step: 2,
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label
          htmlFor="onboarding-company-name"
          className="mb-1 block text-sm font-medium text-ink"
        >
          Nombre de la empresa *
        </label>
        <Input
          id="onboarding-company-name"
          autoComplete="organization"
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? "onboarding-company-name-error" : undefined}
          {...register("name")}
        />
        {errors.name && (
          <p id="onboarding-company-name-error" className="mt-1 text-xs text-red-600">
            {errors.name.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="onboarding-timezone" className="mb-1 block text-sm font-medium text-ink">
          Zona horaria *
        </label>
        <select
          id="onboarding-timezone"
          aria-invalid={errors.timezone ? true : undefined}
          aria-describedby={errors.timezone ? "onboarding-timezone-error" : undefined}
          className="min-h-11 w-full rounded-xl border border-mist bg-white px-3 text-sm text-ink outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
          {...register("timezone")}
        >
          {ONBOARDING_TIMEZONES.map((zone) => (
            <option key={zone} value={zone}>
              {TIMEZONE_LABELS[zone]}
            </option>
          ))}
        </select>
        {errors.timezone && (
          <p id="onboarding-timezone-error" className="mt-1 text-xs text-red-600">
            {errors.timezone.message}
          </p>
        )}
      </div>

      <div>
        <p className="mb-1 text-sm font-medium text-ink">Moneda</p>
        <p className="min-h-11 rounded-xl border border-mist bg-paper px-3 py-2.5 text-sm text-slate">
          Peso argentino (ARS)
        </p>
        <p className="mt-1 text-xs text-slate">Por ahora todos los importes se expresan en ARS.</p>
      </div>

      <div className="flex justify-end sm:col-span-2">
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Guardando..." : "Guardar y continuar"}
        </Button>
      </div>
    </form>
  );
}
