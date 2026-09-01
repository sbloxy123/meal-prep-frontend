"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, BookOpen, Sparkles } from "lucide-react";
import { apiFetch, apiSend } from "@/lib/api";
import type { RecipesResponse } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { RecipeCard, RecipeCardSkeleton } from "@/components/recipe-card";
import { StarterRecipes } from "@/components/starter-recipes";
import { RecipeInspiration } from "@/components/recipe-inspiration";
import { ThisWeekColumn, ThisWeekTray } from "@/components/this-week";
import { GoPremiumLink } from "@/components/ai-allowance";
import { useMenu, buildCollections } from "@/lib/menu";
import { useSession } from "@/lib/auth-client";

type Filter = { kind: "all" } | { kind: "favourites" } | { kind: "collection"; name: string };
type Sort = "newest" | "oldest" | "az";

// Lazy render: show a batch, reveal more as the sentinel scrolls into view. The
// full set is still fetched once (search/filter/sort run client-side over all
// recipes), so this is a render/UX win rather than a smaller request.
const PAGE_SIZE = 15;

// Where the reader was when they opened a recipe, so coming back doesn't dump
// them at the top of the list. Search/filter/sort ride along because a scroll
// offset only means anything against the same list. Session-scoped and short
// lived: a snapshot older than this is likelier to confuse than to help.
const LIST_STATE_KEY = "recipes:listState";
const LIST_STATE_TTL_MS = 30 * 60_000;

interface ListState {
  scrollY: number;
  visibleCount: number;
  query: string;
  filter: Filter;
  sort: Sort;
  ts: number;
}

