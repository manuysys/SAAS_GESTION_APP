import type { Metadata } from "next";

import { Faq } from "@/components/marketing/faq";
import { FeaturesBento } from "@/components/marketing/features-bento";
import { FinalCta } from "@/components/marketing/final-cta";
import { Hero } from "@/components/marketing/hero";
import { Journey } from "@/components/marketing/journey";
import { Marquee } from "@/components/marketing/marquee";
import { Pricing } from "@/components/marketing/pricing";
import { ProductTour } from "@/components/marketing/product-tour";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { SmoothScroll } from "@/components/marketing/smooth-scroll";
import { TrustStrip } from "@/components/marketing/trust-strip";
import { brand } from "@/lib/brand";
import { buildSoftwareJsonLd, serializeJsonLd } from "@/lib/marketing/json-ld";
import { siteUrl } from "@/lib/marketing/site";

const title = "Software para empresas de servicios técnicos";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { absolute: `${title} | ${brand.name}` },
  description: brand.description,
  alternates: { canonical: "/" },
  openGraph: {
    title: `${brand.name} — ${title}`,
    description: brand.description,
    url: "/",
    siteName: brand.name,
    locale: "es_AR",
    type: "website",
  },
};

/* Landing: secciones alternadas ink / teal / paper / tinta. Smooth scroll solo aquí. */
export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(buildSoftwareJsonLd()) }}
      />
      <SmoothScroll />
      <SiteHeader />
      <main className="overflow-x-clip">
        <Hero />
        <Marquee />
        <TrustStrip />
        <Journey />
        <FeaturesBento />
        <ProductTour />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
