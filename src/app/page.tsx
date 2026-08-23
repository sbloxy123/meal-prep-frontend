import type { Metadata } from "next";
import { MarketingHome } from "@/components/marketing-home";
import { RedirectIfAuthed } from "@/components/marketing-client";

export const metadata: Metadata = {
  title: "Fornetto — Plan the week. Shop it by aisle.",
  description:
    "Pick a few recipes. Fornetto works out what you're actually missing, builds the shopping list for you, and sorts it into the order you walk the shop.",
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
