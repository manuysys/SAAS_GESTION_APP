import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "border-mist text-ink placeholder:text-slate/60 focus:border-teal focus:ring-teal/20 min-h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none focus:ring-2 disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}
