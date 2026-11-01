"use client";

import { useEffect } from "react";

/**
 * Registers CropScan service worker cleanly without force-reloading open pages.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("Service worker registration ignored:", err);
      });
    }
  }, []);

  return null;
}

