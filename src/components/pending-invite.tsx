"use client";

import { useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { useMenu } from "@/lib/menu";

export const PENDING_INVITE_KEY = "fornetto:pendingInvite";

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
      } catch {
        // Invite expired/invalid — nothing to do; they're signed in regardless.
      }
    })();
    // Run once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
