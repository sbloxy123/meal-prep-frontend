import type { Metadata } from "next";
import { MarketingHome } from "@/components/marketing-home";

export const metadata: Metadata = {
  title: "About Fornetto — Plan the week. Shop it by aisle.",
  description:
    "How Fornetto works: pick a few recipes, tick what you're missing, and shop a list sorted into the order you walk the shop. Free, offline in the shop, installs on your phone.",
};

// Public, always-viewable version of the marketing page — no auth redirect — so
// existing (signed-in) users can revisit the tour. Linked from the app rail and
// the Account page.
export default function AboutPage() {
  return <MarketingHome />;
}
