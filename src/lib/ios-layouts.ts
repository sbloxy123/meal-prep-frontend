// Where iPhone browsers keep "Add to Home Screen", per browser and iOS version.
//
// iOS has no install prompt, so the walkthrough (install-sheet.tsx) has to say
// exactly which button to tap — and Apple moves it. iOS 15 put Safari's bar at
// the bottom; iOS 26's Compact layout hid Share behind a "•••" button. This
// file is the one place that knowledge lives, and MAX_VERIFIED_IOS is the
// newest iOS anyone has actually checked it on. A phone on a newer iOS gets
// GENERIC (layout-agnostic wording, no arrow) and logs
// install_layout_unverified; the backend emails the admins on the first
// sighting of each new major and /back-of-house keeps a notice up until this
// file is updated.
//
// The September ritual: Apple ships iOS every September. Open Fornetto on the
// new version in Safari and Chrome, check where Share / "•••" / Add to Home
// Screen are, add or extend a row below, bump MAX_VERIFIED_IOS, update the
// verifiedOn/verifiedBy notes. ios-layouts.test.ts fails if the number is
// bumped without a row reaching it.

export const MAX_VERIFIED_IOS = 26;
export const REGISTRY_VERIFIED_ON = "2026-09-03";

export type IosBrowser = "safari" | "chrome" | "firefox" | "edge";
export type CoachEdge = "bottom-right" | "bottom-centre" | "top-right" | "none";
export type IllustrationKey =
  | "safari-compact-more"
  | "safari-classic-share"
  | "chrome-share"
  | "menu-hamburger"
  | "sheet-add-row"
  | "add-screen"
  | "generic-share";

export interface WalkStep {
  /** One short imperative sentence naming the exact label on screen. */
  title: string;
  caption: string;
  illustration: IllustrationKey;
}

export interface Walkthrough {
  /** Stable id — screenshot files are named after it (see SHOTS). */
  key: string;
  /** false for GENERIC: the phone is newer than the registry knows. */
  verified: boolean;
  verifiedOn: string;
  verifiedBy: string;
  coach: {
    /** Which screen edge the real control sits on — where the arrow points. */
    edge: CoachEdge;
    /** The three taps, as short labels for the coach card. */
    taps: readonly [string, string, string];
  };
  steps: readonly [WalkStep, WalkStep, WalkStep];
}

interface Entry {
  browser: IosBrowser;
  minIos: number;
  maxIos: number;
  walkthrough: Omit<Walkthrough, "verified">;
}

const ADD_TO_HOME: WalkStep = {
  title: "Tap Add to Home Screen",
  caption: "Scroll down the list if you can’t see it straight away.",
  illustration: "sheet-add-row",
};

const TAP_ADD: WalkStep = {
  title: "Tap Add",
  caption:
    "Leave “Open as Web App” on if you see it. Then open Fornetto from your Home Screen and sign in once — the installed app keeps its own login.",
  illustration: "add-screen",
};

const TAP_ADD_OLDER: WalkStep = {
  ...TAP_ADD,
  caption:
    "Then open Fornetto from your Home Screen and sign in once — the installed app keeps its own login.",
};

