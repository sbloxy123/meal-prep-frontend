"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { Check, Compass, Copy, Download, Menu, MoreVertical, Share, Smartphone, SquarePlus } from "lucide-react";
import type { InstallPlatform } from "@/lib/install";
import { chromeCanAddToHomeScreen, iosWalkthrough, type IllustrationKey, type Walkthrough } from "@/lib/ios-layouts";
import { Illustration } from "@/components/install-illustrations";

// The platform-specific "how to put Fornetto on your home screen" content,
// shared by the install sheet (single-screen mode) and the public /install
// page. On iPhones the steps come from src/lib/ios-layouts.ts — the registry
// of where each browser keeps Add to Home Screen per iOS version — so the
// sheet's walkthrough and this long-form list can never disagree.
//
// Real iOS screenshots go in public/install/ and are wired up in SHOTS,
// keyed `${walkthrough.key}-${step}` (e.g. "safari-26-1"); until they land the
// steps use the drawn illustrations.

export interface Shot {
  src: string;
  width: number;
  height: number;
  alt: string;
}

export const SHOTS: Record<string, Shot | undefined> = {};

interface Step {
  icon: ReactNode;
  text: ReactNode;
  illustration?: IllustrationKey;
  shot?: Shot;
}

interface Guide {
  title: string;
  lede: ReactNode;
  steps: Step[];
  /** A second list, e.g. "Then, in Safari:" after the in-app escape. */
  then?: { heading: string; steps: Step[] };
  note?: ReactNode;
  /** Set on iPhone branches that can hand off to the coach. */
  walkthrough?: Walkthrough;
}

function CopyLinkButton() {
  const [copied, setCopied] = useState(false);
  async function copy() {
    const url = `${window.location.origin}/install`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", url);
    }
  }
  return (
    <button type="button" className="btn btn-secondary install-copy" onClick={copy}>
      <Copy size={14} aria-hidden />
      {copied ? "Copied" : "Copy the link"}
    </button>
  );
}

const STEP_ICONS: Record<IllustrationKey, ReactNode> = {
  "safari-compact-more": <MoreVertical size={15} aria-hidden />,
  "more-menu-share": <Share size={15} aria-hidden />,
  "sheet-view-more": <SquarePlus size={15} aria-hidden />,
  "safari-classic-share": <Share size={15} aria-hidden />,
  "chrome-share": <Share size={15} aria-hidden />,
  "menu-hamburger": <Menu size={15} aria-hidden />,
  "sheet-add-row": <SquarePlus size={15} aria-hidden />,
  "add-screen": <Check size={15} aria-hidden />,
  "generic-share": <Share size={15} aria-hidden />,
};

function walkthroughSteps(walk: Walkthrough): Step[] {
  return walk.steps.map((s, i) => ({
    icon: STEP_ICONS[s.illustration],
    text: (
      <>
        <strong>{s.title}.</strong> {s.caption}
      </>
    ),
    illustration: s.illustration,
    shot: SHOTS[`${walk.key}-${i + 1}`],
  }));
}

const IOS_OPEN_IN_SAFARI: Step[] = [
  {
    icon: <Compass size={15} aria-hidden />,
    text: (
      <>
        Tap <strong>⋯</strong> or the <strong>Safari</strong> (compass) icon — usually in a corner
        of the screen — and choose <strong>Open in Safari</strong>.
      </>
    ),
  },
  {
    icon: <Copy size={15} aria-hidden />,
    text: (
      <>
        Or copy the link and paste it into Safari’s address bar.
        <div>
          <CopyLinkButton />
        </div>
      </>
    ),
  },
];

const IOS_CANT_SEE_IT = (
  <details className="install-note">
    <summary>Can’t see “Add to Home Screen”?</summary>
    <p>
      You’re probably inside another app’s built-in browser (Gmail, Instagram and the like),
      which can’t add anything to the Home Screen. Tap <strong>⋯</strong> or the Safari icon
      and choose <strong>Open in Safari</strong>, or copy the link and paste it into Safari.
    </p>
    <CopyLinkButton />
  </details>
);

