"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { brand } from "@/lib/brand";
import { navLinks } from "@/lib/marketing/content";
import { cn } from "@/lib/utils";

import { ctaPrimary, focusDark } from "./ui";

/* Cabecera fija: transparente sobre el hero y con fondo ink al hacer scroll. */
export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b text-white transition-[background-color,border-color,backdrop-filter] duration-300",
        scrolled
          ? "border-white/10 bg-ink/85 backdrop-blur-md"
          : "border-transparent bg-transparent",
      )}
    >
      <a
        href="#contenido"
        className={cn(
          "sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:rounded-lg focus:bg-amber focus:px-3 focus:py-2 focus:font-semibold focus:text-ink",
          focusDark,
        )}
      >
        Saltar al contenido
      </a>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          aria-label={`${brand.name}, inicio`}
          className={cn("flex items-center gap-2 rounded-lg", focusDark)}
        >
          <span
            aria-hidden="true"
            className="grid size-8 place-items-center rounded-lg border border-white/15 bg-mk-ink-2 font-display text-sm font-semibold text-amber"
          >
            A
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">{brand.name}</span>
        </Link>

        <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white",
                focusDark,
              )}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className={cn(
              "hidden rounded-lg px-3 py-2 text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white sm:inline-flex",
              focusDark,
            )}
          >
            Ingresar
          </Link>
          <Link
            href="/register"
            className={cn(
              "hidden rounded-lg bg-amber px-4 py-2 text-sm font-semibold text-ink hover:brightness-105 md:inline-flex",
              focusDark,
            )}
          >
            Crear mi empresa
          </Link>

          <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
            <Dialog.Trigger asChild>
              <button
                type="button"
                aria-label="Abrir menú"
                className={cn(
                  "grid size-10 place-items-center rounded-lg border border-white/20 bg-white/5 md:hidden",
                  focusDark,
                )}
              >
                <Menu className="size-5" aria-hidden="true" />
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/60" />
              <Dialog.Content className="fixed inset-x-0 top-0 z-50 rounded-b-2xl border-b border-white/10 bg-ink p-5 text-white shadow-xl">
                <div className="flex items-center justify-between">
                  <Dialog.Title className="font-display text-lg font-semibold">Menú</Dialog.Title>
                  <Dialog.Close
                    aria-label="Cerrar menú"
                    className={cn("grid size-10 place-items-center rounded-lg", focusDark)}
                  >
                    <X className="size-5" aria-hidden="true" />
                  </Dialog.Close>
                </div>
                <Dialog.Description className="sr-only">
                  Navegación de la landing y accesos de ingreso y registro.
                </Dialog.Description>
                <nav aria-label="Móvil" className="mt-4 flex flex-col">
                  {navLinks.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      className={cn(
                        "rounded-lg px-3 py-3 text-base font-medium hover:bg-white/10",
                        focusDark,
                      )}
                    >
                      {link.label}
                    </a>
                  ))}
                </nav>
                <div className="mt-4 grid gap-2">
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "rounded-xl border border-white/30 px-4 py-3 text-center text-sm font-semibold",
                      focusDark,
                    )}
                  >
                    Ingresar
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMenuOpen(false)}
                    className={cn(ctaPrimary, "justify-center", focusDark)}
                  >
                    Crear mi empresa
                  </Link>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </div>
    </header>
  );
}
