"use client";

import { MAX_VERIFIED_IOS } from "@/lib/ios-layouts";
import type { AdminTotals } from "@/lib/types";

/** The stale-layout alarm: phones on an iOS newer than the Add to Home Screen
    walkthrough has been verified on. Clears itself once a frontend build with a
    higher MAX_VERIFIED_IOS (src/lib/ios-layouts.ts) has been seen. */
export function StaleLayoutNotice({ install }: { install: NonNullable<AdminTotals["install"]> }) {
  const verified = install.maxVerifiedIos ?? MAX_VERIFIED_IOS;
  const newer = (install.unverifiedIos ?? []).filter((r) => r.major > Math.max(verified, MAX_VERIFIED_IOS));
  if (newer.length === 0) return null;
  return (
    <div className="admin-notice" role="alert">
      <strong>Check the Add to Home Screen walkthrough.</strong>{" "}
      {newer.map((r) => (
        <span key={r.major}>
          iOS {r.major} seen on {r.devices} device{r.devices === 1 ? "" : "s"} since{" "}
          {new Date(r.firstSeen).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}.{" "}
        </span>
      ))}
      The walkthrough is verified up to iOS {Math.max(verified, MAX_VERIFIED_IOS)} — those users get the
      generic wording. Open Fornetto on the new iOS in Safari and Chrome, check where Share / ••• /
      Add to Home Screen are, then update <code>src/lib/ios-layouts.ts</code>.
    </div>
  );
}
