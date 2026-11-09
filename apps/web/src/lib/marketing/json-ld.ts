import { brand, plans } from "@/lib/brand";

import { siteUrl } from "./site";

/** JSON-LD SoftwareApplication. No incluye valoraciones: no hay reseñas reales. */
export function buildSoftwareJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: brand.name,
    description: brand.description,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: siteUrl,
    inLanguage: "es-AR",
    offers: plans.map((plan) => ({
      "@type": "Offer",
      name: plan.name,
      description: plan.tagline,
      price: plan.priceArs,
      priceCurrency: "ARS",
      availability: "https://schema.org/InStock",
    })),
  };
}

/** Serializa JSON-LD escapando "<" para no cerrar el script por accidente. */
export function serializeJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
