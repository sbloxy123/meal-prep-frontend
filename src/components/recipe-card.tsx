"use client";

import Link from "next/link";
import { Star, Trash2 } from "lucide-react";
import type { Recipe } from "@/lib/types";
import { RecipeImage } from "@/components/recipe-image";

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
  /** Fired as the recipe is opened, so the list can save where the reader was. */
  onOpen?: () => void;
  /** Omitted where deleting from a list would be the wrong offer (the week's
      menu, say) — the button only appears when a handler is given. */
  onDelete?: (recipe: Recipe) => void;
}

/** Placeholder shown while the next batch of the list is revealed, so the lazy
    loading reads as loading rather than as a list that just stops. Mirrors the
    card's shape (the photo block is a fixed size) to keep the swap steady. */
export function RecipeCardSkeleton() {
  return (
    <article className="recipe recipe-skel" aria-hidden>
      <div className="recipe-photo recipe-skel-shimmer" />
      <div className="recipe-content">
        <div className="recipe-skel-line recipe-skel-shimmer" style={{ width: "70%" }} />
        <div className="recipe-skel-line recipe-skel-shimmer" style={{ width: "45%" }} />
        <div className="recipe-skel-btn recipe-skel-shimmer" />
      </div>
    </article>
  );
}

export function RecipeCard({
  recipe,
  tags,
  onToggleFavorite,
  isOnMenu,
  onAddToWeek,
  onEditStockCheck,
  onRemoveFromWeek,
  onOpen,
  onDelete,
}: RecipeCardProps) {
  const href = `/recipes/${recipe.id}`;
  const onMenu = isOnMenu ?? recipe.is_on_menu;
  return (
    <article className={`recipe${onMenu ? " recipe--on-menu" : ""}`}>
      <Link href={href} className="recipe-photo" aria-label={recipe.title} onClick={onOpen}>
        <RecipeImage src={recipe.image_url} sizes="(min-width: 1024px) 400px, 76px" />
      </Link>

      <div className="recipe-content">
        <div className="recipe-head">
          <Link href={href} className="recipe-title" onClick={onOpen}>
            {recipe.title}
          </Link>
          <div className="recipe-actions">
            <button
              type="button"
              className="recipe-fav"
              aria-pressed={recipe.favorite}
              aria-label={recipe.favorite ? "Remove from favourites" : "Add to favourites"}
              onClick={() => onToggleFavorite(recipe.id, !recipe.favorite)}
            >
              <Star size={16} fill={recipe.favorite ? "currentColor" : "none"} aria-hidden />
            </button>
            {onDelete && (
              /* Titled per recipe: in a list of these, "Delete recipe" alone
                 tells a screen-reader user nothing about which one. */
              <button
                type="button"
                className="recipe-del"
                aria-label={`Delete ${recipe.title}`}
                onClick={() => onDelete(recipe)}
              >
                <Trash2 size={16} aria-hidden />
              </button>
            )}
          </div>
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

        {recipe.calories != null && (
          <div className="recipe-macros">
            {[
              `${recipe.calories} kcal${recipe.servings != null ? "/serving" : ""}`,
              recipe.protein_g != null ? `P ${recipe.protein_g}g` : null,
              recipe.carb_g != null ? `C ${recipe.carb_g}g` : null,
              recipe.fat_g != null ? `F ${recipe.fat_g}g` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
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
