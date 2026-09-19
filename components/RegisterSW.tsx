"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    serwist?: { register: () => Promise<unknown> };
  }
}

function markStandalone() {
  const mq = window.matchMedia("(display-mode: standalone)");
  const apple = Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  document.documentElement.classList.toggle("pwa-standalone", mq.matches || apple);
}

export function RegisterSW() {
  useEffect(() => {
    markStandalone();
    const mq = window.matchMedia("(display-mode: standalone)");
    mq.addEventListener?.("change", markStandalone);
    if (!("serviceWorker" in navigator)) return;
    const boot = () => {
      if (window.serwist) {
        void window.serwist.register();
        return;
      }
      void navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => undefined);
    };
    if (document.readyState === "complete") boot();
    else window.addEventListener("load", boot, { once: true });
    return () => mq.removeEventListener?.("change", markStandalone);
  }, []);
  return null;
}
