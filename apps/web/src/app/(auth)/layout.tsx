import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col bg-zinc-50">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-sm font-bold text-white">
            SG
          </div>
          <span className="text-lg font-semibold tracking-tight">SaaS Gestión</span>
        </Link>
      </header>
      <div className="flex flex-1 items-center justify-center px-6 pb-16">{children}</div>
    </main>
  );
}
