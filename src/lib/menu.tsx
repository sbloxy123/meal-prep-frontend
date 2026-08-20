"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiFetch, apiSend } from "./api";
import { StockCheck } from "@/components/stock-check";
import { ConfirmDialog } from "@/components/confirm-dialog";

// GET /shopping-list — the one endpoint that backs This week, the shopping
// list count, collections, and the stock-check ingredient lists.
interface ShoppingListResponse {
  shoppingList: ShoppingItem[];
  allRecipesOnMenu: { id: number; title: string }[];
  singleRecipeIngredients: { recipe_title: string; ingredient: string }[];
  singleRecipeTags: { tag_recipe_title: string; name: string }[];
  shoppingListIngredientsByRecipe: { recipe_id: number; ingredient_name: string }[];
}

// A row of shopping_list. Recipe-derived items carry ingredient_name (with
// custom_product null); user-added items carry custom_product. recipe_count is
// how many on-menu recipes reference the item.
export interface ShoppingItem {
  id: number;
  ingredient_name: string | null;
  custom_product: string | null;
  recipe_count: number | string;
}

/** What a shopping-list row is called: a user item's product, else the
    recipe-derived ingredient name. */
export function shoppingItemName(item: ShoppingItem): string {
  return item.custom_product ?? item.ingredient_name ?? "";
}

export interface WeekRecipe {
  id: number;
  title: string;
  itemCount: number;
  summary: string;
}

export interface Collection {
  name: string;
  count: number;
}

