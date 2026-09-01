"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";
import type { RecipeDetail } from "@/lib/types";
import { RecipeForm, type RecipeFormInitial } from "@/components/recipe-form";

type State =
  | { status: "loading" }
  | { status: "notfound" }
  | { status: "error"; message: string }
  | { status: "ready"; initial: RecipeFormInitial };

export default function EditRecipePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [state, setState] = useState<State>({ status: "loading" });
  const [autoImprove, setAutoImprove] = useState(false);

  // The detail page's "Improve recipe" button links here with ?improve=1 so the
  // improve pass runs on arrival. Read it off the URL (rather than
  // useSearchParams, which would need a Suspense boundary) and strip it, so a
  // refresh doesn't spend a second AI action.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("improve") == null) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAutoImprove(true);
    window.history.replaceState(null, "", `/recipes/${id}/edit`);
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    apiFetch<RecipeDetail>(`/recipes/${id}`)
      .then((r) => {
        if (cancelled) return;
        setState({
          status: "ready",
          initial: {
            title: r.title,
            description: r.description,
            instructions: r.instructions,
            link_url: r.link_url,
            prep_time_minutes: r.prep_time_minutes,
            cook_time_minutes: r.cook_time_minutes,
            servings: r.servings,
            calories: r.calories,
            protein_g: r.protein_g,
            carb_g: r.carb_g,
            fat_g: r.fat_g,
            macros_source: r.macros_source,
            ingredients: (r.recipe_ingredients ?? []).map((ing) => ({
              name: ing.name,
              quantity: ing.quantity == null ? "" : String(Number(ing.quantity) || ""),
              unit: ing.unit ?? "",
            })),
            collections: (r.recipe_tags ?? []).map((t) => t.tag_name),
            image_url: r.image_url,
            image_public_id: r.image_public_id,
          },
        });
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

  if (state.status === "loading") {
    return (
      <div className="page-body">
        <p className="text-muted">Loading…</p>
      </div>
    );
  }
  if (state.status === "notfound") {
    return (
      <div className="detail">
        <Link href="/recipes" className="detail-back">
          <ChevronLeft size={15} aria-hidden />
          Recipes
        </Link>
        <div className="page-body" style={{ textAlign: "center", marginTop: 40 }}>
          <h3 style={{ fontWeight: 400 }}>Recipe not found</h3>
          <Link href="/recipes" className="btn btn-primary" style={{ marginTop: 8 }}>
            Back to recipes
          </Link>
        </div>
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="page-body">
        <p style={{ color: "var(--color-accent-700)" }}>{state.message}</p>
      </div>
    );
  }

  return (
    <RecipeForm mode="edit" recipeId={Number(id)} initial={state.initial} autoImprove={autoImprove} />
  );
}
