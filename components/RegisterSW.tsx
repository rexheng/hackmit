"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    serwist?: { register: () => Promise<unknown> };
  }
}

export function RegisterSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const boot = () => {
      if (window.serwist) {
        void window.serwist.register();
        return;
      }
      void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
    };
    if (document.readyState === "complete") boot();
    else window.addEventListener("load", boot, { once: true });
  }, []);
  return null;
}
