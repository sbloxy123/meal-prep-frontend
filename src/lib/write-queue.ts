"use client";

import { useEffect, useState } from "react";
import { ApiError, apiSend } from "./api";

// Offline write queue (§8.5b). Writes are optimistic; if one fails because the
// device is offline it's parked in localStorage and retried on reconnect (the
// `online` event) and on a periodic tick. NOT the Background Sync API — Safari
// lacks it. A quiet status line ("offline · N changes will sync") surfaces the
// queue; there's never a blocking modal.

interface QueuedWrite {
  id: string;
  path: string;
  method: string;
  body?: string;
}

const KEY = "mise:write-queue";
let queue: QueuedWrite[] = [];
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded) return;
  loaded = true;
  try {
    queue = JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    queue = [];
  }
}

function persist() {
  localStorage.setItem(KEY, JSON.stringify(queue));
  listeners.forEach((l) => l());
}

// Retry (queue) a write that failed for a transient reason: a dropped
// connection (fetch → TypeError), a gateway/5xx, or a 401 (a stale cookie that
// a re-auth will fix). A definitive 4xx (400/404) is permanent — don't retry.
function isTransient(err: unknown): boolean {
  if (err instanceof TypeError) return true;
  if (err instanceof ApiError) return err.status >= 500 || err.status === 401;
  return false;
}

export function pendingCount(): number {
  return queue.length;
}

export function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Send a write; on an offline failure, queue it and keep the optimistic UI. */
export async function queuedSend(path: string, init: { method: string; body?: string }): Promise<void> {
  load();
  try {
    await apiSend(path, init);
  } catch (err) {
    if (isTransient(err)) {
      queue.push({ id: crypto.randomUUID(), path, method: init.method, body: init.body });
      persist();
    }
    // A permanent 4xx is not retryable — drop it.
  }
}

export async function flushQueue(): Promise<void> {
  load();
  while (queue.length) {
    const w = queue[0];
    try {
      await apiSend(w.path, { method: w.method, body: w.body });
      queue.shift();
      persist();
    } catch (err) {
      if (isTransient(err)) return; // still failing transiently — stop and wait
      queue.shift(); // permanent rejection — drop it
      persist();
    }
  }
}

if (typeof window !== "undefined") {
  load();
  window.addEventListener("online", () => void flushQueue());
  setInterval(() => {
    if (navigator.onLine) void flushQueue();
  }, 15000);
}

export function useWriteQueue(): { pending: number; offline: boolean } {
  const [pending, setPending] = useState(0);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sync = () => setPending(pendingCount());
    const on = () => {
      setOffline(false);
      void flushQueue();
    };
    const off = () => setOffline(true);
    const unsub = subscribe(sync);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    // Initialise from the queue + connection state on mount.
    /* eslint-disable react-hooks/set-state-in-effect */
    sync();
    setOffline(!navigator.onLine);
    /* eslint-enable react-hooks/set-state-in-effect */
    return () => {
      unsub();
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  return { pending, offline };
}
