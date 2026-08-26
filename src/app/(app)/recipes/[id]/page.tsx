"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Star, ChevronLeft, Share2 } from "lucide-react";
import { RecipeImage } from "@/components/recipe-image";
import { RecipeMacros } from "@/components/recipe-macros";
import { ApiError, apiFetch, apiSend } from "@/lib/api";
import type { RecipeDetail } from "@/lib/types";
import { parseInstructions } from "@/lib/instructions";
import { useMenu } from "@/lib/menu";
import { useToast } from "@/lib/toast";
import { useSession } from "@/lib/auth-client";
import { attributionLabel } from "@/lib/who";

type LoadState =
  | { status: "loading" }
  | { status: "notfound" }
  | { status: "error"; message: string }
  | { status: "ready"; recipe: RecipeDetail };

function formatQuantity(quantity: number | string | null, unit: string | null): string {
  if (quantity == null || quantity === "") return "";
  // Postgres numeric comes back like "500.00" / "1.50" — drop trailing zeros.
  // A 0 quantity means "unspecified" (blank in the form), so show nothing.
  const n = Number(quantity);
  if (n === 0) return "";
  const value = Number.isFinite(n) ? String(n) : String(quantity);
  return unit ? `${value} ${unit}` : value;
}

export default function RecipeDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const menu = useMenu();
  const toast = useToast();
  const { data: session } = useSession();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiFetch<RecipeDetail>(`/recipes/${id}`)
      .then((recipe) => {
        if (!cancelled) setState({ status: "ready", recipe });
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) setState({ status: "notfound" });
        else setState({ status: "error", message: err.message });
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  function toggleFavorite(next: boolean) {
    if (state.status !== "ready") return;
    setState({ status: "ready", recipe: { ...state.recipe, favorite: next } });
    apiSend(`/recipes/${id}/favorite`, {
      method: "PUT",
      body: JSON.stringify({ favorite: next }),
    }).catch(() => {
      setState((cur) =>
        cur.status === "ready"
          ? { status: "ready", recipe: { ...cur.recipe, favorite: !next } }
          : cur,
      );
    });
  }

  async function share() {
    if (sharing) return;
    setSharing(true);
    try {
      const { token } = await apiFetch<{ token: string }>(`/recipes/${id}/share`, { method: "POST" });
      const url = `${window.location.origin}/shared/${token}`;
      const nav = window.navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
      if (nav.share) {
        await nav.share({ title: state.status === "ready" ? state.recipe.title : "Recipe", url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.show("Share link copied");
      }
    } catch (err) {
      // User dismissing the native share sheet throws AbortError — ignore that.
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast.show("Couldn’t create a share link");
    } finally {
      setSharing(false);
    }
  }

  const backLink = (
    <div className="detail-topbar">
      <Link href="/recipes" className="detail-back">
        <ChevronLeft size={15} aria-hidden />
        Recipes
      </Link>
      {state.status === "ready" && (
        <Link href={`/recipes/${id}/edit`} className="btn btn-ghost detail-edit">
          Edit
        </Link>
      )}
    </div>
  );

  if (state.status === "loading") {
    return (
      <div className="detail">
        {backLink}
        <div className="page-body">
          <p className="text-muted">Loading recipe…</p>
        </div>
      </div>
    );
  }

  if (state.status === "notfound") {
    return (
      <div className="detail">
        {backLink}
        <div className="page-body" style={{ textAlign: "center", marginTop: 40 }}>
          <h3 style={{ fontWeight: 400 }}>Recipe not found</h3>
          <p className="text-muted" style={{ fontSize: 14 }}>
            It may have been deleted.
          </p>
          <Link href="/recipes" className="btn btn-primary" style={{ marginTop: 8 }}>
            Back to recipes
          </Link>
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="detail">
        {backLink}
        <div className="page-body">
          <p style={{ color: "var(--color-accent-700)" }}>{state.message}</p>
        </div>
      </div>
    );
  }

  const recipe = state.recipe;
  const tags = (recipe.recipe_tags ?? []).map((t) => t.tag_name);
  const ingredients = recipe.recipe_ingredients ?? [];
  const steps = parseInstructions(recipe.instructions);

  const metaParts: string[] = [];
  if (recipe.servings != null) metaParts.push(`Serves ${recipe.servings}`);
  if (recipe.prep_time_minutes != null) metaParts.push(`Prep ${recipe.prep_time_minutes} min`);
  if (recipe.cook_time_minutes != null) metaParts.push(`Cook ${recipe.cook_time_minutes} min`);
  metaParts.push(`${ingredients.length} ingredient${ingredients.length === 1 ? "" : "s"}`);

  const author = menu.householdShared
    ? attributionLabel(recipe.created_by_name, recipe.user_id, session?.user.id)
    : null;

  return (
    <div className="detail">
      {backLink}

      <div className="detail-hero">
        <RecipeImage
          src={recipe.image_url}
          alt={recipe.title}
          sizes="(min-width: 1024px) 1200px, 100vw"
          iconSize={30}
          showStockHint
        />
      </div>

      <div className="detail-head">
        {tags.length > 0 && (
          <div className="detail-tags">
            {tags.map((tag) => (
              <span key={tag} className="tag tag-neutral">
                {tag}
              </span>
            ))}
          </div>
        )}
        <h1 className="detail-title">{recipe.title}</h1>
        <div className="detail-meta">
          {metaParts.map((part) => (
            <span key={part}>{part}</span>
          ))}
        </div>
        {author && <div className="detail-by text-muted">Added by {author}</div>}
      </div>

      <div className="detail-body">
        <RecipeMacros
          calories={recipe.calories}
          protein_g={recipe.protein_g}
          carb_g={recipe.carb_g}
          fat_g={recipe.fat_g}
          estimated={recipe.macros_source === "estimated"}
        />

        {recipe.description && <p className="detail-para" style={{ textAlign: "left" }}>{recipe.description}</p>}

        <h6 style={{ margin: 0 }}>Ingredients</h6>
        {ingredients.length > 0 ? (
          <ul className="detail-ingredients">
            {ingredients.map((ing, i) => {
              const qty = formatQuantity(ing.quantity, ing.unit);
              return (
                <li key={`${ing.name}-${i}`}>
                  {qty && <span className="detail-ing-qty">{qty} </span>}
                  {ing.name}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-muted" style={{ fontSize: 14 }}>No ingredients listed.</p>
        )}

        <hr className="hr" style={{ margin: "2px 0" }} />

        <h6 style={{ margin: 0 }}>Method</h6>
        {steps.length >= 2 ? (
          <ol className="detail-steps">
            {steps.map((step, i) => (
              <li key={i} className="detail-step">
                <span className="detail-step-n">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        ) : steps.length === 1 ? (
          <p className="detail-para">{steps[0]}</p>
        ) : (
          <p className="text-muted" style={{ fontSize: 14 }}>No method added.</p>
        )}

        {recipe.link_url && (
          <a href={recipe.link_url} target="_blank" rel="noopener noreferrer" className="detail-source">
            Original recipe ↗
          </a>
        )}
      </div>

      <div className="detail-actions">
        <button
          type="button"
          className="btn btn-secondary btn-icon detail-fav"
          aria-pressed={recipe.favorite}
          aria-label={recipe.favorite ? "Remove from favourites" : "Add to favourites"}
          onClick={() => toggleFavorite(!recipe.favorite)}
        >
          <Star size={18} fill={recipe.favorite ? "currentColor" : "none"} aria-hidden />
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-icon detail-share"
          aria-label="Share recipe"
          onClick={share}
          disabled={sharing}
        >
          <Share2 size={18} aria-hidden />
        </button>
        <button
          type="button"
          className="btn btn-primary detail-add"
          onClick={() =>
            menu.openStockCheck({
              id: recipe.id,
              title: recipe.title,
              image_url: recipe.image_url,
            })
          }
        >
          {(menu.loaded ? menu.onMenuIds.has(recipe.id) : recipe.is_on_menu)
            ? "Edit stock check"
            : "Add to this week"}
        </button>
      </div>
    </div>
  );
}
