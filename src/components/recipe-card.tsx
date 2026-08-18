"use client";

import Link from "next/link";
import { Star, Image as ImageIcon } from "lucide-react";
import type { Recipe } from "@/lib/types";

interface RecipeCardProps {
  recipe: Recipe;
  tags: string[];
  onToggleFavorite: (id: number, next: boolean) => void;
  // On-menu state comes from the MenuProvider (authoritative after mutations);
  // falls back to the recipe's own flag before it loads.
  isOnMenu?: boolean;
  onAddToWeek?: (recipe: Recipe) => void;
  onEditStockCheck?: (recipe: Recipe) => void;
  onRemoveFromWeek?: (recipe: Recipe) => void;
}

export function RecipeCard({
  recipe,
  tags,
  onToggleFavorite,
  isOnMenu,
  onAddToWeek,
  onEditStockCheck,
  onRemoveFromWeek,
}: RecipeCardProps) {
  const href = `/recipes/${recipe.id}`;
  const onMenu = isOnMenu ?? recipe.is_on_menu;
  return (
    <article className={`recipe${onMenu ? " recipe--on-menu" : ""}`}>
      <Link href={href} className="recipe-photo" aria-label={recipe.title}>
        {recipe.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- next/image + Cloudinary loader lands in step 8
          <img src={recipe.image_url} alt="" />
        ) : (
          <ImageIcon size={22} aria-hidden />
        )}
      </Link>

      <div className="recipe-content">
        <div className="recipe-head">
          <Link href={href} className="recipe-title">
            {recipe.title}
          </Link>
          <button
            type="button"
            className="recipe-fav"
            aria-pressed={recipe.favorite}
            aria-label={recipe.favorite ? "Remove from favourites" : "Add to favourites"}
            onClick={() => onToggleFavorite(recipe.id, !recipe.favorite)}
          >
            <Star size={16} fill={recipe.favorite ? "currentColor" : "none"} aria-hidden />
          </button>
        </div>

        {tags.length > 0 && (
          <div className="recipe-tags">
            {tags.map((tag) => (
              <span key={tag} className="tag tag-neutral">
                {tag}
              </span>
            ))}
          </div>
        )}

        {onMenu ? (
          <div className="recipe-onmenu">
            <span className="recipe-onmenu-label">On this week</span>
            <span className="recipe-onmenu-rule" />
            <button
              type="button"
              className="btn btn-ghost recipe-edit"
              onClick={() => onEditStockCheck?.(recipe)}
            >
              Edit<span className="recipe-edit-suffix"> stock check</span>
            </button>
            <button
              type="button"
              className="recipe-remove"
              onClick={() => onRemoveFromWeek?.(recipe)}
            >
              Remove
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn recipe-add"
            onClick={() => onAddToWeek?.(recipe)}
          >
            Add to this week
          </button>
        )}
      </div>
    </article>
  );
}