// Count recipe→tag pairings into collections, ranked by size then name.
export function buildCollections(tagNames: string[]): Collection[] {
  const counts = new Map<string, number>();
  for (const name of tagNames) counts.set(name, (counts.get(name) ?? 0) + 1);
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

interface OpenRecipe {
  id: number;
  title: string;
  image_url?: string | null;
}

interface MenuValue {
  loaded: boolean;
  thisWeek: WeekRecipe[];
  onMenuIds: Set<number>;
  listCount: number;
  collections: Collection[];
  shoppingList: ShoppingItem[];
  recipeTitlesFor: (ingredientName: string) => string[];
  ingredientsFor: (title: string) => string[];
  selectedFor: (recipeId: number) => Set<string>;
  openStockCheck: (recipe: OpenRecipe) => void;
  // Opens a confirmation first — removing a recipe also clears its items from
  // the shopping list, so it's destructive and non-undoable.
  requestRemoveRecipe: (recipe: OpenRecipe) => void;
  // Takes every recipe off this week (each one cascades its ingredients out of
  // the shopping list); manually-added own items are left untouched.
  clearAllRecipes: () => Promise<void>;
  refresh: () => Promise<void>;
}

const MenuContext = createContext<MenuValue | null>(null);

export function useMenu(): MenuValue {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error("useMenu must be used within a MenuProvider");
  return ctx;
}

export function MenuProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<ShoppingListResponse | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [openRecipe, setOpenRecipe] = useState<OpenRecipe | null>(null);
  const [removeTarget, setRemoveTarget] = useState<OpenRecipe | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await apiFetch<ShoppingListResponse>("/shopping-list");
      setData(res);
    } catch {
      // Chrome-level data; leave the last good state on a transient failure.
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    // Initial load. State only changes after the fetch resolves, so this is
    // safe despite the set-state-in-effect lint heuristic.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  // Refetch when the app regains focus / visibility, so a list edited on
  // another device shows up without a manual refresh. Throttled to avoid the
  // focus + visibilitychange double-fire. (Optimistic deletes are held in each
  // page's local state, so a refresh here can't resurrect them.)
  useEffect(() => {
    let last = 0;
    const maybeRefresh = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - last < 2000) return;
      last = now;
      void refresh();
    };
    document.addEventListener("visibilitychange", maybeRefresh);
    window.addEventListener("focus", maybeRefresh);
    return () => {
      document.removeEventListener("visibilitychange", maybeRefresh);
      window.removeEventListener("focus", maybeRefresh);
    };
  }, [refresh]);

  const onMenuIds = useMemo(
    () => new Set((data?.allRecipesOnMenu ?? []).map((r) => r.id)),
    [data],
  );

  const thisWeek = useMemo<WeekRecipe[]>(() => {
    const byRecipe = new Map<number, string[]>();
    for (const { recipe_id, ingredient_name } of data?.shoppingListIngredientsByRecipe ?? []) {
      const list = byRecipe.get(recipe_id) ?? [];
      list.push(ingredient_name);
      byRecipe.set(recipe_id, list);
    }
    return (data?.allRecipesOnMenu ?? []).map((r) => {
      const items = byRecipe.get(r.id) ?? [];
      return { id: r.id, title: r.title, itemCount: items.length, summary: items.join(" · ") };
    });
  }, [data]);

  const listCount = data?.shoppingList?.length ?? 0;

  const collections = useMemo<Collection[]>(
    () => buildCollections((data?.singleRecipeTags ?? []).map((t) => t.name)),
    [data],
  );

  const ingredientsFor = useCallback(
    (title: string) => {
      const seen = new Set<string>();
      const out: string[] = [];
      for (const row of data?.singleRecipeIngredients ?? []) {
        if (row.recipe_title === title && row.ingredient && !seen.has(row.ingredient)) {
          seen.add(row.ingredient);
          out.push(row.ingredient);
        }
      }
      return out;
    },
    [data],
  );

  const selectedFor = useCallback(
    (recipeId: number) => {
      const set = new Set<string>();
      for (const row of data?.shoppingListIngredientsByRecipe ?? []) {
        if (row.recipe_id === recipeId) set.add(row.ingredient_name);
      }
      return set;
    },
    [data],
  );

  const shoppingList = data?.shoppingList ?? [];

  // Which on-menu recipes a recipe-derived item came from (for the "From
  // recipes" labels and the "in N recipes" note).
  const recipeTitlesFor = useCallback(
    (ingredientName: string) => {
      const titleById = new Map((data?.allRecipesOnMenu ?? []).map((r) => [r.id, r.title]));
      const titles = new Set<string>();
      for (const row of data?.shoppingListIngredientsByRecipe ?? []) {
        if (row.ingredient_name === ingredientName) {
          const t = titleById.get(row.recipe_id);
          if (t) titles.add(t);
        }
      }
      return [...titles];
    },
    [data],
  );

  const removeRecipe = useCallback(
    async (recipeId: number) => {
      await apiSend(`/shopping-list/recipe/${recipeId}`, { method: "PUT" });
      await refresh();
    },
    [refresh],
  );

  // Clear the whole week for a fresh menu. Reuses the per-recipe remove so each
  // recipe's ingredients cascade out of the shopping list; own custom items are
  // untouched. Sequential (not parallel) to avoid racing the backend's
  // shared-ingredient reconciliation, with one refresh at the end.
  const clearAllRecipes = useCallback(async () => {
    for (const id of onMenuIds) {
      await apiSend(`/shopping-list/recipe/${id}`, { method: "PUT" });
    }
    await refresh();
  }, [onMenuIds, refresh]);

  // Submit the stock check. Editing an already-on-menu recipe reconciles by
  // clearing it first (PUT) then re-adding the ticked items (POST) — both are
  // existing endpoints, so the API contract is untouched.
  const submitStockCheck = useCallback(
    async (recipeId: number, ingredients: string[], isEdit: boolean) => {
      if (isEdit) {
        await apiSend(`/shopping-list/recipe/${recipeId}`, { method: "PUT" });
      }
      await apiSend("/shopping-list", {
        method: "POST",
        body: JSON.stringify({ recipeId, ingredients }),
      });
      await refresh();
    },
    [refresh],
  );

  const value: MenuValue = {
    loaded,
    thisWeek,
    onMenuIds,
    listCount,
    collections,
    shoppingList,
    recipeTitlesFor,
    ingredientsFor,
    selectedFor,
    openStockCheck: setOpenRecipe,
    requestRemoveRecipe: setRemoveTarget,
    clearAllRecipes,
    refresh,
  };

  return (
    <MenuContext.Provider value={value}>
      {children}
      {openRecipe && (
        <StockCheck
          recipe={openRecipe}
          ingredients={ingredientsFor(openRecipe.title)}
          initialSelected={selectedFor(openRecipe.id)}
          isEdit={onMenuIds.has(openRecipe.id)}
          onSubmit={(ings) => submitStockCheck(openRecipe.id, ings, onMenuIds.has(openRecipe.id))}
          onClose={() => setOpenRecipe(null)}
        />
      )}
      {removeTarget && (
        <ConfirmDialog
          title={`Remove ${removeTarget.title}?`}
          body="This takes it off this week and removes its ingredients from your shopping list, unless another recipe on the menu still needs them."
          confirmLabel="Remove"
          onConfirm={async () => {
            await removeRecipe(removeTarget.id);
            setRemoveTarget(null);
          }}
          onClose={() => setRemoveTarget(null)}
        />
      )}
    </MenuContext.Provider>
  );
}
