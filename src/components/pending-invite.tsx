"use client";

import { useEffect } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { useMenu } from "@/lib/menu";

export const PENDING_INVITE_KEY = "fornetto:pendingInvite";

// True while an invite is being redeemed. The onboarding gate checks this so a
// new member joining an existing household isn't interrupted by the
// questionnaire mid-join. It can't read the localStorage key itself: this
// component's effect runs first and consumes the key before the gate mounts.
let consuming = false;
export const isConsumingInvite = () => consuming;

// Consumes an invite token stashed by the /household/join page when the invitee
// wasn't signed in. Runs once on the first authenticated page load — so however
// they authenticate (sign in, or sign up → verify → auto sign-in), they land
// already joined instead of having to reopen the invite link.
export function PendingInvite() {
  const toast = useToast();
  const menu = useMenu();

  useEffect(() => {
    const token = localStorage.getItem(PENDING_INVITE_KEY);
    if (!token) return;
    localStorage.removeItem(PENDING_INVITE_KEY);
    consuming = true;
    (async () => {
      try {
        const res = await apiFetch<{ household_name?: string; alreadyMember?: boolean }>(
          "/household/accept",
          { method: "POST", body: JSON.stringify({ token }) },
        );
        await menu.refresh();
        toast.show(
          res?.alreadyMember
            ? "You're already in that household."
            : `Joined ${res?.household_name ?? "the household"}.`,
        );
      } catch (err) {
        // Expired/invalid invites are silent; a full household or a payer who
        // can't move gets told why, since they came here to join.
        if (err instanceof ApiError && (err.status === 402 || err.status === 409)) {
          try {
            const body = JSON.parse(err.body) as { message?: string };
            if (body?.message) toast.show(body.message);
          } catch {
            // ignore
          }
        }
      } finally {
        consuming = false;
      }
    })();
    // Run once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
