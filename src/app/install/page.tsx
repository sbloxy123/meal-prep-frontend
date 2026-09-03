import type { Metadata } from "next";
import { Suspense } from "react";
import { InstallPage } from "@/components/install-page";

export const metadata: Metadata = {
  title: "Install Fornetto on your phone",
  description:
    "Put Fornetto on your home screen: Share → Add to Home Screen on iPhone, Install on Android. Full screen, its own icon, and it opens in the shop even without signal.",
};

// Public and outside both route groups (like /about): no auth gate, so the link
// in the install email works on a phone that has never signed in.
export default function InstallRoute() {
  return (
    <Suspense>
      <InstallPage />
    </Suspense>
  );
}
