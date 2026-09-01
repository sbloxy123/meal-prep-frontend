"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { AppShell } from "@/components/app-shell";
import { IosInstallHint } from "@/components/ios-install-hint";
import { PendingInvite } from "@/components/pending-invite";
import { PendingShare } from "@/components/pending-share";
import { MenuProvider } from "@/lib/menu";
import { ToastProvider } from "@/lib/toast";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/sign-in");
    }
  }, [session, isPending, router]);

  // Remember where we came from. The recipes list uses this to tell "back from a
  // recipe" (restore the scroll position you left) from arriving fresh via the
  // nav (start at the top). This layout outlives each page, so the trail is
  // written after the page it describes has already mounted.
  useEffect(() => {
    try {
      const current = sessionStorage.getItem("nav:current");
      if (current && current !== pathname) sessionStorage.setItem("nav:prev", current);
      sessionStorage.setItem("nav:current", pathname);
    } catch {
      // Private-mode storage failures just mean no restoration.
    }
  }, [pathname]);

  if (isPending || !session) return null;

  return (
    <MenuProvider>
      <ToastProvider>
        <PendingInvite />
        <PendingShare />
        <AppShell>
          <IosInstallHint />
          {children}
        </AppShell>
      </ToastProvider>
    </MenuProvider>
  );
}
