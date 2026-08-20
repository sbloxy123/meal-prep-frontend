"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { apiFetch, apiSend } from "@/lib/api";
import type { RecipesResponse } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { RecipeCard } from "@/components/recipe-card";
import { StarterRecipes } from "@/components/starter-recipes";
import { ThisWeekColumn, ThisWeekTray } from "@/components/this-week";
import { useMenu, buildCollections } from "@/lib/menu";

type Filter = { kind: "all" } | { kind: "favourites" } | { kind: "collection"; name: string };
type Sort = "newest" | "oldest" | "az";

const PINNED = 4;

export default function RecipesPage() {
  const [data, setData] = useState<RecipesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>({ kind: "all" });
  const [showAllCollections, setShowAllCollections] = useState(false);
  const [sort, setSort] = useState<Sort>("newest");
  const [showStarters, setShowStarters] = useState(false);
  const menu = useMenu();

  const load = useCallback(
    () =>
      apiFetch<RecipesResponse>("/recipes")
        .then(setData)
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false)),
    [],
  );

  useEffect(() => {
    load();
  }, [load]);

  // title → tag names, title → ingredient names (the list endpoint keys both
  // by recipe title).
  const tagsByTitle = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const { tag_recipe_title, name } of data?.recipeTags ?? []) {
      const list = map.get(tag_recipe_title) ?? [];
      list.push(name);
      map.set(tag_recipe_title, list);
    }
    return map;
  }, [data]);

  const ingredientsByTitle = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const { recipe_title, ingredient } of data?.recipeIngredients ?? []) {
      const list = map.get(recipe_title) ?? [];
      if (ingredient) list.push(ingredient.toLowerCase());
      map.set(recipe_title, list);
    }
    return map;
  }, [data]);

  // Collections sorted by how many recipes carry them.
  const collections = useMemo(
    () => buildCollections([...tagsByTitle.values()].flat()),
    [tagsByTitle],
  );

  const recipes = useMemo(() => data?.recipes ?? [], [data]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = recipes.filter((r) => {
      if (filter.kind === "favourites" && !r.favorite) return false;
      if (filter.kind === "collection" && !(tagsByTitle.get(r.title) ?? []).includes(filter.name)) {
        return false;
      }
      if (q) {
        const inTitle = r.title.toLowerCase().includes(q);
        const inIngredients = (ingredientsByTitle.get(r.title) ?? []).some((i) => i.includes(q));
        if (!inTitle && !inIngredients) return false;
      }
      return true;
    });
    // id is auto-incrementing, so id order == date-added order.
    return [...filtered].sort((a, b) => {
      if (sort === "az") return a.title.localeCompare(b.title);
      return sort === "newest" ? b.id - a.id : a.id - b.id;
    });
  }, [recipes, filter, query, tagsByTitle, ingredientsByTitle, sort]);

  function toggleFavorite(id: number, next: boolean) {
    // Optimistic — flip locally, then persist. Revert on failure.
    setData((prev) =>
      prev
        ? { ...prev, recipes: prev.recipes.map((r) => (r.id === id ? { ...r, favorite: next } : r)) }
        : prev,
    );
    apiSend(`/recipes/${id}/favorite`, {
      method: "PUT",
      body: JSON.stringify({ favorite: next }),
    }).catch(() => {
      setData((prev) =>
        prev
          ? { ...prev, recipes: prev.recipes.map((r) => (r.id === id ? { ...r, favorite: !next } : r)) }
          : prev,
      );
    });
  }

  const pinned = showAllCollections ? collections : collections.slice(0, PINNED);

  function isActive(f: Filter) {
    if (f.kind === "favourites") return filter.kind === "favourites";
    if (f.kind === "collection") return filter.kind === "collection" && filter.name === f.name;
    return false;
  }
  function pick(f: Filter) {
    setFilter((cur) =>
      (f.kind === "favourites" && cur.kind === "favourites") ||
      (f.kind === "collection" && cur.kind === "collection" && cur.name === f.name)
        ? { kind: "all" }
        : f,
    );
  }

  return (
    <div className="recipes-layout">
      <div className="recipes-main">
      <PageHeader
        title="Recipes"
        kicker={loading ? undefined : `${recipes.length} recipe${recipes.length === 1 ? "" : "s"}`}
        actions={
          <Link href="/recipes/new" className="btn btn-secondary">
            New recipe
          </Link>
        }
      />

      {!loading && !error && recipes.length > 0 && (
        <div className="recipes-filters">
          <label className="search">
            <Search size={15} aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title or ingredient"
              aria-label="Search recipes by title or ingredient"
            />
          </label>
          <div className="chips">
            <button
              type="button"
              className={`tag chip ${isActive({ kind: "favourites" }) ? "tag-outline" : "tag-neutral"}`}
              aria-pressed={isActive({ kind: "favourites" })}
              onClick={() => pick({ kind: "favourites" })}
            >
              Favourites
            </button>
            {pinned.map((c) => {
              const active = isActive({ kind: "collection", name: c.name });
              return (
                <button
                  key={c.name}
                  type="button"
                  className={`tag chip ${active ? "tag-outline" : "tag-neutral"}`}
                  aria-pressed={active}
                  onClick={() => pick({ kind: "collection", name: c.name })}
                >
                  {c.name}
                </button>
              );
            })}
            {collections.length > PINNED && (
              <button
                type="button"
                className="tag tag-neutral chip chip-all"
                aria-expanded={showAllCollections}
                onClick={() => setShowAllCollections((v) => !v)}
              >
                {showAllCollections ? "Show fewer" : `All ${collections.length} ›`}
              </button>
            )}
          </div>
          <div className="recipes-sort">
            <label htmlFor="recipes-sort-select">Sort</label>
            <select
              id="recipes-sort-select"
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              aria-label="Sort recipes"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="az">A–Z</option>
            </select>
          </div>
        </div>
      )}

      <div className="page-body">
        {loading && <p className="text-muted">Loading recipes…</p>}
        {error && !loading && <p style={{ color: "var(--color-accent-700)" }}>{error}</p>}

        {!loading && !error && recipes.length === 0 && (
          <EmptyRecipes onAddStarters={() => setShowStarters(true)} />
        )}

        {!loading && !error && recipes.length > 0 && visible.length === 0 && (
          <p className="text-muted">No recipes match your search.</p>
        )}

        {!loading && !error && visible.length > 0 && (
          <div className="recipes-list">
            {visible.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                tags={tagsByTitle.get(recipe.title) ?? []}
                onToggleFavorite={toggleFavorite}
                isOnMenu={menu.loaded ? menu.onMenuIds.has(recipe.id) : undefined}
                onAddToWeek={(r) => menu.openStockCheck(r)}
                onEditStockCheck={(r) => menu.openStockCheck(r)}
                onRemoveFromWeek={(r) => menu.requestRemoveRecipe(r)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Mobile: tray docked above the tab bar when ≥1 recipe is on the menu. */}
      <ThisWeekTray />
      </div>

      {/* Desktop: permanent This week right column. */}
      <ThisWeekColumn />

      {showStarters && (
        <StarterRecipes onClose={() => setShowStarters(false)} onAdded={load} />
      )}
    </div>
  );
}

function EmptyRecipes({ onAddStarters }: { onAddStarters: () => void }) {
  return (
    <div style={{ maxWidth: 420, margin: "40px auto 0", textAlign: "center" }}>
      <h3 style={{ fontWeight: 400 }}>No recipes yet</h3>
      <p className="text-muted" style={{ fontSize: 14 }}>
        Add your first recipe to start building this week&rsquo;s menu and shopping list.
      </p>
      <div
        style={{
          display: "flex",
          gap: 8,
          justifyContent: "center",
          flexWrap: "wrap",
          marginTop: 8,
        }}
      >
        <Link href="/recipes/new" className="btn btn-primary">
          New recipe
        </Link>
        <button type="button" className="btn btn-secondary" onClick={onAddStarters}>
          Add starter recipes
        </button>
      </div>
    </div>
  );
}
