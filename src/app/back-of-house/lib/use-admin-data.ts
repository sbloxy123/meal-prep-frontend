"use client";

import { useEffect, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api";

// One fetch hook for every tab. A 404 means an older backend without that
// endpoint — the tab shows its empty state rather than bouncing (the shell's
// overview fetch is the auth gate; 401/403 are handled there). Results are
// cached per path for the life of the page so switching tabs doesn't refetch.

const cache = new Map<string, unknown>();

export function useAdminData<T>(path: string | null, deps: readonly unknown[] = []) {
  const [data, setData] = useState<T | null>(() => (path && cache.has(path) ? (cache.get(path) as T) : null));
  const [loading, setLoading] = useState<boolean>(() => Boolean(path && !cache.has(path)));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!path) return;
    if (cache.has(path)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setData(cache.get(path) as T);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiFetch<T>(path)
      .then((d) => {
        cache.set(path, d);
        if (!cancelled) setData(d);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) setData(null);
        else setError("Couldn’t load this panel.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps]);

  return { data, loading, error, refresh: () => { if (path) cache.delete(path); } };
}

/** Drop everything cached (e.g. when the range changes). */
export function clearAdminCache() {
  cache.clear();
}
