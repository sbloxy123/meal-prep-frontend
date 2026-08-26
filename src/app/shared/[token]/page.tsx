import type { Metadata } from "next";
import SharedRecipeClient from "./shared-recipe-client";

const SHARE_DESCRIPTION = "A recipe shared with you on Fornetto — sign in to view and save it.";
const FALLBACK_IMAGE = "/home-desktop.png";

// Public meta endpoint (no auth) so link unfurlers can read the recipe title/image.
// The full preview + save flow stay auth-guarded; see shared-recipe-client.tsx.
async function fetchMeta(token: string): Promise<{ title: string; image_url?: string | null } | null> {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) return null;
  try {
    const res = await fetch(`${base}/shared-recipe/${token}/meta`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const meta = await fetchMeta(token);

  const title = meta?.title ? `${meta.title} · Shared on Fornetto` : "Shared recipe · Fornetto";
  const image = meta?.image_url || FALLBACK_IMAGE;

  return {
    title,
    description: SHARE_DESCRIPTION,
    openGraph: {
      type: "article",
      siteName: "Fornetto",
      title,
      description: SHARE_DESCRIPTION,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: SHARE_DESCRIPTION,
      images: [image],
    },
  };
}

export default async function SharedRecipePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <SharedRecipeClient token={token} />;
}
