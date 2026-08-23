import type { MetadataRoute } from "next";

// PWA manifest (§8.5) — installable on iOS + Android, opens standalone.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fornetto",
    short_name: "Fornetto",
    description: "The week's shopping, in order.",
    start_url: "/recipes",
    display: "standalone",
    background_color: "#f3f2f2",
    theme_color: "#f3f2f2",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
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
