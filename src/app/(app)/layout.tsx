"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { AppShell } from "@/components/app-shell";
import { MenuProvider } from "@/lib/menu";
import { ToastProvider } from "@/lib/toast";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/sign-in");
    }
  }, [session, isPending, router]);

  if (isPending || !session) return null;

  return (
    <MenuProvider>
      <ToastProvider>
        <AppShell>{children}</AppShell>
      </ToastProvider>
    </MenuProvider>
  );
}
