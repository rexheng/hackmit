import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  register: false,
  reloadOnOnline: true,
  additionalPrecacheEntries: [
    { url: "/offline", revision: "cw-offline-1" },
    { url: "/", revision: "cw-shell-1" },
    { url: "/texas", revision: "cw-texas-1" },
    { url: "/works", revision: "cw-works-1" },
    { url: "/supply", revision: "cw-supply-1" },
  ],
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
};

export default withSerwist(nextConfig);
