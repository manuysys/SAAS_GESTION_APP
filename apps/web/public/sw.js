/*
 * Service worker mínimo para la PWA de técnicos.
 *
 * Reglas:
 * - Cachea el shell (offline.html, manifest, icono) y los assets hasheados de
 *   /_next/static (cache-first, son inmutables).
 * - Navegaciones a /tech: network-first con copia en caché y fallback offline.
 * - Resto de navegaciones: red con fallback a offline.html.
 * - Nunca cachea ni intercepta la API (/api/ y orígenes cruzados).
 */

const CACHE_PREFIX = "saas-gestion-shell-";
const SHELL_CACHE = `${CACHE_PREFIX}v1`;
const OFFLINE_URL = "/offline.html";
const PRECACHE_URLS = [OFFLINE_URL, "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== SHELL_CACHE)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

function isTechnicianPath(pathname) {
  return pathname === "/tech" || pathname.startsWith("/tech/");
}

async function networkFirstTechNavigation(request, event) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok && !response.redirected && response.type === "basic") {
      event.waitUntil(cache.put(request, response.clone()));
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    const offline = await cache.match(OFFLINE_URL);
    return offline ?? Response.error();
  }
}

async function networkWithOfflineFallback(request) {
  try {
    return await fetch(request);
  } catch {
    const cache = await caches.open(SHELL_CACHE);
    const offline = await cache.match(OFFLINE_URL);
    return offline ?? Response.error();
  }
}

async function cacheFirst(request, event) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok && response.type === "basic") {
    event.waitUntil(cache.put(request, response.clone()));
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // La API vive en otro origen; igualmente se excluye por ruta por seguridad.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    if (isTechnicianPath(url.pathname)) {
      event.respondWith(networkFirstTechNavigation(request, event));
    } else {
      event.respondWith(networkWithOfflineFallback(request));
    }
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, event));
  }
});
