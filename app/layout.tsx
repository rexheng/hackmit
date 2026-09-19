import type { Metadata, Viewport } from "next";
import { RegisterSW } from "@/components/RegisterSW";
import { fontClassName } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "COMPUTE WORKS — Texas data centers",
  description:
    "A tin-lithograph civic desk for how a data center actually touches a Texan: electricity, jobs, water, community, a vicinity map, and a letter that can leave the building.",
  applicationName: "Compute Works",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Compute Works",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#c01018",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontClassName}>
      <body>
        <div className="grain" />
        <RegisterSW />
        {children}
      </body>
    </html>
  );
}
