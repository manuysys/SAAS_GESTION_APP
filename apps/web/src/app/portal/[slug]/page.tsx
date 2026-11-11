import type { Metadata } from "next";

import { brand } from "@/lib/brand";

import { PortalAccessPanel } from "./portal-access-panel";

export const metadata: Metadata = {
  title: `Acceso al portal | ${brand.name}`,
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function PortalAccessPage(props: PageProps<"/portal/[slug]">) {
  const { slug } = await props.params;
  const search = await props.searchParams;
  const rawToken = search.token;
  const token = Array.isArray(rawToken) ? (rawToken[0] ?? "") : (rawToken ?? "");

  return (
    <main className="min-h-screen bg-paper px-4 py-10 md:py-16">
      <div className="mx-auto w-full max-w-xl space-y-6">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal">
            {brand.legalName}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">
            Portal de clientes de {brand.name}
          </h1>
          <p className="text-sm text-slate">Empresa: {slug}</p>
        </div>
        <PortalAccessPanel slug={slug} token={token} />
      </div>
    </main>
  );
}
