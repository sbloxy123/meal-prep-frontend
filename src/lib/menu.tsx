"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { apiFetch, apiSend } from "./api";
import { StockCheck } from "@/components/stock-check";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { GoPremiumLink } from "@/components/ai-allowance";
import type { Protein } from "./starter-recipes";
import type { DietFlag, Scope } from "./starter-picker";

// GET /shopping-list — the one endpoint that backs This week, the shopping
// list count, collections, and the stock-check ingredient lists.
interface ShoppingListResponse {
  shoppingList: ShoppingItem[];
  allRecipesOnMenu: {
    id: number;
    title: string;
    added_by_name: string | null;
    added_to_menu_by: string | null;
  }[];
  singleRecipeIngredients: { recipe_title: string; ingredient: string }[];
  singleRecipeTags: { tag_recipe_title: string; name: string }[];
  shoppingListIngredientsByRecipe: { recipe_id: number; ingredient_name: string }[];
  householdMemberCount?: number;
  // Premium entitlement + weekly AI allowance (see AiAllowance below).
  plan?: "free" | "premium";
  aiUsedThisWeek?: number;
  aiWeeklyLimit?: number;
  weekResetsAt?: string | null;
  // Onboarding questionnaire state. Optional so a frontend running against a
  // backend that predates them simply never offers the questionnaire.
  onboardingNeeded?: boolean;
  onboardingOutcome?: "completed" | "skipped" | "pre_existing" | null;
  foodPrefs?: FoodPrefs | null;
  dietaryRule?: DietaryRule | null;
}

/** A household member's own answers to the onboarding questionnaire. Mirrors
    the backend's lib/dietary.js shape; `v` lets it be reshaped later without a
    migration. */
export interface FoodPrefs {
  v?: number;
  proteins: Protein[];
  diets: DietFlag[];
  scope: Scope;
}

/** The kitchen-wide dietary rule, set by the household owner. `setBy` is
    provenance for the UI — authorisation is the owner role, server-side. */
export interface DietaryRule {
  v?: number;
  diets: DietFlag[];
  setBy?: string;
}

/** The household's premium status and weekly AI-action allowance, derived from
    GET /shopping-list. Every AI surface reads this to render the allowance
    tag/row and to disable actions once a free household's pool is spent. */
export interface AiAllowance {
  isPremium: boolean;
  /** AI actions used in the current week (0 for premium — not tracked). */
  used: number;
  /** Weekly pool size for free households. */
  limit: number;
  /** Actions left this week (free only; Infinity for premium). */
  remaining: number;
  /** Free household with no actions left this week. */
  exhausted: boolean;
  /** When the weekly window resets (ISO), or null for premium. */
  resetsAt: string | null;
}

/** At or below this many actions left, a free household is asked to confirm
    before an AI action spends one. Above it the allowance notes on each AI
    surface are enough, and a dialog would just be friction. Matches the
    threshold the premium banner appears at. */
