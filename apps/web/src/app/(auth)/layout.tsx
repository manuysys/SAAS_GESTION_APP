import Link from "next/link";
import type { ReactNode } from "react";

import { brand } from "@/lib/brand";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="bg-paper flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="bg-ink flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white">
            A
          </span>
          <span className="font-display text-ink text-lg font-semibold tracking-tight">
            {brand.name}
          </span>
        </Link>
        <Link href="/" className="text-slate hover:text-ink text-sm font-medium">
          Volver al inicio
        </Link>
      </header>
      <div className="flex flex-1 items-center justify-center px-6 pb-16">{children}</div>
    </main>
  );
}
