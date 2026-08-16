"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface Recipe {
  id: number;
  title: string;
  description: string | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  is_on_menu: boolean;
  favorite: boolean;
}

interface RecipesResponse {
  recipes: Recipe[];
}

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<RecipesResponse>("/recipes")
      .then((data) => setRecipes(data.recipes))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-500">Loading recipes…</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Recipes</h1>
      </div>

      {recipes.length === 0 ? (
        <p className="text-gray-500">No recipes yet.</p>
      ) : (
        <ul className="space-y-3">
          {recipes.map((recipe) => (
            <li
              key={recipe.id}
              className="bg-white rounded-xl border border-gray-200 px-5 py-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-medium text-gray-900">{recipe.title}</h2>
                  {recipe.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                      {recipe.description}
                    </p>
                  )}
                  {(recipe.prep_time_minutes || recipe.cook_time_minutes) && (
                    <p className="text-xs text-gray-400 mt-2">
                      {recipe.prep_time_minutes
                        ? `Prep ${recipe.prep_time_minutes}m`
                        : ""}
                      {recipe.prep_time_minutes && recipe.cook_time_minutes
                        ? " · "
                        : ""}
                      {recipe.cook_time_minutes
                        ? `Cook ${recipe.cook_time_minutes}m`
                        : ""}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0 text-xs">
                  {recipe.favorite && (
                    <span className="bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5">
                      Favourite
                    </span>
                  )}
                  {recipe.is_on_menu && (
                    <span className="bg-green-50 text-green-700 border border-green-200 rounded-full px-2 py-0.5">
                      On menu
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
