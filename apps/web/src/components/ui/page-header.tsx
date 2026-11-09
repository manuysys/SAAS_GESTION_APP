import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  eyebrow?: string;
  className?: string;
};

export function PageHeader({ title, description, actions, eyebrow, className }: PageHeaderProps) {
  return (
    <header
      className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-teal mb-1 text-xs font-semibold tracking-[0.14em] uppercase">
            {eyebrow}
          </p>
        )}
        <h1 className="text-ink font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h1>
        {description && <p className="text-slate mt-1 max-w-2xl text-sm">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
