/* TripNest service worker — offline app shell + web push notifications.
 *
 * Strategy:
 *  - Precache the app shell (pages, icons, manifest) on install.
 *  - Navigations: cache-first with background refresh, so tapping the app
 *    paints instantly on repeat launches (falls back to the shell / offline
 *    page when unreachable).
 *  - Static assets (_next/static, images): stale-while-revalidate.
 *  - Push: fire a notification for ride requests, messages and payment
 *    confirmations (delivered by the app's notification service).
 */

const VERSION = "tripnest-v4-logo";
const SHELL_CACHE = `${VERSION}-shell`;
const STATIC_CACHE = `${VERSION}-static`;

const SHELL_URLS = [
  "/",
  "/login",
  "/offline",
  "/manifest.webmanifest",
  "/icon.svg",
  "/apple-icon",
  "/pwa/icon-192?v=2",
  "/pwa/icon-512?v=2",
  "/pwa/icon-maskable-512?v=2",
];

const OFFLINE_PAGE = "/offline";

this.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // addAll fails as a whole if any URL 4xx/5xxs (e.g. /offline 404s in a
      // thin dev route), so seed the common shell separately and best-effort
      // the rest. Icons/manifest are static and always safe.
      await cache.addAll(SHELL_URLS).catch(() => {
        return Promise.all(
          SHELL_URLS.map((url) =>
            cache.add(url).catch(() => undefined),
          ),
        );
      });
      await self.skipWaiting();
    })(),
  );
});

this.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("tripnest-") && key !== SHELL_CACHE && key !== STATIC_CACHE)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

this.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // App pages: cache-first, refresh in the background. Repeat opens are
  // instant; the first paint is the shell and data re-fetches via client JS.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(SHELL_CACHE);
        const cached = (await cache.match(request)) || (await cache.match("/"));
        const network = fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() => null);
        if (cached) {
          // Don't block the paint on a network round-trip.
          network.then(() => {});
          return cached;
        }
        return network || caches.match(OFFLINE_PAGE);
      })(),
    );
    return;
  }

  // Static assets: stale-while-revalidate.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/images/") || url.pathname.startsWith("/pwa/")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((response) => {
            if (response && response.status === 200 && response.type === "basic") {
              cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() => cached);
        return cached || network;
      })(),
    );
    return;
  }
});

this.addEventListener("push", (event) => {
  let data: { title?: string; body?: string; icon?: string; url?: string } = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "TripNest", body: event.data ? event.data.text() : "New update" };
  }

  const title = data.title || "TripNest";
  const options = {
    body: data.body || "",
    icon: data.icon || "/pwa/icon-192",
    badge: "/pwa/icon-maskable-512",
    data: { url: data.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

this.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) return client.focus();
      }
      return self.clients.openWindow(target);
    }),
  );
});