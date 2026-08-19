"use client";

import { useEffect } from "react";

// Keep the screen awake while shopping (§8.6). Requested on mount (the
// generated-list route), released on unmount, re-requested when the tab
// becomes visible again (the OS drops the lock when hidden). Feature-detected;
// silent no-op where unsupported.
export function useWakeLock() {
  useEffect(() => {
    let sentinel: WakeLockSentinel | null = null;
    let active = true;

    async function request() {
      if (!active || !("wakeLock" in navigator)) return;
      try {
        sentinel = await navigator.wakeLock.request("screen");
      } catch {
        /* denied or unsupported — ignore */
      }
    }

    void request();
    const onVisible = () => {
      if (document.visibilityState === "visible") void request();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisible);
      sentinel?.release().catch(() => {});
    };
  }, []);
}
