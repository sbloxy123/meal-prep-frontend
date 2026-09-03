"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
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
} from "@/lib/install";
import { InstallGuide } from "@/components/install-guide";

export type InstallSource = "auto" | "banner" | "button" | "account";

// The install prompt. A bottom sheet on phones, a dialog on desktop, showing
// the steps for *this* phone and browser (install-guide.tsx). Where the browser
// has a native install dialog (Chrome/Edge) the Install button fires it; on
// iOS, which has none, the steps are the whole flow.
//
// `source: "auto"` is the once-per-device auto-open (install-gate.tsx): its
// actions are "Remind me later" / "Don't show this again", and a plain close
// counts as later. Every other source is a manual open and just closes.
export function InstallSheet({
  source,
  onClose,
}: {
  source: InstallSource;
  onClose: (outcome: InstallOutcome) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const platform = usePlatform();
  const native = useNativeInstall();
  const [pending, setPending] = useState(false);
  const auto = source === "auto";
  const done = useRef(false);

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
      </div>
    </div>
  );
}
