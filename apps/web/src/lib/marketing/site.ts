import { brand } from "@/lib/brand";

/** URL pública del sitio. Se puede sobreescribir con NEXT_PUBLIC_SITE_URL. */
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? `https://${brand.domain}`).replace(
  /\/$/,
  "",
);

export function absoluteUrl(path: string) {
  return `${siteUrl}${path}`;
}
