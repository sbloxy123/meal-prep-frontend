import Image from "next/image";
import { Image as ImageIcon } from "lucide-react";
import { cloudinaryLoader } from "@/lib/cloudinary";

interface RecipeImageProps {
  src?: string | null;
  alt?: string;
  /** Per-usage width hint for Cloudinary/srcset: card 400, hero 1200, dialog 400. */
  sizes: string;
  iconSize?: number;
}

// Renders a recipe photo through Cloudinary, or the bordered placeholder icon
// when there's no image (the normal case, §9.6). Expects a sized, positioned
// parent (the .recipe-photo / .detail-hero / .sc-photo containers).
export function RecipeImage({ src, alt = "", sizes, iconSize = 22 }: RecipeImageProps) {
  if (!src) return <ImageIcon size={iconSize} aria-hidden />;
  return (
    <Image
      loader={cloudinaryLoader}
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      style={{ objectFit: "cover" }}
    />
  );
}
