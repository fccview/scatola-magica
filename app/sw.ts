import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  CacheFirst,
  ExpirationPlugin,
  NetworkOnly,
  Serwist,
  StaleWhileRevalidate,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: WorkerGlobalScope;

const OFFLINE_URL = "/offline.html";
const MONTH_SECONDS = 30 * 24 * 60 * 60;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching: [
    {
      matcher: ({ sameOrigin, url }) =>
        sameOrigin && url.pathname.startsWith("/api/"),
      handler: new NetworkOnly(),
    },
    {
      matcher: ({ request }) => request.mode === "navigate",
      handler: new NetworkOnly(),
    },
    {
      matcher: /\/_next\/static\/.+\.(?:js|css)$/i,
      handler: new CacheFirst({
        cacheName: "static-assets",
        plugins: [
          new ExpirationPlugin({ maxEntries: 128, maxAgeSeconds: MONTH_SECONDS }),
        ],
      }),
    },
    {
      matcher: /\.(?:woff2?|ttf|otf|png|svg|ico|webp|gif)$/i,
      handler: new StaleWhileRevalidate({
        cacheName: "media",
        plugins: [
          new ExpirationPlugin({ maxEntries: 128, maxAgeSeconds: MONTH_SECONDS }),
        ],
      }),
    },
  ],
  fallbacks: {
    entries: [
      {
        url: OFFLINE_URL,
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();
