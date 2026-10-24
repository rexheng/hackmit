import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Compute Works",
    short_name: "Works",
    description:
      "A tin-lithograph civic desk for how a Texas data center actually touches you.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    lang: "en-US",
    dir: "ltr",
    background_color: "#3a2c1c",
    theme_color: "#c01018",
    categories: ["news", "utilities", "government"],
    prefer_related_applications: false,
    screenshots: [
      {
        src: "/screenshots/desk-wide.png",
        sizes: "1280x720",
        type: "image/png",
        form_factor: "wide",
        label: "The Texas civic desk — Midlothian satellite and punch card",
      },
      {
        src: "/screenshots/desk-narrow.png",
        sizes: "390x844",
        type: "image/png",
        form_factor: "narrow",
        label: "Compute Works on a pocket tin",
      },
    ],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
