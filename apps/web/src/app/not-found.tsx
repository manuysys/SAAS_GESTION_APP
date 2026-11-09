import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { brand } from "@/lib/brand";

export default function NotFound() {
  return (
    <main className="bg-paper flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        <p className="text-teal text-xs font-semibold tracking-[0.16em] uppercase">Error 404</p>
        <h1 className="font-display text-ink mt-3 text-3xl font-semibold tracking-tight">
          No encontramos esta página
        </h1>
        <p className="text-slate mt-3 text-sm">
          El enlace puede estar incompleto o la página se movió. Volvé al inicio o ingresá a tu
          panel.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Link href="/" className={buttonVariants({ variant: "primary" })}>
            Ir al inicio
          </Link>
          <Link href="/login" className={buttonVariants({ variant: "outline" })}>
            Ingresar
          </Link>
        </div>
        <p className="text-slate mt-8 text-xs">{brand.name}</p>
      </div>
    </main>
  );
}
