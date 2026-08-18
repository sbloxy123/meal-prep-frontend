"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "./api";

// The shell's nav counts and collections all come from a single existing
// endpoint: GET /shopping-list returns the recipes on the menu (This week),
// the draft shopping list (List) and every recipe→tag pairing (collections).
interface ShoppingListResponse {
  shoppingList: unknown[];
  allRecipesOnMenu: unknown[];
  singleRecipeTags: { tag_recipe_title: string; name: string }[];
}

export interface Collection {
  name: string;
  count: number;
}

export interface NavData {
  thisWeekCount: number;
  listCount: number;
  collections: Collection[];
  loading: boolean;
}

export function useNavData(): NavData {
  const [data, setData] = useState<
    Omit<NavData, "loading">
  >({ thisWeekCount: 0, listCount: 0, collections: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiFetch<ShoppingListResponse>("/shopping-list")
      .then((res) => {
        if (cancelled) return;
        const counts = new Map<string, number>();
        for (const { name } of res.singleRecipeTags ?? []) {
          counts.set(name, (counts.get(name) ?? 0) + 1);
        }
        const collections = [...counts.entries()]
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
        setData({
          thisWeekCount: res.allRecipesOnMenu?.length ?? 0,
          listCount: res.shoppingList?.length ?? 0,
          collections,
        });
      })
      .catch(() => {
        // Counts are chrome, not content — a failed fetch just leaves them blank
        // rather than blocking the page.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { ...data, loading };
}
