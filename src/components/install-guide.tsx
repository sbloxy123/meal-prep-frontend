"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import {
  Check,
  Compass,
  Copy,
  Download,
  Menu,
  MoreVertical,
  Share,
  Smartphone,
  SquarePlus,
} from "lucide-react";
import type { InstallPlatform } from "@/lib/install";

// The platform-specific "how to put Fornetto on your home screen" content,
// shared by the install sheet and the public /install page. iOS is the reason
// this exists: there is no prompt, so the steps *are* the install flow.
//
// Real iOS screenshots go in public/install/ and are wired up in SHOTS below;
// until they land the steps are icon-only.

interface Shot {
  src: string;
  width: number;
  height: number;
  alt: string;
}

const SHOTS: Partial<Record<"share" | "add" | "confirm", Shot>> = {};

interface Step {
  icon: ReactNode;
  text: ReactNode;
  shot?: Shot;
}

interface Guide {
  title: string;
  lede: ReactNode;
  steps: Step[];
  /** A second list, e.g. "Then, in Safari:" after the in-app escape. */
  then?: { heading: string; steps: Step[] };
  note?: ReactNode;
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

const SIGN_IN_STEP: Step = {
  icon: <Smartphone size={15} aria-hidden />,
  text: (
    <>
      Open Fornetto from your Home Screen and <strong>sign in once</strong>. The installed app
      keeps its own login, separate from the browser.
    </>
  ),
};

const IOS_SAFARI_STEPS: Step[] = [
  {
    icon: <Share size={15} aria-hidden />,
    text: (
      <>
        Tap the <strong>Share</strong> button — the square with an arrow pointing up, at the
        bottom of the screen.
      </>
    ),
    shot: SHOTS.share,
  },
  {
    icon: <SquarePlus size={15} aria-hidden />,
    text: (
      <>
        Scroll down the sheet and tap <strong>Add to Home Screen</strong>.
      </>
    ),
    shot: SHOTS.add,
  },
  {
    icon: <Check size={15} aria-hidden />,
    text: (
      <>
        Tap <strong>Add</strong>. If you see an “Open as Web App” switch, leave it on.
      </>
    ),
    shot: SHOTS.confirm,
  },
  SIGN_IN_STEP,
];

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
    if (browser === "inapp") {
      return {
        title: "First, open this page in Safari",
        lede:
          "You’re in an app’s built-in browser, which can’t add anything to the Home Screen. Two ways out:",
        steps: IOS_OPEN_IN_SAFARI,
        then: { heading: "Then, in Safari", steps: IOS_SAFARI_STEPS },
      };
    }
    if (browser === "safari" || browser === "other") {
      return {
        title: "Add Fornetto to your Home Screen",
        lede: "About ten seconds, right here in Safari.",
        steps: IOS_SAFARI_STEPS,
        note: IOS_CANT_SEE_IT,
      };
    }
    // Chrome / Firefox / Edge on iOS: same share sheet, differently placed.
    return {
      title: "Add Fornetto to your Home Screen",
      lede: `${BROWSER_NAMES[browser]} on iPhone can do this too — or open fornetto.app in Safari.`,
      steps: [
        {
          icon: <Share size={15} aria-hidden />,
          text: (
            <>
              Tap the <strong>Share</strong> icon — by the address bar, or inside the{" "}
              <strong>⋯</strong> menu.
            </>
          ),
        },
        ...IOS_SAFARI_STEPS.slice(1),
      ],
      note: IOS_CANT_SEE_IT,
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
            {step.shot && (
              <figure className="install-shot">
                <Image
                  src={step.shot.src}
                  width={step.shot.width}
                  height={step.shot.height}
                  alt={step.shot.alt}
                  sizes="280px"
                />
              </figure>
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
}

export function InstallGuide({ platform, nativeAvailable, variant, titleId }: InstallGuideProps) {
  const guide = buildGuide(platform, nativeAvailable);
  const Heading = variant === "page" ? "h1" : "h2";
  return (
    <div className="install-guide">
      <Heading id={titleId} className="install-title">
        {guide.title}
      </Heading>
      <p className="install-lede">{guide.lede}</p>
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
