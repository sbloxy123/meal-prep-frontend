"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { AppShell } from "@/components/app-shell";
import { InstallBanner } from "@/components/install-banner";
import { InstallGate } from "@/components/install-gate";
import { PendingInvite } from "@/components/pending-invite";
import { PendingShare } from "@/components/pending-share";
import { OnboardingGate } from "@/components/onboarding-gate";
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
        {/* After the two hand-offs: both can change what the account looks
            like, and the gate defers while either is in flight. */}
        <OnboardingGate />
        {/* After the questionnaire: it yields to onboarding and never stacks
            on it (see install-gate.tsx). */}
        <InstallGate />
        <AppShell>
          <InstallBanner />
          {children}
        </AppShell>
      </ToastProvider>
    </MenuProvider>
  );
}
