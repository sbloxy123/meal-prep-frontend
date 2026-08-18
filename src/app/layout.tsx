import type { Metadata } from "next";
import "./globals.css";
// Vendored design system — tokens, type (Cormorant Garamond + Lora via its own
// Google Fonts @import) and component classes. Imported after globals.css so
// its custom properties and base styles win over Tailwind's preflight.
import "../styles/classical.css";
// App shell chrome (rail, tab bar, page header) — lays out the design tokens.
import "../styles/shell.css";
// Recipes list + detail styling.
import "../styles/recipes.css";
// Stock check, This week tray / column / screen.
import "../styles/week.css";
// Draft shopping list.
import "../styles/shopping.css";

export const metadata: Metadata = {
  title: "Mise en Place",
  description: "The week's shopping, in order.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
