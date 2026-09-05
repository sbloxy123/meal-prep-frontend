// The X-Fornetto-Client header: `<standalone|browser>/<platform>`, sent on
// every data request by src/lib/api.ts so the backend can tell which days a
// person used the installed (home-screen) app rather than a browser tab —
// the only install signal iOS gives us (see install.ts). The backend parses
// it strictly (lib/clientHint.js) and folds it into user_activity.
//
// Self-contained on purpose: api.ts is imported by analytics.ts, which
// install.ts imports, so reading install.ts's detectPlatform from here would
// make a cycle. The platform rule is the same coarse one install.ts uses.

export const CLIENT_HINT_HEADER = "X-Fornetto-Client";

let cached: string | null = null;

export function clientHint(): string | null {
  if (typeof window === "undefined") return null;
  if (cached) return cached;
  try {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    const ua = navigator.userAgent;
    const iPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
    const platform = /iPhone|iPad|iPod/.test(ua) || iPadOS ? "ios" : /Android/.test(ua) ? "android" : "desktop";
    cached = `${standalone ? "standalone" : "browser"}/${platform}`;
  } catch {
    cached = null;
  }
  return cached;
}

/** Headers to spread into a fetch: the hint when we have one, nothing otherwise. */
export function clientHintHeaders(): Record<string, string> {
  const hint = clientHint();
  return hint ? { [CLIENT_HINT_HEADER]: hint } : {};
}
