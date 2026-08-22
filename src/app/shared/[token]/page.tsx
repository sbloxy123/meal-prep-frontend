"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ApiError, apiFetch } from "@/lib/api";
import { useSession } from "@/lib/auth-client";
import { parseInstructions } from "@/lib/instructions";
import { PENDING_SHARE_KEY } from "@/components/pending-share";

interface SharedRecipe {
  title: string;
  description?: string | null;
  instructions?: string | null;
  ingredients: { name: string; quantity: number | string | null; unit: string | null }[];
  servings?: number | null;
  calories?: number | null;
}

type State =
  | { status: "loading" }
  | { status: "notfound" }
  | { status: "error"; message: string }
  | { status: "ready"; recipe: SharedRecipe };

export default function SharedRecipePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [state, setState] = useState<State>({ status: "loading" });
  const [saving, setSaving] = useState(false);

  // The preview endpoint is auth-guarded, so a logged-out recipient can't fetch
  // it. Stash the token and route them through sign-in; PendingShare then copies
  // the recipe on their first authenticated load.
  function stashAndSignIn() {
    try {
      localStorage.setItem(PENDING_SHARE_KEY, token);
    } catch {
      /* ignore */
    }
    router.push("/sign-in");
  }

  // Only the authenticated fetch lives in the effect; the "needs auth" case is
  // derived in render (below) so there's no synchronous setState here.
  useEffect(() => {
    if (isPending || !session) return;
    let cancelled = false;
    apiFetch<SharedRecipe>(`/shared-recipe/${token}`)
      .then((recipe) => {
        if (!cancelled) setState({ status: "ready", recipe });
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) setState({ status: "notfound" });
        else setState({ status: "error", message: "Couldn’t load this recipe." });
      });
    return () => {
      cancelled = true;
    };
  }, [token, session, isPending]);

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      const res = await apiFetch<{ id: number }>(`/shared-recipe/${token}/save`, { method: "POST" });
      router.push(`/recipes/${res.id}`);
    } catch {
      setSaving(false);
      setState({ status: "error", message: "Couldn’t save this recipe. Please try again." });
    }
  }

  if (!isPending && !session) {
    return (
      <div className="page-body" style={{ textAlign: "center", marginTop: 40 }}>
        <h3 style={{ fontWeight: 400 }}>A recipe has been shared with you</h3>
        <p className="text-muted" style={{ fontSize: 14 }}>
          Sign in or create a free account to view it and save it to your recipes.
        </p>
        <button type="button" className="btn btn-primary" style={{ marginTop: 8 }} onClick={stashAndSignIn}>
          Sign in to view
        </button>
      </div>
    );
  }
  if (state.status === "loading") {
    return (
      <div className="page-body">
        <p className="text-muted">Loading recipe…</p>
      </div>
    );
  }
  if (state.status === "notfound") {
    return (
      <div className="page-body" style={{ textAlign: "center", marginTop: 40 }}>
        <h3 style={{ fontWeight: 400 }}>Recipe not found</h3>
        <p className="text-muted" style={{ fontSize: 14 }}>This share link may have expired.</p>
        <Link href="/recipes" className="btn btn-primary" style={{ marginTop: 8 }}>
          Go to Fornetto
        </Link>
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

  const { recipe } = state;
  const steps = parseInstructions(recipe.instructions);

  return (
    <div className="detail">
      <div className="detail-head">
        <div className="rf-kicker">Shared recipe</div>
        <h1 className="detail-title">{recipe.title}</h1>
        <div className="detail-meta">
          {recipe.servings != null && <span>Serves {recipe.servings}</span>}
          {recipe.calories != null && <span>{recipe.calories} kcal/serving</span>}
        </div>
      </div>

      <div className="detail-body">
        {recipe.description && <p className="detail-para">{recipe.description}</p>}

        <h6 style={{ margin: 0 }}>Ingredients</h6>
        <ul className="detail-ingredients">
          {recipe.ingredients.map((ing, i) => {
            const n = Number(ing.quantity);
            const qty = ing.quantity != null && Number.isFinite(n) && n !== 0 ? `${n} ${ing.unit ?? ""}`.trim() : "";
            return (
              <li key={`${ing.name}-${i}`}>
                {qty && <span className="detail-ing-qty">{qty} </span>}
                {ing.name}
              </li>
            );
          })}
        </ul>

        {steps.length > 0 && (
          <>
            <hr className="hr" style={{ margin: "2px 0" }} />
            <h6 style={{ margin: 0 }}>Method</h6>
            <ol className="detail-steps">
              {steps.map((step, i) => (
                <li key={i} className="detail-step">
                  <span className="detail-step-n">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>

      <div className="detail-actions">
        <button type="button" className="btn btn-primary detail-add" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save to my recipes"}
        </button>
      </div>
    </div>
  );
}