function readListState(): ListState | null {
  try {
    const raw = sessionStorage.getItem(LIST_STATE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(LIST_STATE_KEY); // consume once, however it's used
    const s = JSON.parse(raw) as ListState;
    const kinds = ["all", "favourites", "collection"];
    const sorts = ["newest", "oldest", "az"];
    if (
      typeof s?.scrollY !== "number" ||
      typeof s.visibleCount !== "number" ||
      typeof s.query !== "string" ||
      !kinds.includes(s.filter?.kind) ||
      !sorts.includes(s.sort) ||
      Date.now() - s.ts > LIST_STATE_TTL_MS
    ) {
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

/** Did we get here by backing out of a recipe (either the back link or the
    browser's back button), as opposed to arriving fresh from the nav? */
function cameFromRecipe(): boolean {
  try {
    // The layout writes nav:current after this page's effects run, so on a fresh
    // navigation it still holds the page we came from.
    const current = sessionStorage.getItem("nav:current");
    const prev = current === "/recipes" ? sessionStorage.getItem("nav:prev") : current;
    // Matches the detail page and its editor (so deleting a recipe also comes
    // back to where you were), but not /recipes/new — a new recipe belongs at
    // the top of the list, where the default sort puts it.
    return /^\/recipes\/\d+/.test(prev ?? "");
  } catch {
    return false;
  }
}

export default function RecipesPage() {
  // useSearchParams needs a Suspense boundary in the App Router.
  return (
    <Suspense fallback={null}>
      <RecipesPageInner />
    </Suspense>
  );
}

function RecipesPageInner() {
  const [data, setData] = useState<RecipesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>({ kind: "all" });
  const [showAllCollections, setShowAllCollections] = useState(false);
  const [sort, setSort] = useState<Sort>("newest");
  const [showStarters, setShowStarters] = useState(false);
  const [showInspire, setShowInspire] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadMoreTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Scroll position waiting to be restored, and the search/filter/sort we
  // restored with — so the "new search, back to the top" effect below can tell
  // the restore apart from the user actually changing something.
  const pendingScrollY = useRef<number | null>(null);
  const restoredSig = useRef<string | null>(null);
  const chipsRef = useRef<HTMLDivElement | null>(null);
  const [clamp, setClamp] = useState<{
    maxHeight: number;
    fit: number;
    overflowing: boolean;
  } | null>(null);
  const menu = useMenu();
  const router = useRouter();
  const searchParams = useSearchParams();

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

  // Entry points in the rail / Account link to /recipes?starters=1 to open the
  // starter picker even when recipes already exist. Reactive on the param so a
  // soft (client-side) navigation from the rail — same route, no remount — still
  // opens it; then strip the param so a refresh doesn't reopen it.
  useEffect(() => {
    if (searchParams.get("starters") != null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowStarters(true);
      router.replace("/recipes", { scroll: false });
    }
  }, [searchParams, router]);

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

  const shown = visible.slice(0, visibleCount);
  const hasMore = visibleCount < visible.length;

  // Start each new search/filter/sort back at the top — unless this render is
  // the restore below putting the reader's old view back.
  useEffect(() => {
    const sig = JSON.stringify([query, filter, sort]);
    const restored = restoredSig.current;
    restoredSig.current = null;
    if (restored === sig) return;
    // A batch mid-reveal belongs to the previous list — drop it.
    if (loadMoreTimer.current) {
      clearTimeout(loadMoreTimer.current);
      loadMoreTimer.current = null;
    }
    setLoadingMore(false);
    setVisibleCount(PAGE_SIZE);
  }, [query, filter, sort]);

  // Coming back from a recipe: put the view back as it was. Declared after the
  // reset effect so it runs second on mount, leaving its marker for the rerun
  // the restored search/filter/sort triggers.
  useEffect(() => {
    const saved = readListState();
    if (!saved || !cameFromRecipe()) return;
    restoredSig.current = JSON.stringify([saved.query, saved.filter, saved.sort]);
    pendingScrollY.current = saved.scrollY;
    /* eslint-disable react-hooks/set-state-in-effect */
    setQuery(saved.query);
    setFilter(saved.filter);
    setSort(saved.sort);
    setVisibleCount(Math.max(PAGE_SIZE, saved.visibleCount));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Scroll back once the list is on screen. Two frames: one for the restored
  // batch to render, one for it to lay out. "instant" because the app sets
  // scroll-behavior: smooth globally, and animating here would be visible.
  useEffect(() => {
    if (loading || pendingScrollY.current == null) return;
    const y = pendingScrollY.current;
    pendingScrollY.current = null;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => window.scrollTo({ top: y, behavior: "instant" })),
    );
  }, [loading]);

  // A collection that no longer exists would leave the list filtered to nothing
  // with no chip to clear, so fall back to showing everything.
  useEffect(() => {
    if (filter.kind !== "collection" || collections.length === 0) return;
    if (!collections.some((c) => c.name === filter.name)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFilter({ kind: "all" });
    }
  }, [collections, filter]);

  function saveListState() {
    try {
      const state: ListState = {
        scrollY: window.scrollY,
        visibleCount,
        query,
        filter,
        sort,
        ts: Date.now(),
      };
      sessionStorage.setItem(LIST_STATE_KEY, JSON.stringify(state));
    } catch {
      // Storage unavailable — we just don't restore.
    }
  }

  // Reveal the next batch when the bottom sentinel scrolls into view. The brief
  // pause isn't padding: revealing instantly (and 400px early) made the batching
  // invisible, so the list read as one long render that occasionally stalled.
  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        if (loadMoreTimer.current) return;
        setLoadingMore(true);
        loadMoreTimer.current = setTimeout(() => {
          loadMoreTimer.current = null;
          setLoadingMore(false);
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, visible.length));
        }, 250);
      },
      { rootMargin: "120px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (loadMoreTimer.current) {
        clearTimeout(loadMoreTimer.current);
        loadMoreTimer.current = null;
        setLoadingMore(false);
      }
    };
  }, [hasMore, visible.length]);

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

  // Every collection is rendered; collapsed, the row is clamped to two lines and
  // the overflow is hidden. An active collection is hoisted to the front while
  // collapsed so the filter in force is always on screen and clearable —
  // restoring a saved filter can otherwise land it in the hidden rows.
  const orderedCollections = useMemo(() => {
    if (showAllCollections || filter.kind !== "collection") return collections;
    const i = collections.findIndex((c) => c.name === filter.name);
    if (i <= 0) return collections;
    return [collections[i], ...collections.slice(0, i), ...collections.slice(i + 1)];
  }, [collections, showAllCollections, filter]);

  // How many chips fit in two rows, and how tall those rows are. Measured from
  // the chips' own offsets — clamping affects painting, not layout, so this
  // stays accurate while collapsed.
  useLayoutEffect(() => {
    const el = chipsRef.current;
    if (!el) return;
    const measure = () => {
      const kids = Array.from(el.children) as HTMLElement[];
      if (kids.length === 0) return;
      const firstTop = kids[0].offsetTop;
      const secondRow = kids.find((k) => k.offsetTop > firstTop);
      const rowStep = secondRow ? secondRow.offsetTop - firstTop : 0;
      const thirdRowTop = firstTop + 2 * rowStep;
      const fit = secondRow ? kids.filter((k) => k.offsetTop < thirdRowTop).length : kids.length;
      const next = {
        maxHeight: rowStep + kids[0].offsetHeight,
        fit,
        overflowing: fit < kids.length,
      };
      setClamp((prev) =>
        prev &&
        prev.maxHeight === next.maxHeight &&
        prev.fit === next.fit &&
        prev.overflowing === next.overflowing
          ? prev
          : next,
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [orderedCollections, showAllCollections]);

  // Chips past the second row are hidden outright rather than just clipped —
  // a clipped-but-focusable chip is a keyboard trap.
  const isClipped = (index: number) =>
    !showAllCollections && clamp != null && index >= clamp.fit;
  const showChipsToggle = showAllCollections || (clamp?.overflowing ?? false);

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
          <>
            <button
              type="button"
              className="btn btn-ai"
              onClick={() => setShowInspire(true)}
            >
              <Sparkles size={15} className="btn-ai-spark" aria-hidden />
              Inspiration
            </button>
            <Link href="/recipes/new" className="btn btn-secondary">
              New recipe
            </Link>
          </>
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
          <div className="chips-bar">
            <div
              ref={chipsRef}
              className={`chips${!showAllCollections ? " chips--clamped" : ""}`}
              style={
                !showAllCollections && clamp?.overflowing
                  ? { maxHeight: clamp.maxHeight }
                  : undefined
              }
            >
              <button
                type="button"
                className={`tag chip ${isActive({ kind: "favourites" }) ? "tag-outline" : "tag-neutral"}${isClipped(0) ? " chip--clipped" : ""}`}
                aria-pressed={isActive({ kind: "favourites" })}
                onClick={() => pick({ kind: "favourites" })}
              >
                Favourites
              </button>
              {orderedCollections.map((c, i) => {
                const active = isActive({ kind: "collection", name: c.name });
                return (
                  <button
                    key={c.name}
                    type="button"
                    className={`tag chip ${active ? "tag-outline" : "tag-neutral"}${isClipped(i + 1) ? " chip--clipped" : ""}`}
                    aria-pressed={active}
                    onClick={() => pick({ kind: "collection", name: c.name })}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
            {/* Kept outside the chips so it can't wrap out of view, and given
                space even when hidden — appearing would rewrap the chips and
                could flip it straight back to hidden. */}
            <button
              type="button"
              className="tag tag-neutral chip chip-all chips-toggle"
              aria-expanded={showAllCollections}
              style={{ visibility: showChipsToggle ? "visible" : "hidden" }}
              onClick={() => setShowAllCollections((v) => !v)}
            >
              {showAllCollections ? "Show fewer" : `All ${collections.length} ›`}
            </button>
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
          <>
            <div className="recipes-list">
              {shown.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  tags={tagsByTitle.get(recipe.title) ?? []}
                  onToggleFavorite={toggleFavorite}
                  isOnMenu={menu.loaded ? menu.onMenuIds.has(recipe.id) : undefined}
                  onAddToWeek={(r) => menu.openStockCheck(r)}
                  onEditStockCheck={(r) => menu.openStockCheck(r)}
                  onRemoveFromWeek={(r) => menu.requestRemoveRecipe(r)}
                  onOpen={saveListState}
                />
              ))}
              {loadingMore &&
                Array.from({ length: Math.min(3, visible.length - visibleCount) }).map((_, i) => (
                  <RecipeCardSkeleton key={`skeleton-${i}`} />
                ))}
            </div>
            {hasMore && <div ref={sentinelRef} className="recipes-loadmore" aria-hidden />}
          </>
        )}
      </div>

      {/* Mobile: tray docked above the tab bar when ≥1 recipe is on the menu. */}
      <ThisWeekTray />
      </div>

      {/* Desktop: permanent This week right column. */}
      <ThisWeekColumn onOpenRecipe={saveListState} />

      {showStarters && (
        <StarterRecipes
          onClose={() => setShowStarters(false)}
          // Refresh both the recipe list AND the menu — the stock check reads its
          // ingredient lists from the MenuProvider, so it needs the new recipes.
          onAdded={async () => {
            await Promise.all([load(), menu.refresh()]);
          }}
          existingTitles={new Set(recipes.map((r) => r.title.toLowerCase()))}
        />
      )}

      {showInspire && (
        <RecipeInspiration
          onClose={() => setShowInspire(false)}
          // Refresh both the recipe list AND the menu — the stock check reads its
          // ingredient lists from the MenuProvider, so it needs the new recipes.
          onAdded={async () => {
            await Promise.all([load(), menu.refresh()]);
          }}
          existingTitles={new Set(recipes.map((r) => r.title.toLowerCase()))}
        />
      )}
    </div>
  );
}

function EmptyRecipes({ onAddStarters }: { onAddStarters: () => void }) {
  const { data: session } = useSession();
  const { allowance } = useMenu();
  const who = session?.user.name?.trim() || session?.user.email || null;
  return (
    <div className="recipes-empty">
      {who && <p className="recipes-welcome">Welcome, {who}</p>}
      <h3 style={{ fontWeight: 400, margin: "4px 0 6px" }}>Let&rsquo;s fill your kitchen</h3>
      <p className="text-muted" style={{ fontSize: 14, margin: 0 }}>
        Get going in seconds with a ready-made collection of everyday family meals.
      </p>

      <div className="recipes-starter-cta">
        <span className="recipes-starter-icon" aria-hidden>
          <BookOpen size={22} />
        </span>
        <h4 className="recipes-starter-title">Add starter recipes</h4>
        <p className="text-muted recipes-starter-desc">
          Pick from 40 popular meals — complete with ingredients, quantities and macros. Edit or
          delete any of them anytime.
        </p>
        <button type="button" className="btn btn-primary recipes-starter-btn" onClick={onAddStarters}>
          Browse starter recipes
        </button>
      </div>

      <div className="recipes-starter-cta recipes-ai-cta">
        <span className="recipes-starter-icon" aria-hidden>
          <Sparkles size={22} />
        </span>
        <h4 className="recipes-starter-title">Or let Fornetto AI do the work</h4>
        <p className="text-muted recipes-starter-desc">
          Paste a recipe link, snap a cookbook page, or just give it a title — Fornetto AI drafts
          the ingredients and method for you to review.
        </p>
        <Link href="/recipes/new" className="btn btn-ai recipes-starter-btn">
          <Sparkles size={15} className="btn-ai-spark" aria-hidden />
          Draft with Fornetto AI
        </Link>
        {!allowance.isPremium && (
          <p className="text-muted recipes-ai-cta-note">
            Your free plan includes {allowance.limit} AI actions a week.{" "}
            <GoPremiumLink source="empty_state_ai">Go Premium</GoPremiumLink> for unlimited.
          </p>
        )}
      </div>

      <p className="text-muted recipes-empty-alt">
        Prefer to start fresh?{" "}
        <Link href="/recipes/new" className="recipes-empty-link">
          Add your own recipe
        </Link>
      </p>
    </div>
  );
}
