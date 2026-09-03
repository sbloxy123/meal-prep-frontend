"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { X } from "lucide-react";
import { useModalA11y } from "@/lib/use-modal";
import {
  logInstall,
  promptNativeInstall,
  stopAutoPrompt,
  snoozeAutoPrompt,
  useNativeInstall,
  usePlatform,
  type InstallOutcome,
  type InstallPlatform,
} from "@/lib/install";
import { chromeCanAddToHomeScreen, iosWalkthrough, type Walkthrough } from "@/lib/ios-layouts";
import { InstallGuide, SHOTS } from "@/components/install-guide";
import { Illustration } from "@/components/install-illustrations";

export type InstallSource = "auto" | "banner" | "button" | "account";

// The install prompt. A bottom sheet on phones, a dialog on desktop.
//
// On an iPhone (any browser that can add to the Home Screen) it is a
// one-step-at-a-time walkthrough — offer → three big pictures → hand-off to
// the coach (install-coach.tsx), which points at the real button. Which
// pictures depends on the browser and iOS version (src/lib/ios-layouts.ts).
// Everywhere else it is the single-screen guide: Chrome/Edge get an Install
// button that fires the browser's own dialog; in-app browsers get "open in
// Safari".
//
// `source: "auto"` is the once-per-device auto-open (install-gate.tsx): its
// quiet actions are "Not now" / "Don't show this again", and a plain close
// counts as later. Every other source is a manual open and just closes.

/** Can this phone walk through Add to Home Screen right here? */
export function walkthroughFor(platform: InstallPlatform | null): Walkthrough | null {
  if (!platform || platform.os !== "ios" || platform.standalone) return null;
  if (platform.browser === "inapp") return null;
  if (platform.browser === "chrome" && !chromeCanAddToHomeScreen(platform.ios)) return null;
  return iosWalkthrough(platform.browser, platform.ios);
}

type Screen = "offer" | number;

export function InstallSheet({
  source,
  onClose,
  onCoach,
}: {
  source: InstallSource;
  onClose: (outcome: InstallOutcome) => void;
  onCoach?: (walkthrough: Walkthrough) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const platform = usePlatform();
  const native = useNativeInstall();
  const [pending, setPending] = useState(false);
  const [screen, setScreen] = useState<Screen>("offer");
  const auto = source === "auto";
  const done = useRef(false);
  const walk = walkthroughFor(platform);

  function finish(outcome: InstallOutcome) {
    if (done.current) return;
    done.current = true;
    if (auto) {
      if (outcome === "never") stopAutoPrompt();
      else if (outcome === "later" || outcome === "closed") snoozeAutoPrompt();
    }
    logInstall("install_prompt_outcome", platform, { outcome });
    onClose(outcome);
  }
  const close = () => finish(auto ? "later" : "closed");
  useModalA11y(ref, close);

  // Ref-guarded: dev StrictMode runs effects twice, and one showing is one row.
  const shownLogged = useRef(false);
  useEffect(() => {
    if (!platform || shownLogged.current) return;
    shownLogged.current = true;
    logInstall("install_prompt_shown", platform, { source });
  }, [platform, source]);

  async function install() {
    setPending(true);
    const result = await promptNativeInstall();
    setPending(false);
    if (result === "accepted") {
      finish("native_accepted");
      return;
    }
    // Dismissed (or gone): the guide re-renders with the manual steps, since
    // the native prompt is no longer on offer. Record it and stay open.
    logInstall("install_prompt_outcome", platform, { outcome: "native_dismissed" });
  }

  function handOff() {
    if (walk) onCoach?.(walk);
    finish("coach");
  }

  const step = walk && screen !== "offer" ? walk.steps[screen - 1] : null;
  const last = walk ? walk.steps.length : 0;
  const shot = walk && screen !== "offer" ? SHOTS[`${walk.key}-${screen}`] : undefined;

  return (
    <div
      className="install-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="install-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-title"
        ref={ref}
      >
        <div className="install-grip" aria-hidden />
        <button type="button" className="install-close" aria-label="Close" onClick={close}>
          <X size={18} aria-hidden />
        </button>

        {walk && screen === "offer" && (
          <>
            <div className="install-body">
              <div className="install-kicker">Takes about 10 seconds</div>
              <h2 id="install-title" className="install-title">
                Add Fornetto to your Home Screen
              </h2>
              <p className="install-lede">
                Full screen, its own icon, and it opens in the shop even when the signal doesn’t.
                {last === 4 ? " Four taps" : " Three taps"} — we’ll point at each one.
              </p>
              {!walk.verified && (
                <p className="install-note">
                  Your iPhone is on a newer iOS than we’ve checked, so the pictures may differ a
                  little.
                </p>
              )}
            </div>
            <div className="install-actions install-actions--stack">
              <button type="button" className="btn btn-primary btn-block" onClick={() => setScreen(1)}>
                Show me how
              </button>
              {auto && (
                <div className="install-quiet">
                  <button type="button" className="install-link" onClick={() => finish("later")}>
                    Not now
                  </button>
                  <button type="button" className="install-link" onClick={() => finish("never")}>
                    Don’t show this again
                  </button>
                </div>
              )}
            </div>
            <p className="install-foot">
              <Link href={`/install?from=${source}`} onClick={() => finish("guide")}>
                Prefer it written out? Open the full guide
              </Link>
            </p>
          </>
        )}

        {walk && step && screen !== "offer" && (
          <>
            <div className="install-body">
              <div className="install-dots" aria-label={`Step ${screen} of ${last}`}>
                {walk.steps.map((_, idx) => idx + 1).map((i) => (
                  <span key={i} className={i === screen ? "is-on" : i < screen ? "is-done" : ""} />
                ))}
              </div>
              <div className="install-figure">
                {shot ? (
                  <Image src={shot.src} width={shot.width} height={shot.height} alt={shot.alt} sizes="300px" />
                ) : (
                  <Illustration name={step.illustration} />
                )}
              </div>
              <h2 id="install-title" className="install-title">
                <span className="install-step-n">{screen}</span> {step.title}
              </h2>
              <p className="install-lede">{step.caption}</p>
            </div>
            <div className="install-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setScreen(screen === 1 ? "offer" : screen - 1)}
              >
                Back
              </button>
              {screen < last ? (
                <button type="button" className="btn btn-primary" onClick={() => setScreen(screen + 1)}>
                  Next
                </button>
              ) : (
                <button type="button" className="btn btn-primary" onClick={handOff}>
                  Got it — point me at it
                </button>
              )}
            </div>
          </>
        )}

        {!walk && (
          <>
            <div className="install-body">
              <div className="install-kicker">On your phone</div>
              <InstallGuide
                platform={platform}
                nativeAvailable={native.available}
                variant="sheet"
                titleId="install-title"
              />
            </div>
            <div className="install-actions">
              {native.available && (
                <button type="button" className="btn btn-primary" onClick={install} disabled={pending}>
                  {pending ? "Installing…" : "Install"}
                </button>
              )}
              {auto ? (
                <>
                  <button type="button" className="btn btn-secondary" onClick={() => finish("later")}>
                    Remind me later
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => finish("never")}>
                    Don’t show this again
                  </button>
                </>
              ) : (
                <button type="button" className="btn btn-secondary" onClick={() => finish("closed")}>
                  Done
                </button>
              )}
            </div>
            <p className="install-foot">
              <Link href={`/install?from=${source}`} onClick={() => finish("guide")}>
                Open the full step-by-step guide
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
