import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/marketing/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-11-09T00:00:00-03:00");

  return [
    { url: absoluteUrl("/"), lastModified, changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/privacy"), lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: absoluteUrl("/terms"), lastModified, changeFrequency: "yearly", priority: 0.3 },
  ];
}
