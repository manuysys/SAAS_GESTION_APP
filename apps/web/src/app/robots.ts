import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/marketing/site";

/* Rutas de la aplicación y enlaces con token: no deben indexarse. */
const privateRoutes = [
  "/admin",
  "/agenda",
  "/assistant",
  "/automations",
  "/customers",
  "/dashboard",
  "/login",
  "/notifications",
  "/orders",
  "/payments",
  "/q/",
  "/quotes",
  "/register",
  "/requests",
  "/settings",
  "/tech",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: privateRoutes,
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
