"use client";

import { useEffect } from "react";

// Registers the offline-shell service worker (§8.5). No-op where unsupported.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
