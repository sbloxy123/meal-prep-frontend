"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { PageHeader } from "@/components/page-header";

interface Recipe {
  id: number;
  title: string;
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

  const kicker = loading ? undefined : `${recipes.length} recipes`;

  return (
    <>
      <PageHeader
        title="Recipes"
        kicker={kicker}
        actions={
          <Link href="/recipes" className="btn btn-secondary">
            New recipe
          </Link>
        }
      />
      <div className="page-body">
        {loading && <p className="text-muted">Loading recipes…</p>}
        {error && !loading && <p style={{ color: "var(--color-accent-700)" }}>{error}</p>}
        {!loading && !error && recipes.length === 0 && (
          <p className="text-muted">No recipes yet.</p>
        )}
        {!loading && !error && recipes.length > 0 && (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {recipes.map((recipe, i) => (
              <li
                key={recipe.id}
                style={{
                  padding: "14px 0",
                  borderTop: i === 0 ? undefined : "1px solid var(--color-divider)",
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <Link
                  href={`/recipes/${recipe.id}`}
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontWeight: "var(--font-heading-weight)",
                    fontSize: 18,
                    color: "var(--color-text)",
                    textDecoration: "none",
                  }}
                >
                  {recipe.title}
                </Link>
                {recipe.is_on_menu && (
                  <span
                    style={{
                      fontSize: 11,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "var(--color-accent-700)",
                      flex: "none",
                    }}
                  >
                    On this week
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
