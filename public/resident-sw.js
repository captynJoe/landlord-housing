const CACHE_NAME = "jk-flats-resident-v20260523a";
const RESIDENT_SHELL_URL = "/resident";
const LANDLORD_SHELL_URL = "/landlord";
const APP_ASSETS = [
  RESIDENT_SHELL_URL,
  LANDLORD_SHELL_URL,
  "/users.css?v=20260509a",
  "/landlord.css?v=20260523a",
  "/dedicated-theme.css?v=20260519a",
  "/users.js?v=20260523a",
  "/landlord.js?v=20260523a",
  "/password-visibility.js",
  "/manifest.webmanifest",
  "/icons/housing-app.svg",
  "/icons/housing-badge.svg"
];

function getShellCacheKey(pathname) {
  if (pathname === "/landlord" || pathname.startsWith("/landlord/")) {
    return LANDLORD_SHELL_URL;
  }

  if (
    pathname === "/user" ||
    pathname === "/user/" ||
    pathname === "/users" ||
    pathname === "/users/"
  ) {
    return RESIDENT_SHELL_URL;
  }

  return RESIDENT_SHELL_URL;
}

function isStaticAsset(url) {
  return (
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/icons/") ||
      url.pathname === "/manifest.webmanifest" ||
      url.pathname.endsWith(".css") ||
      url.pathname.endsWith(".js"))
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (request.mode === "navigate" && url.origin === self.location.origin) {
    const shellCacheKey = getShellCacheKey(url.pathname);
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          void caches.open(CACHE_NAME).then((cache) => {
            cache.put(shellCacheKey, copy);
          });
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(shellCacheKey);
          return cached || Response.error();
        })
    );
    return;
  }

  if (!isStaticAsset(url)) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          void caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, copy);
          });
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        return cached || Response.error();
      })
  );
});

self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch (_error) {
    data = {
      body: event.data ? event.data.text() : "New update available."
    };
  }

  const title = data.title || "JK Flats Resident";
  const options = {
    body: data.body || "New resident update available.",
    icon: "/icons/housing-app.svg",
    badge: "/icons/housing-badge.svg",
    tag: data.tag || "jk-flats-resident",
    data: {
      url: data.url || "/resident"
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = new URL(
    event.notification.data?.url || "/resident",
    self.location.origin
  ).href;
  const targetPath = new URL(targetUrl).pathname;
  const targetShellPrefix = targetPath.startsWith("/landlord")
    ? "/landlord"
    : "/resident";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.startsWith(`${self.location.origin}${targetShellPrefix}`)) {
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }

      return undefined;
    })
  );
});
