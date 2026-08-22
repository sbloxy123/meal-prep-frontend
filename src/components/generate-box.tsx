"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";
import type { RecipeFormInitial } from "@/components/recipe-form";

// "Generate from a title" — type a dish name, POST /recipes/generate-from-title
// returns an AI-drafted recipe (ingredients + method) that prefills the form for
// review-then-save. Mirrors ImportBox; 429 = the 15-per-6h generation cap.
export function GenerateBox({ onGenerated }: { onGenerated: (draft: RecipeFormInitial) => void }) {
  const [title, setTitle] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ message: string; retry: boolean } | null>(null);

  async function submit() {
    if (!title.trim() || pending) return;
    setPending(true);
    setError(null);
    try {
      const draft = await apiFetch<RecipeFormInitial>("/recipes/generate-from-title", {
        method: "POST",
        body: JSON.stringify({ title: title.trim() }),
      });
      setTitle("");
      onGenerated(draft);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setError({ message: "Generation limit reached — 15 per 6 hours. Try again later.", retry: false });
      } else {
        setError({ message: "Couldn’t generate that recipe. Please try again.", retry: true });
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="ai-box">
      <div className="ai-head">
        <Sparkles size={14} color="var(--color-accent)" aria-hidden />
        <span className="ai-label">Generate from a title</span>
      </div>
      <input
        className="input"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="e.g. Thai green chicken curry"
        aria-label="Recipe title to generate"
        disabled={pending}
      />
      {error && (
        <p className="ai-error" role="alert">
          {error.message}
          {error.retry && (
            <>
              {" "}
              <button type="button" className="btn btn-ghost" onClick={submit}>
                Retry
              </button>
            </>
          )}
        </p>
      )}
      <div className="ai-foot">
        <span className="ai-hint text-muted">
          We’ll draft the ingredients and method — you review and tweak before saving.
        </span>
        <button
          type="button"
          className="btn btn-primary"
          style={{ height: 34, flex: "none" }}
          onClick={submit}
          disabled={pending || !title.trim()}
        >
          {pending ? "Generating…" : "Generate"}
        </button>
      </div>
    </div>
  );
}
