import Link from "next/link";

import { brand } from "@/lib/brand";
import { cn } from "@/lib/utils";

import { SiteFooter } from "./site-footer";

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal";

export type LegalSection = {
  title: string;
  paragraphs: readonly string[];
};

type LegalPageProps = {
  title: string;
  updatedAt: string;
  sections: readonly LegalSection[];
};

/** Layout de páginas legales. El contenido es borrador: revisar con asesor legal. */
export function LegalPage({ title, updatedAt, sections }: LegalPageProps) {
  return (
    <>
      <header className="border-b border-mist bg-paper">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className={cn("rounded font-display text-lg font-semibold text-ink", focusRing)}
          >
            {brand.name}
          </Link>
          <Link
            href="/"
            className={cn("rounded text-sm font-medium text-ink underline", focusRing)}
          >
            Volver al inicio
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="inline-flex rounded-full bg-amber/30 px-3 py-1 text-xs font-semibold text-ink">
          Borrador a revisar por asesor legal
        </p>
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 text-sm text-slate">Última actualización: {updatedAt}</p>

        <div className="mt-10 space-y-10">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="font-display text-xl font-semibold text-ink">{section.title}</h2>
              <div className="mt-3 space-y-3 text-base leading-7 text-ink/85">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
