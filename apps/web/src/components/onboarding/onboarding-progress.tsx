import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { ONBOARDING_STEPS } from "@/lib/onboarding-utils";

type OnboardingProgressProps = {
  current: number;
};

export function OnboardingProgress({ current }: OnboardingProgressProps) {
  return (
    <nav aria-label="Progreso de la configuración">
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {ONBOARDING_STEPS.map((item) => {
          const done = item.step < current;
          const active = item.step === current;
          return (
            <li
              key={item.step}
              aria-current={active ? "step" : undefined}
              className={cn(
                "flex min-w-0 items-center gap-2 rounded-xl border px-3 py-2",
                active && "border-teal bg-teal/5",
                done && "border-mist bg-white",
                !active && !done && "border-mist bg-paper/60",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  done && "bg-emerald-100 text-emerald-800",
                  active && "bg-teal text-white",
                  !active && !done && "bg-mist text-slate",
                )}
                aria-hidden="true"
              >
                {done ? <Check className="h-3.5 w-3.5" /> : item.step}
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] text-slate uppercase">Paso {item.step}</span>
                <span className="block truncate text-xs font-semibold text-ink sm:text-sm">
                  {item.title}
                </span>
              </span>
              {done && <span className="sr-only">(completado)</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