function androidMenuSteps(menuIcon: ReactNode, menuName: string, itemName: string): Step[] {
  return [
    {
      icon: menuIcon,
      text: (
        <>
          Tap the <strong>{menuName}</strong> menu.
        </>
      ),
    },
    {
      icon: <SquarePlus size={15} aria-hidden />,
      text: (
        <>
          Tap <strong>{itemName}</strong>.
        </>
      ),
    },
    {
      icon: <Check size={15} aria-hidden />,
      text: (
        <>
          Confirm with <strong>Install</strong> or <strong>Add</strong>.
        </>
      ),
    },
    {
      icon: <Smartphone size={15} aria-hidden />,
      text: <>Open Fornetto from your home screen or app drawer.</>,
    },
  ];
}

const BROWSER_NAMES: Record<string, string> = {
  chrome: "Chrome",
  firefox: "Firefox",
  edge: "Edge",
  samsung: "Samsung Internet",
  safari: "Safari",
};

export function buildGuide(platform: InstallPlatform | null, nativeAvailable: boolean): Guide {
  if (!platform) {
    return {
      title: "Add Fornetto to your home screen",
      lede: "Full screen, its own icon, and it opens in the shop even when the signal doesn’t.",
      steps: [],
    };
  }
  if (platform.standalone) {
    return {
      title: "You’re using the installed app",
      lede: "Fornetto is already on this device — there’s nothing else to do.",
      steps: [],
    };
  }

  const { os, browser } = platform;

  if (os === "ios") {
    const safariWalk = iosWalkthrough("safari", platform.ios);
    if (browser === "inapp") {
      return {
        title: "First, open this page in Safari",
        lede:
          "You’re in an app’s built-in browser, which can’t add anything to the Home Screen. Two ways out:",
        steps: IOS_OPEN_IN_SAFARI,
        then: { heading: "Then, in Safari", steps: walkthroughSteps(safariWalk) },
      };
    }
    if (browser === "chrome" && !chromeCanAddToHomeScreen(platform.ios)) {
      return {
        title: "First, open this page in Safari",
        lede: "Chrome on this version of iOS can’t add to the Home Screen — Safari can.",
        steps: IOS_OPEN_IN_SAFARI,
        then: { heading: "Then, in Safari", steps: walkthroughSteps(safariWalk) },
      };
    }
    const walk = iosWalkthrough(browser, platform.ios);
    const name = BROWSER_NAMES[browser] ?? "your browser";
    return {
      title: "Add Fornetto to your Home Screen",
      lede: walk.verified
        ? `${walk.steps.length === 4 ? "Four" : "Three"} taps in ${name}. About ten seconds.`
        : "Three taps. Your iPhone is on a newer iOS than we’ve checked, so the pictures may differ a little.",
      steps: walkthroughSteps(walk),
      note: IOS_CANT_SEE_IT,
      walkthrough: walk,
    };
  }

  if (os === "android") {
    if (browser === "inapp") {
      return {
        title: "First, open this page in Chrome",
        lede: "You’re in an app’s built-in browser, which can’t install anything.",
        steps: [
          {
            icon: <MoreVertical size={15} aria-hidden />,
            text: (
              <>
                Tap <strong>⋮</strong> and choose <strong>Open in Chrome</strong> (or “Open in
                browser”).
              </>
            ),
          },
          {
            icon: <Copy size={15} aria-hidden />,
            text: (
              <>
                Or copy the link and paste it into Chrome.
                <div>
                  <CopyLinkButton />
                </div>
              </>
            ),
          },
        ],
        then: {
          heading: "Then, in Chrome",
          steps: androidMenuSteps(<MoreVertical size={15} aria-hidden />, "⋮", "Add to Home screen"),
        },
      };
    }
    if (nativeAvailable) {
      return {
        title: "Install Fornetto",
        lede: "One tap — your browser does the rest.",
        steps: [
          {
            icon: <Download size={15} aria-hidden />,
            text: (
              <>
                Tap <strong>Install</strong> below and confirm.
              </>
            ),
          },
          {
            icon: <Smartphone size={15} aria-hidden />,
            text: <>Open Fornetto from your home screen or app drawer.</>,
          },
        ],
        note: (
          <p className="install-note">
            Nothing happened? Open the <strong>⋮</strong> menu and choose{" "}
            <strong>Add to Home screen</strong>.
          </p>
        ),
      };
    }
    if (browser === "samsung") {
      return {
        title: "Add Fornetto to your home screen",
        lede: "In Samsung Internet:",
        steps: androidMenuSteps(<Menu size={15} aria-hidden />, "≡", "Add page to → Home screen"),
      };
    }
    return {
      title: "Add Fornetto to your home screen",
      lede: `In ${BROWSER_NAMES[browser] ?? "your browser"}:`,
      steps: androidMenuSteps(
        <MoreVertical size={15} aria-hidden />,
        "⋮",
        browser === "firefox" ? "Install" : "Add to Home screen",
      ),
      note:
        browser === "chrome" ? (
          <p className="install-note">
            Already installed? Chrome hides the option — look for the Fornetto icon in your app
            drawer.
          </p>
        ) : undefined,
    };
  }

  // Desktop.
  const phoneNote = (
    <p className="install-note">
      Want it on your phone? Send yourself the link with <strong>Email me the link</strong> —
      under Install the app on the Account page, and on the install guide when signed in.
    </p>
  );
  if (browser === "chrome" || browser === "edge") {
    return {
      title: "Install Fornetto on this computer",
      lede: nativeAvailable
        ? "One click — the browser does the rest."
        : `${BROWSER_NAMES[browser]} installs web apps from the address bar.`,
      steps: [
        {
          icon: <Download size={15} aria-hidden />,
          text: nativeAvailable ? (
            <>
              Click <strong>Install</strong> below and confirm.
            </>
          ) : (
            <>
              Click the <strong>install icon</strong> at the right end of the address bar, or open
              the menu and choose <strong>Install Fornetto</strong>.
            </>
          ),
        },
      ],
      note: phoneNote,
    };
  }
  if (browser === "safari") {
    return {
      title: "Add Fornetto to your Dock",
      lede: "Safari on a Mac keeps web apps in the Dock.",
      steps: [
        {
          icon: <Share size={15} aria-hidden />,
          text: (
            <>
              Choose <strong>File → Add to Dock…</strong> (or Share → Add to Dock).
            </>
          ),
        },
      ],
      note: phoneNote,
    };
  }
  return {
    title: "Fornetto on your phone",
    lede: "This browser can’t install web apps, but your phone can — that’s where Fornetto earns its keep.",
    steps: [],
    note: phoneNote,
  };
}

