"use client";

import { apiSend } from "./api";

// Fire-and-forget usage events, same contract as logPremiumCta: never awaited,
// never able to fail or slow a user-facing flow. The backend whitelists both
// the event name and the meta keys, so anything unrecognised is dropped there.

export function logEvent(type: string, meta?: Record<string, unknown>) {
  void apiSend("/events", {
    method: "POST",
    body: JSON.stringify({ type, meta }),
  }).catch(() => {
    // Best-effort — analytics must never break the thing it's measuring.
  });
}
