import type { MetadataRoute } from "next";

// PWA manifest (§8.5) — installable on iOS + Android, opens standalone.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fornetto",
    short_name: "Fornetto",
    description: "The week's shopping, in order.",
    id: "/",
    scope: "/",
    start_url: "/recipes",
    display: "standalone",
    background_color: "#f3f2f2",
    theme_color: "#f3f2f2",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Chrome's richer install dialog (Android + desktop) needs one screenshot
    // per form factor; without them it falls back to the bare mini-prompt.
    // Ratios must stay within 2.3:1 — the marketing shots that fit.
    screenshots: [
      {
        src: "/home-this-week.jpg",
        sizes: "1440x2928",
        type: "image/jpeg",
        form_factor: "narrow",
        label: "This week's menu and stock check",
      },
      {
        src: "/home-desktop.png",
        sizes: "1437x701",
        type: "image/png",
        form_factor: "wide",
        label: "Recipe library on desktop",
      },
    ],
    // Android share target: lets an installed PWA receive a link/caption shared
    // from Instagram/TikTok/YouTube → opens /recipes/new, which auto-runs the
    // social import. (iOS Safari doesn't support share_target — no effect there;
    // not in Next's Manifest type yet, hence the cast.)
    share_target: {
      action: "/recipes/new",
      method: "GET",
      enctype: "application/x-www-form-urlencoded",
      params: { title: "title", text: "text", url: "url" },
    },
  } as MetadataRoute.Manifest;
}
