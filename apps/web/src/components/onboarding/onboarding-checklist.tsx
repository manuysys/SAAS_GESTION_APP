"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Circle, Rocket } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOnboarding } from "@/lib/onboarding-api";
import { normalizeOnboardingState, onboardingChecklist } from "@/lib/onboarding-utils";
import { cn } from "@/lib/utils";

type OnboardingChecklistProps = {
  tenantId: string;
};

/**
 * Checklist de inicio para el panel. Usa el mismo estado que el asistente (misma clave de caché).
 * Se oculta cuando la configuración está completa o si no se pudo cargar: el panel no depende de él.
 */
export function OnboardingChecklist({ tenantId }: OnboardingChecklistProps) {
  const statusQuery = useQuery({
    queryKey: ["onboarding", tenantId],
    queryFn: () => getOnboarding(tenantId),
    enabled: Boolean(tenantId),
  });

  if (!statusQuery.data || statusQuery.data.completed || statusQuery.isError) {
    return null;
  }

  const items = onboardingChecklist(normalizeOnboardingState(statusQuery.data.state));
  const doneCount = items.filter((item) => item.done).length;

  return (
    <Card className="border-teal/20 bg-teal/5">
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-4 w-4 text-teal" aria-hidden="true" />
            Primeros pasos
          </CardTitle>
          <p className="mt-1 text-sm text-slate">
            {doneCount} de {items.length} listos. Lo que falta sale del estado real de tu empresa.
          </p>
        </div>
        <Link
          href="/onboarding"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0")}
        >
          Continuar configuración
        </Link>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-mist">
          {items.map((item) => (
            <li key={item.key} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              {item.done ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
              ) : (
                <Circle className="h-5 w-5 shrink-0 text-slate" aria-hidden="true" />
              )}
              <span className="min-w-0 flex-1 text-sm font-medium text-ink">{item.label}</span>
              {item.done ? (
                <Badge variant="success">Listo</Badge>
              ) : (
                <Link
                  href={item.href}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-teal hover:underline"
                >
                  Completar
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  <span className="sr-only">{` ${item.label}`}</span>
                </Link>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
