"use client";

import { useEffect } from "react";
// Side-effect import: src/lib/install.ts listens for `beforeinstallprompt` at
// module level, and the event fires once, early — a listener added by a
// component that mounts later would miss it. Importing it from the root layout
// gets it registered in time.
import "@/lib/install";

// Registers the offline-shell service worker (§8.5). No-op where unsupported.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
