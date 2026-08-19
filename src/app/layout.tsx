import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
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
// Generated list / shopping mode.
import "../styles/shop.css";
// Add / edit recipe form.
import "../styles/recipe-form.css";
// Auth screens (sign in / up, verify, reset).
import "../styles/auth.css";
// Undo toasts.
import "../styles/toast.css";

export const metadata: Metadata = {
  title: "Mise en Place",
  description: "The week's shopping, in order.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon-192.png", apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Mise en Place", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#f3f2f2",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
