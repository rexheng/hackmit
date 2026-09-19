import type { Metadata } from "next";
import { fontClassName } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "COMPUTE WORKS — Texas data centers",
  description:
    "A tin-lithograph civic desk for how a data center actually touches a Texan: electricity, jobs, water, community, a vicinity map, and a letter that can leave the building.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontClassName}>
      <body>
        <div className="grain" />
        {children}
      </body>
    </html>
  );
}
