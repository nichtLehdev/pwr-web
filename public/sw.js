/**
 * Service Worker — Offline-Unterstützung, primär für die Spiele unter /spiele.
 *
 * Strategien:
 * - Dokumente (Navigationen) & RSC-Flight-Requests: network-first → Cache →
 *   /offline. Online-Nutzer sehen nach einem Deploy immer frisches HTML.
 * - /_next/static & Icons: cache-first (Inhalte sind content-gehasht und
 *   unveränderlich), mit LRU-Begrenzung.
 * - /api, /uploads: niemals cachen (personalisiert bzw. dynamisch).
 *
 * Entwicklung: registriert wird nur im Production-Build. Hängt lokal trotzdem
 * ein alter SW fest → in Chrome unter chrome://serviceworker-internals
 * deregistrieren.
 */

const VERSION = "v1";
const DOC_CACHE = `pwr-docs-${VERSION}`;
const RSC_CACHE = `pwr-rsc-${VERSION}`;
const STATIC_CACHE = `pwr-static-${VERSION}`;
const KNOWN_CACHES = [DOC_CACHE, RSC_CACHE, STATIC_CACHE];

const OFFLINE_URL = "/offline";
const MAX_STATIC_ENTRIES = 220;
const MAX_DOC_ENTRIES = 40;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(DOC_CACHE);
      try {
        await cache.add(OFFLINE_URL);
      } catch {
        // Offline-Seite nicht erreichbar (z. B. Build-Probleme) — SW trotzdem installieren.
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => n.startsWith("pwr-") && !KNOWN_CACHES.includes(n))
          .map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

/** Insertion-Order-LRU: älteste Einträge löschen, wenn das Limit überschritten ist. */
async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  const excess = keys.length - maxEntries;
  for (let i = 0; i < excess; i++) {
    await cache.delete(keys[i]);
  }
}

function isRscRequest(request, url) {
  return (
    request.headers.get("RSC") === "1" ||
    request.headers.get("Next-Router-Prefetch") === "1" ||
    url.searchParams.has("_rsc")
  );
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/images/") ||
    /^\/(favicon|icon-|android-chrome|apple-touch-icon)/.test(url.pathname) ||
    url.pathname === "/favicon.ico"
  );
}

function isBypassed(url) {
  return (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/uploads/") ||
    url.pathname.startsWith("/_next/image")
  );
}

async function networkFirst(request, cacheName, { offlineFallback } = {}) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
      if (cacheName === DOC_CACHE) {
        void trimCache(DOC_CACHE, MAX_DOC_ENTRIES);
      }
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request, { ignoreVary: true });
    if (cached) return cached;
    if (offlineFallback) {
      const offline = await (
        await caches.open(DOC_CACHE)
      ).match(OFFLINE_URL, { ignoreVary: true });
      if (offline) return offline;
    }
    throw err;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request, { ignoreVary: true });
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
    void trimCache(STATIC_CACHE, MAX_STATIC_ENTRIES);
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isBypassed(url)) return;

  if (request.mode === "navigate") {
    event.respondWith(
      networkFirst(request, DOC_CACHE, { offlineFallback: true }),
    );
    return;
  }

  if (isRscRequest(request, url)) {
    // Bei Cache-Miss offline: Fehler werfen — der App-Router fällt dann auf
    // eine harte Navigation zurück, die der Dokument-Zweig bedient.
    event.respondWith(networkFirst(request, RSC_CACHE));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }
  // Alles andere: Netz ohne SW-Eingriff.
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "WARM_GAMES" || !Array.isArray(data.urls)) return;
  event.waitUntil(
    (async () => {
      const cache = await caches.open(DOC_CACHE);
      await Promise.allSettled(
        data.urls.map(async (u) => {
          const response = await fetch(u, { credentials: "same-origin" });
          if (response.ok) await cache.put(u, response.clone());
        }),
      );
    })(),
  );
});
