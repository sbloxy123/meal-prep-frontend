"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";

/**
 * Client-only behaviour for the marketing homepage. Renders nothing.
 *
 * 1. Signed-in visitors hitting `/` are sent to `/recipes`. This runs after the
 *    marketing content has already painted, so it never gates the page for
 *    signed-out visitors (no auth wall — just a background session check).
 * 2. Progressive enhancement for the <details data-burger> menu: it already
 *    opens/closes without JS; this adds close-on-outside-click, close-on-panel-
 *    link, Escape (returning focus to the button), and auto-close above 900px.
 */
export function HomeEnhancements() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (!isPending && session) router.replace("/recipes");
  }, [session, isPending, router]);

  useEffect(() => {
    const burger = () =>
      document.querySelector<HTMLDetailsElement>("[data-burger]");

    const onClick = (e: MouseEvent) => {
      const d = burger();
      if (!d || !d.open) return;
      const target = e.target as Element;
      if (target.closest("[data-burger-panel] a")) {
        d.open = false;
        return;
      }
      if (!target.closest("[data-burger]")) d.open = false;
    };
    const onKey = (e: KeyboardEvent) => {
      const d = burger();
      if (e.key === "Escape" && d?.open) {
        d.open = false;
        d.querySelector<HTMLElement>("summary")?.focus();
      }
    };
    const onResize = () => {
      const d = burger();
      if (d?.open && window.innerWidth > 900) d.open = false;
    };

    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return null;
}