export const LAYOUTS: readonly Entry[] = [
  // ── Safari ──
  {
    browser: "safari",
    minIos: 26,
    maxIos: 26,
    walkthrough: {
      key: "safari-26",
      verifiedOn: "2026-09-03",
      verifiedBy: "owner’s iPhone, iOS 26, Compact layout",
      coach: { edge: "bottom-right", taps: ["•••", "Share", "Add to Home Screen"] },
      steps: [
        {
          title: "Tap •••",
          caption:
            "It’s at the right end of the address bar, at the bottom of the screen. (See a Share button instead? Tap that.)",
          illustration: "safari-compact-more",
        },
        {
          title: "Tap Share, then Add to Home Screen",
          caption: "Share is in that menu. In the sheet that opens, scroll down to Add to Home Screen.",
          illustration: "sheet-add-row",
        },
        TAP_ADD,
      ],
    },
  },
  {
    browser: "safari",
    minIos: 15,
    maxIos: 25,
    walkthrough: {
      key: "safari-15-25",
      verifiedOn: "2026-09-03",
      verifiedBy: "Apple Support: Bottom/Top tab bar layouts",
      coach: { edge: "bottom-centre", taps: ["Share", "Add to Home Screen", "Add"] },
      steps: [
        {
          title: "Tap Share",
          caption: "The square with an arrow, in the middle of the bar at the bottom of the screen.",
          illustration: "safari-classic-share",
        },
        ADD_TO_HOME,
        TAP_ADD_OLDER,
      ],
    },
  },
  {
    browser: "safari",
    minIos: 0,
    maxIos: 14,
    walkthrough: {
      key: "safari-legacy",
      verifiedOn: "2026-09-03",
      verifiedBy: "Apple Support: address bar at the top, toolbar at the bottom",
      coach: { edge: "bottom-centre", taps: ["Share", "Add to Home Screen", "Add"] },
      steps: [
        {
          title: "Tap Share",
          caption: "The square with an arrow, in the middle of the toolbar at the bottom of the screen.",
          illustration: "safari-classic-share",
        },
        ADD_TO_HOME,
        TAP_ADD_OLDER,
      ],
    },
  },
  // ── Chrome (can add to the Home Screen from iOS 16.4; older is routed to Safari) ──
  {
    browser: "chrome",
    minIos: 0,
    maxIos: 26,
    walkthrough: {
      key: "chrome",
      verifiedOn: "2026-09-03",
      verifiedBy: "Google Chrome Help: Use web apps (iPhone & iPad)",
      coach: { edge: "top-right", taps: ["Share", "Add to Home Screen", "Add"] },
      steps: [
        {
          title: "Tap the Share icon",
          caption: "At the right end of the address bar — top of the screen, or bottom if you moved it.",
          illustration: "chrome-share",
        },
        ADD_TO_HOME,
        TAP_ADD,
      ],
    },
  },
  // ── Firefox / Edge: hamburger menu bottom-right → Share ──
  {
    browser: "firefox",
    minIos: 0,
    maxIos: 26,
    walkthrough: {
      key: "firefox",
      verifiedOn: "2026-09-03",
      verifiedBy: "Mozilla Support: Add a website shortcut to your home screen on iOS",
      coach: { edge: "bottom-right", taps: ["≡", "Share", "Add to Home Screen"] },
      steps: [
        { title: "Tap ≡", caption: "Bottom right of the screen.", illustration: "menu-hamburger" },
        {
          title: "Tap Share, then Add to Home Screen",
          caption: "Share is in that menu; Add to Home Screen is in the sheet it opens.",
          illustration: "sheet-add-row",
        },
        TAP_ADD,
      ],
    },
  },
  {
    browser: "edge",
    minIos: 0,
    maxIos: 26,
    walkthrough: {
      key: "edge",
      verifiedOn: "2026-09-03",
      verifiedBy: "Microsoft Edge on iPhone: ≡ → Share",
      coach: { edge: "bottom-right", taps: ["≡", "Share", "Add to Home Screen"] },
      steps: [
        { title: "Tap ≡", caption: "Bottom right of the screen.", illustration: "menu-hamburger" },
        {
          title: "Tap Share, then Add to Home Screen",
          caption: "Share is in that menu; Add to Home Screen is in the sheet it opens.",
          illustration: "sheet-add-row",
        },
        TAP_ADD,
      ],
    },
  },
];

/** Layout-agnostic wording for an iOS newer than the registry, or an unknown browser. */
export const GENERIC: Walkthrough = {
  key: "generic",
  verified: false,
  verifiedOn: REGISTRY_VERIFIED_ON,
  verifiedBy: "fallback",
  coach: { edge: "none", taps: ["Share", "Add to Home Screen", "Add"] },
  steps: [
    {
      title: "Tap Share",
      caption: "The square with an arrow pointing up. It may be inside a ••• or ≡ menu by the address bar.",
      illustration: "generic-share",
    },
    ADD_TO_HOME,
    TAP_ADD,
  ],
};

export interface IosVersion {
  major: number;
  minor: number;
}

export function iosWalkthrough(browser: string, ios: IosVersion | null): Walkthrough {
  if (!ios || ios.major > MAX_VERIFIED_IOS) return GENERIC;
  const entry = LAYOUTS.find(
    (l) => l.browser === browser && ios.major >= l.minIos && ios.major <= l.maxIos,
  );
  return entry ? { ...entry.walkthrough, verified: true } : GENERIC;
}

/** Chrome on iOS gained Add to Home Screen in iOS 16.4. */
export function chromeCanAddToHomeScreen(ios: IosVersion | null): boolean {
  if (!ios) return true; // unknown — don't send someone to Safari on a guess
  return ios.major > 16 || (ios.major === 16 && ios.minor >= 4);
}
