"use client";

import { useSyncExternalStore } from "react";
import { logEvent } from "./analytics";
import { MAX_VERIFIED_IOS, parseIosVersion, type IosVersion } from "./ios-layouts";

// Everything about getting Fornetto onto a home screen, in one place.
//
// The awkward truth this is built around: iOS has no install prompt. Safari
// never fires `beforeinstallprompt`, there is no `appinstalled`, and a page
// cannot ask whether it is already on the Home Screen. Every iPhone install is
// a manual Share → "Add to Home Screen", so on iOS the "prompt" is our own
// sheet (install-sheet.tsx) walking them through it, and the only true install
// signal is a later launch in standalone display-mode (logStandaloneOpen).
// Chrome/Edge on Android and desktop do fire `beforeinstallprompt`; it is held
// here and `prompt()` is called from a button, the one place browsers allow it.

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type InstallOS = "ios" | "android" | "desktop";
export type InstallBrowser =
  | "safari"
  | "chrome"
  | "firefox"
  | "edge"
  | "samsung"
  | "inapp"
  | "other";

export interface InstallPlatform {
  os: InstallOS;
  browser: InstallBrowser;
  /** Running from the home screen already. */
  standalone: boolean;
  /** iOS version from the UA (major.minor); null off iOS or when unparsable. */
  ios: IosVersion | null;
  /** iOS only: false when the phone is newer than src/lib/ios-layouts.ts has
      been checked on — the walkthrough falls back to generic wording. */
  layoutVerified: boolean;
  /** Forced with `?platform=os-browser&ios=26.1` (e.g. `?platform=ios-inapp`)
      to preview another phone's guide. Forced views are never logged. */
  forced: boolean;
}

export type InstallOutcome =
  | "native_accepted"
  | "native_dismissed"
  | "guide"
  | "later"
  | "never"
  | "coach"
  | "closed";

// ── Native prompt (Chrome/Edge) ────────────────────────────────────────────
// Captured at module level: the event fires once, early in the page's life,
// and a component that mounts later would miss it. service-worker-register.tsx
// imports this module from the root layout so the listener exists in time.

interface NativeState {
  available: boolean;
  installed: boolean;
}

let deferred: BeforeInstallPromptEvent | null = null;
let nativeSnapshot: NativeState = { available: false, installed: false };
const SERVER_NATIVE: NativeState = { available: false, installed: false };
const listeners = new Set<() => void>();

function setNative(next: NativeState) {
  nativeSnapshot = next;
  listeners.forEach((l) => l());
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    // Stops Chrome's own mini-infobar; the sheet is the prompt.
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    setNative({ available: true, installed: false });
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    setNative({ available: false, installed: true });
  });
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** Is the browser's own install dialog on offer / has it just been used? */
export function useNativeInstall(): NativeState {
  return useSyncExternalStore(
    subscribe,
    () => nativeSnapshot,
    () => SERVER_NATIVE,
  );
}

export async function promptNativeInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  const ev = deferred;
  if (!ev) return "unavailable";
  // Chrome allows prompt() once per event, whatever the answer.
  deferred = null;
  await ev.prompt();
  const { outcome } = await ev.userChoice;
  setNative({ available: false, installed: outcome === "accepted" });
  return outcome;
}

// ── Platform ───────────────────────────────────────────────────────────────

const INAPP_UA =
  /FBAN|FBAV|FB_IAB|Instagram|Line\/|Twitter|GSA\/|Snapchat|LinkedInApp|musical_ly|BytedanceWebview|Pinterest/i;

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

const OSES: InstallOS[] = ["ios", "android", "desktop"];
const BROWSERS: InstallBrowser[] = ["safari", "chrome", "firefox", "edge", "samsung", "inapp", "other"];

function parseIos(major: string | undefined, minor: string | undefined): IosVersion | null {
  const M = Number(major);
  if (!Number.isFinite(M)) return null;
  const m = Number(minor);
  return { major: M, minor: Number.isFinite(m) ? m : 0 };
}

function readForced(): { os: InstallOS; browser: InstallBrowser; ios: IosVersion | null } | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("platform");
    if (!raw) return null;
    const [os, browser = "other"] = raw.split("-");
    if (!OSES.includes(os as InstallOS) || !BROWSERS.includes(browser as InstallBrowser)) return null;
    const [maj, min] = (params.get("ios") ?? "").split(".");
    const ios = os === "ios" ? (parseIos(maj, min) ?? { major: MAX_VERIFIED_IOS, minor: 0 }) : null;
    return { os: os as InstallOS, browser: browser as InstallBrowser, ios };
  } catch {
    return null;
  }
}

