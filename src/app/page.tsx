import type { Metadata } from "next";
import { MarketingHome } from "@/components/marketing-home";
import { RedirectIfAuthed } from "@/components/marketing-client";

const title = "Fornetto — Plan the week. Shop it by aisle.";
const description =
  "Pick a few recipes. Fornetto works out what you're actually missing, builds the shopping list for you, and sorts it into the order you walk the shop.";

export const metadata: Metadata = {
  title,
  description,
  // Child openGraph/twitter replace the root layout's wholesale, so re-declare
  // the image here to keep the share thumbnail on the (most-shared) homepage.
  openGraph: {
    type: "website",
    siteName: "Fornetto",
    title,
    description,
    url: "https://fornetto.app",
    images: [
      {
        url: "/home-desktop.png",
        width: 1437,
        height: 701,
        alt: "Fornetto — plan the week and shop it by aisle.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/home-desktop.png"],
  },
};

// Public marketing homepage. Signed-out visitors see it; signed-in visitors are
// bounced to /recipes by <RedirectIfAuthed>. The same page is also served,
// without the redirect, at /about for existing users to browse.
export default function HomePage() {
  return (
    <>
      <RedirectIfAuthed />
      <MarketingHome />
    </>
  );
}
