/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { ExpirationPlugin, NetworkOnly, Serwist, StaleWhileRevalidate } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const MUTATING_API = ["/api/mail", "/api/redesign", "/api/comments"];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ url }) => MUTATING_API.some((p) => url.pathname === p || url.pathname.startsWith(`${p}/`)),
      method: "POST",
      handler: new NetworkOnly(),
    },
    {
      matcher: () => true,
      method: "POST",
      handler: new NetworkOnly(),
    },
    {
      matcher: ({ url }) =>
        url.hostname.includes("arcgisonline.com") ||
        url.hostname.includes("basemaps.cartocdn.com") ||
        url.hostname.includes("openstreetmap.org"),
      handler: new StaleWhileRevalidate({
        cacheName: "cw-map-tiles",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 256,
            maxAgeSeconds: 7 * 24 * 60 * 60,
            maxAgeFrom: "last-used",
          }),
        ],
      }),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