function StepList({ steps }: { steps: Step[] }) {
  return (
    <ol className="install-steps">
      {steps.map((step, i) => (
        <li key={i} className="install-step">
          <span className="install-step-icon" aria-hidden>
            {step.icon}
          </span>
          <div className="install-step-text">
            {step.text}
            {step.shot ? (
              <figure className="install-shot">
                <Image
                  src={step.shot.src}
                  width={step.shot.width}
                  height={step.shot.height}
                  alt={step.shot.alt}
                  sizes="280px"
                />
              </figure>
            ) : (
              step.illustration && (
                <div className="install-figure install-figure--inline">
                  <Illustration name={step.illustration} />
                </div>
              )
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

interface InstallGuideProps {
  platform: InstallPlatform | null;
  nativeAvailable: boolean;
  variant: "sheet" | "page";
  titleId?: string;
  /** iPhone only: "Show me where to tap" hands the walkthrough to the coach. */
  onCoach?: (walkthrough: Walkthrough) => void;
}

export function InstallGuide({ platform, nativeAvailable, variant, titleId, onCoach }: InstallGuideProps) {
  const guide = buildGuide(platform, nativeAvailable);
  const Heading = variant === "page" ? "h1" : "h2";
  return (
    <div className="install-guide">
      <Heading id={titleId} className="install-title">
        {guide.title}
      </Heading>
      <p className="install-lede">{guide.lede}</p>
      {guide.walkthrough && onCoach && guide.walkthrough.coach.edge !== "none" && (
        <div className="install-actions" style={{ marginTop: 0, marginBottom: 18 }}>
          <button type="button" className="btn btn-primary" onClick={() => onCoach(guide.walkthrough!)}>
            Show me where to tap
          </button>
        </div>
      )}
      {guide.steps.length > 0 && <StepList steps={guide.steps} />}
      {guide.then && (
        <>
          <p className="install-subhead">{guide.then.heading}</p>
          <StepList steps={guide.then.steps} />
        </>
      )}
      {guide.note}
    </div>
  );
}
