import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: LucideIcon;
  tone?: "default" | "teal" | "amber" | "danger";
  className?: string;
};

const toneClasses: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "bg-ink/5 text-ink",
  teal: "bg-teal/10 text-teal",
  amber: "bg-amber/15 text-amber-700",
  danger: "bg-red-100 text-red-700",
};

export function StatCard({ label, value, hint, icon: Icon, tone = "default", className }: StatCardProps) {
  return (
    <div className={cn("border-mist rounded-2xl border bg-white p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-slate text-xs font-medium tracking-wide uppercase">{label}</p>
        {Icon && (
          <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", toneClasses[tone])}>
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        )}
      </div>
      <p className="text-ink font-display mt-3 text-2xl font-semibold tracking-tight">{value}</p>
      {hint && <p className="text-slate mt-1 text-xs">{hint}</p>}
    </div>
  );
}
