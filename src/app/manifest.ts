import type { MetadataRoute } from "next";

// PWA manifest (§8.5) — installable on iOS + Android, opens standalone.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mise en Place",
    short_name: "Mise en Place",
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
  };
}
