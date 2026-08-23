import Image from "next/image";
import { Image as ImageIcon } from "lucide-react";
import { cloudinaryLoader } from "@/lib/cloudinary";
import { isStockPhoto, stockPhotoCredit } from "@/lib/starter-recipes";

interface RecipeImageProps {
  src?: string | null;
  alt?: string;
  /** Per-usage width hint for Cloudinary/srcset: card 400, hero 1200, dialog 400. */
  sizes: string;
  iconSize?: number;
  /** On large views (detail hero) show the "add your own photo" nudge + the
      photographer credit for seed stock images. */
  showStockHint?: boolean;
}

// Renders a recipe photo through Cloudinary, or the bordered placeholder icon
// when there's no image (§9.6). Seed "stock" photos (from the starter-recipes
// Cloudinary folder) are blurred and — on large views — carry a nudge to upload
// a real photo plus the Unsplash photographer credit along the bottom.
// Expects a sized, positioned parent (.recipe-photo / .detail-hero / .sc-photo).
export function RecipeImage({ src, alt = "", sizes, iconSize = 22, showStockHint = false }: RecipeImageProps) {
  if (!src) return <ImageIcon size={iconSize} aria-hidden />;
  const stock = isStockPhoto(src);
  const credit = stock ? stockPhotoCredit(src) : null;
  return (
    <>
      <Image
        loader={cloudinaryLoader}
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className={stock ? "recipe-img recipe-img--stock" : "recipe-img"}
        style={{ objectFit: "cover" }}
      />
      {stock && showStockHint && (
        <div className="stock-overlay">
          <span className="stock-hint">Add your own photo for the best look</span>
          {credit && (
            <a
              className="stock-credit"
              href={credit.link}
              target="_blank"
              rel="noopener noreferrer"
            >
              Photo: {credit.name} / Unsplash
            </a>
          )}
        </div>
      )}
    </>
  );
}