const LOW_ALLOWANCE = 3;

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
  addedByName: string | null;
  addedById: string | null;
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
  /** True when the household has >1 member — attribution ("added by") is only
      shown then, since it's just noise in a solo household. */
  householdShared: boolean;
  collections: Collection[];
  shoppingList: ShoppingItem[];
  /** Premium status + weekly AI allowance for the whole app. */
  allowance: AiAllowance;
  /** Onboarding questionnaire state (see ShoppingListResponse). */
  onboardingNeeded: boolean;
  onboardingOutcome: "completed" | "skipped" | "pre_existing" | null;
  foodPrefs: FoodPrefs | null;
  dietaryRule: DietaryRule | null;
  recipeTitlesFor: (ingredientName: string) => string[];
  ingredientsFor: (title: string) => string[];
  selectedFor: (recipeId: number) => Set<string>;
  openStockCheck: (recipe: OpenRecipe) => void;
  // Opens a confirmation first — removing a recipe also clears its items from
  // the shopping list, so it's destructive and non-undoable.
  requestRemoveRecipe: (recipe: OpenRecipe) => void;
  /** Call before spending a weekly AI action. Resolves true to proceed. Only
      free households running low (see LOW_ALLOWANCE) actually see a dialog;
      everyone else resolves straight through. */
  confirmAiSpend: () => Promise<boolean>;
  // Takes every recipe off this week (each one cascades its ingredients out of
  // the shopping list); manually-added own items are left untouched.
  clearAllRecipes: () => Promise<void>;
  /** Delete a recipe for good, tidying the shopping list on the way out. Lives
      here rather than at the call sites because only the provider knows whether
      it's on the menu, and both delete entry points need the same behaviour. */
  deleteRecipe: (recipeId: number) => Promise<void>;
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
  // The pending AI-spend confirmation: the dialog's answer is delivered back to
  // whichever AI handler is awaiting confirmAiSpend().
  const [aiConfirm, setAiConfirm] = useState<{
    resolve: (ok: boolean) => void;
    remaining: number;
  } | null>(null);
  const aiConfirmOpen = useRef(false);

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
      return {
        id: r.id,
        title: r.title,
        itemCount: items.length,
        summary: items.join(" · "),
        addedByName: r.added_by_name,
        addedById: r.added_to_menu_by,
      };
    });
  }, [data]);

  const listCount = data?.shoppingList?.length ?? 0;
  const householdShared = (data?.householdMemberCount ?? 1) > 1;

  const allowance = useMemo<AiAllowance>(() => {
    const isPremium = data?.plan === "premium";
    const limit = data?.aiWeeklyLimit ?? 15;
    const used = data?.aiUsedThisWeek ?? 0;
    const remaining = isPremium ? Infinity : Math.max(0, limit - used);
    return {
      isPremium,
      used,
      limit,
      remaining,
      // Never disable before the first load resolves (data null → not exhausted).
      exhausted: !isPremium && data != null && remaining <= 0,
      resetsAt: data?.weekResetsAt ?? null,
    };
  }, [data]);

  // Premium, a comfortable allowance, and an already-spent pool all proceed
  // without a dialog — the last because every caller guards on `exhausted` and
  // owns its own weekly-limit copy, which is more useful than a confirmation.
  const confirmAiSpend = useCallback((): Promise<boolean> => {
    if (allowance.isPremium || allowance.remaining > LOW_ALLOWANCE || allowance.remaining <= 0) {
      return Promise.resolve(true);
    }
    if (aiConfirmOpen.current) return Promise.resolve(false);
    aiConfirmOpen.current = true;
    return new Promise<boolean>((resolve) => {
      setAiConfirm({ resolve, remaining: allowance.remaining });
    });
  }, [allowance]);

  function settleAiConfirm(ok: boolean) {
    if (!aiConfirm) return;
    aiConfirmOpen.current = false;
    aiConfirm.resolve(ok);
    setAiConfirm(null);
  }

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

  // DELETE /recipes/:id drops the recipe row only. Shopping-list items are keyed
  // by ingredient *name*, so there's no foreign key to cascade from and they'd
  // be stranded on the list with no recipe behind them. Take it off the menu
  // first: that endpoint runs the proper cleanup, keeping anything a second
  // recipe still needs.
  const deleteRecipe = useCallback(
    async (recipeId: number) => {
      if (onMenuIds.has(recipeId)) {
        await apiSend(`/shopping-list/recipe/${recipeId}`, { method: "PUT" });
      }
      await apiSend(`/recipes/${recipeId}`, { method: "DELETE" });
      await refresh();
    },
    [onMenuIds, refresh],
  );

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
    householdShared,
    collections,
    shoppingList,
    allowance,
    onboardingNeeded: data?.onboardingNeeded === true,
    onboardingOutcome: data?.onboardingOutcome ?? null,
    foodPrefs: data?.foodPrefs ?? null,
    dietaryRule: data?.dietaryRule ?? null,
    recipeTitlesFor,
    ingredientsFor,
    selectedFor,
    openStockCheck: setOpenRecipe,
    requestRemoveRecipe: setRemoveTarget,
    confirmAiSpend,
    clearAllRecipes,
    deleteRecipe,
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
      {aiConfirm && (
        <ConfirmDialog
          title="Use an AI action?"
          body={
            <>
              <p style={{ margin: 0 }}>
                {aiConfirm.remaining === 1
                  ? "This will use your last free AI action this week."
                  : `This will use 1 of your ${aiConfirm.remaining} remaining free AI actions this week.`}
              </p>
              <p style={{ margin: "8px 0 0" }}>
                <GoPremiumLink source="ai_spend_confirm">
                  Go premium for unlimited
                </GoPremiumLink>
              </p>
            </>
          }
          confirmLabel="Continue"
          cancelLabel="Not now"
          // Only hands the answer back — the AI call itself runs in the caller,
          // which owns the per-feature error copy.
          onConfirm={async () => settleAiConfirm(true)}
          onClose={() => settleAiConfirm(false)}
        />
      )}
    </MenuContext.Provider>
  );
}
