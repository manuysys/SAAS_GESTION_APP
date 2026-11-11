import Link from "next/link";
import type { ReactNode } from "react";

import { brand } from "@/lib/brand";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col bg-paper">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-sm font-bold text-white"
          >
            D
          </span>
          <span className="font-display text-lg font-semibold tracking-tight text-ink">
            {brand.name}
          </span>
        </Link>
        <Link href="/" className="text-sm font-medium text-slate hover:text-ink">
          Volver al inicio
        </Link>
      </header>
      <div className="flex flex-1 items-center justify-center px-6 pb-16">{children}</div>
    </main>
  );
}
