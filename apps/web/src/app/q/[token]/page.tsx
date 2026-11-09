import type { Metadata } from "next";

import { PublicQuoteView } from "@/components/quotes/public-quote-view";

// Enlaces públicos por token: no deben indexarse en buscadores.
export const metadata: Metadata = {
  title: "Presupuesto",
  robots: { index: false, follow: false },
};

export default async function PublicQuotePage(props: PageProps<"/q/[token]">) {
  const { token } = await props.params;

  return (
    <main className="bg-paper min-h-screen px-4 py-8 md:py-12">
      <div className="mx-auto w-full max-w-3xl">
        <PublicQuoteView token={token} />
      </div>
    </main>
  );
}