export function detectPlatform(): InstallPlatform {
  const standalone = isStandalone();
  const forced = readForced();
  if (forced) {
    return {
      ...forced,
      standalone,
      layoutVerified: !forced.ios || forced.ios.major <= MAX_VERIFIED_IOS,
      forced: true,
    };
  }

  const ua = navigator.userAgent;
  // iPadOS 13+ masquerades as macOS — a touch-capable "Mac" is really an iPad.
  const iPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  const ios = /iPad|iPhone|iPod/.test(ua) || iPadOS;
  const android = !ios && /Android/.test(ua);
  const os: InstallOS = ios ? "ios" : android ? "android" : "desktop";
  // Safari on iOS 26+ freezes the "iPhone OS 18_x" token and only the
  // "Version/26.x" token tells the truth — parseIosVersion takes the newer.
  const iosVersion: IosVersion | null = ios ? parseIosVersion(ua) : null;

  let browser: InstallBrowser = "other";
  if (ios) {
    if (/CriOS/.test(ua)) browser = "chrome";
    else if (/FxiOS/.test(ua)) browser = "firefox";
    else if (/EdgiOS/.test(ua)) browser = "edge";
    // WKWebView (Gmail, Instagram, …) drops the Safari token. Heuristic only —
    // SFSafariViewController keeps it — so the guide always carries an
    // "open in Safari" escape hatch regardless.
    else if (INAPP_UA.test(ua) || !/Safari\//.test(ua)) browser = "inapp";
    else browser = "safari";
  } else if (android) {
    if (INAPP_UA.test(ua) || /; wv\)/.test(ua)) browser = "inapp";
    else if (/SamsungBrowser/.test(ua)) browser = "samsung";
    else if (/EdgA\//.test(ua)) browser = "edge";
    else if (/Firefox\//.test(ua)) browser = "firefox";
    else if (/Chrome\//.test(ua)) browser = "chrome";
  } else {
    if (/Edg\//.test(ua)) browser = "edge";
    else if (/Chrome\//.test(ua)) browser = "chrome";
    else if (/Firefox\//.test(ua)) browser = "firefox";
    else if (/Safari\//.test(ua)) browser = "safari";
  }
  return {
    os,
    browser,
    standalone,
    ios: iosVersion,
    layoutVerified: !ios || (iosVersion !== null && iosVersion.major <= MAX_VERIFIED_IOS),
    forced: false,
  };
}

let platformCache: InstallPlatform | null = null;
const noop = () => () => {};

/** Client-only platform read; `null` during SSR and hydration. */
export function usePlatform(): InstallPlatform | null {
  return useSyncExternalStore(
    noop,
    () => (platformCache ??= detectPlatform()),
    () => null,
  );
}

// ── Auto-prompt policy ─────────────────────────────────────────────────────
// Once, on a phone, then quiet for a week ("Remind me later" / a plain close)
// or for good ("Don't show this again"). Per device, not per user: the thing
// being installed is per device.

const POLICY_KEY = "fornetto:installPrompt";
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

interface Policy {
  never?: boolean;
  snoozedUntil?: number;
  shown?: number;
}

function readPolicy(): Policy {
  try {
    return JSON.parse(localStorage.getItem(POLICY_KEY) ?? "{}") as Policy;
  } catch {
    return {};
  }
}

function writePolicy(p: Policy) {
  try {
    localStorage.setItem(POLICY_KEY, JSON.stringify(p));
  } catch {
    /* private mode — the sheet may show again next time; acceptable */
  }
}

export function autoPromptAllowed(): boolean {
  if (isStandalone() || nativeSnapshot.installed) return false;
  // Phones and tablets only, below the rail breakpoint: desktop gets the
  // Account card and "email me the link" instead of a dialog over the app.
  if (detectPlatform().os === "desktop") return false;
  if (!window.matchMedia("(max-width: 1023px)").matches) return false;
  const p = readPolicy();
  if (p.never) return false;
  if (p.snoozedUntil && p.snoozedUntil > Date.now()) return false;
  return true;
}

/** Called as the auto sheet opens: counts the showing and snoozes at once, so
    a refresh mid-sheet doesn't re-offer it. */
export function markAutoPromptShown() {
  const p = readPolicy();
  writePolicy({ ...p, shown: (p.shown ?? 0) + 1, snoozedUntil: Date.now() + SNOOZE_MS });
}

export function snoozeAutoPrompt() {
  writePolicy({ ...readPolicy(), snoozedUntil: Date.now() + SNOOZE_MS });
}

export function stopAutoPrompt() {
  writePolicy({ ...readPolicy(), never: true });
}

// ── Analytics ──────────────────────────────────────────────────────────────

export function logInstall(
  type: "install_prompt_shown" | "install_prompt_outcome" | "install_page_view",
  platform: InstallPlatform | null,
  meta: Record<string, string>,
) {
  if (!platform || platform.forced) return;
  logEvent(type, { platform: platform.os, browser: platform.browser, ...meta });
}

const UNVERIFIED_KEY = "fornetto:layoutUnverifiedLogged";

/** iOS newer than the walkthrough registry knows. Once per session; the
    backend emails the admins on the first sighting of each new major. */
export function logLayoutUnverified() {
  const p = detectPlatform();
  if (p.os !== "ios" || p.layoutVerified || p.forced || !p.ios) return;
  try {
    if (sessionStorage.getItem(UNVERIFIED_KEY)) return;
    sessionStorage.setItem(UNVERIFIED_KEY, "1");
  } catch {
    return;
  }
  logEvent("install_layout_unverified", {
    platform: p.os,
    browser: p.browser,
    ios: `${p.ios.major}.${p.ios.minor}`,
    verified: MAX_VERIFIED_IOS,
  });
}

const STANDALONE_KEY = "fornetto:standaloneLogged";

/** The real install metric: a launch from the home screen. Once per session. */
export function logStandaloneOpen() {
  if (!isStandalone()) return;
  try {
    if (sessionStorage.getItem(STANDALONE_KEY)) return;
    sessionStorage.setItem(STANDALONE_KEY, "1");
  } catch {
    return;
  }
  const p = detectPlatform();
  if (p.forced) return;
  logEvent("install_standalone_open", { platform: p.os, browser: p.browser });
}
