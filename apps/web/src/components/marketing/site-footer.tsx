import Link from "next/link";

import { brand } from "@/lib/brand";
import { navLinks } from "@/lib/marketing/content";
import { cn } from "@/lib/utils";

import { focusDark } from "./ui";

const linkClass = cn("rounded text-white/80 hover:text-white", focusDark);

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-ink text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <p className="font-display text-lg font-semibold">{brand.name}</p>
          <p className="mt-2 max-w-xs text-sm leading-6 text-white/75">{brand.tagline}</p>
          <a
            href={`mailto:${brand.email}`}
            className={cn("mt-4 inline-block rounded text-sm font-medium underline", focusDark)}
          >
            {brand.email}
          </a>
        </div>

        <nav aria-label="Secciones">
          <p className="text-sm font-semibold">Producto</p>
          <ul className="mt-3 space-y-2 text-sm">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a href={link.href} className={linkClass}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Cuenta y legal">
          <p className="text-sm font-semibold">Cuenta y legal</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/login" className={linkClass}>
                Ingresar
              </Link>
            </li>
            <li>
              <Link href="/register" className={linkClass}>
                Crear mi empresa
              </Link>
            </li>
            <li>
              <Link href="/privacy" className={linkClass}>
                Política de privacidad
              </Link>
            </li>
            <li>
              <Link href="/terms" className={linkClass}>
                Términos y condiciones
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-white/65 sm:px-6">
          © {year} {brand.legalName}. Hecho en Argentina · Montos en ARS.
        </p>
      </div>
    </footer>
  );
}
