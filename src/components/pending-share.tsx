"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { useMenu } from "@/lib/menu";

export const PENDING_SHARE_KEY = "fornetto:pendingShare";

// True while a shared recipe is being saved — see the note on
// isConsumingInvite. Stops the onboarding questionnaire opening over a share
// hand-off that's about to navigate away.
let consuming = false;
export const isConsumingShare = () => consuming;

// Consumes a share token stashed by the /shared/[token] page when the recipient
// wasn't signed in. Runs once on the first authenticated load — so after they
// sign in / sign up, the shared recipe is copied into their account and they
// land on it, instead of having to reopen the share link.
export function PendingShare() {
  const toast = useToast();
  const menu = useMenu();
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem(PENDING_SHARE_KEY);
    if (!token) return;
    localStorage.removeItem(PENDING_SHARE_KEY);
    consuming = true;
    (async () => {
      try {
        const res = await apiFetch<{ id: number }>(`/shared-recipe/${token}/save`, {
          method: "POST",
        });
        await menu.refresh();
        toast.show("Recipe saved to your recipes.");
        if (res?.id) router.push(`/recipes/${res.id}`);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          toast.show("That share link is no longer valid.");
        }
        // Otherwise stay put; they're signed in regardless.
      } finally {
        consuming = false;
      }
    })();
    // Run once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
