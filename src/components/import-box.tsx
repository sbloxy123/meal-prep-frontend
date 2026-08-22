"use client";

import { useState } from "react";
import { Link2 } from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";
import type { RecipeFormInitial } from "@/components/recipe-form";

// "Import from a link" — pastes a recipe URL, POST /recipes/import fetches the page
// and returns a draft recipe (not persisted) that prefills the form below for review.
// Mirrors the AiBox pattern: the button is disabled + shows a pending label while the
// (real, multi-second) fetch+AI call is in flight, and failures surface an inline error.
// Errors are distinguished by status: 429 = rate limit (no retry), 400 = unreadable link.
export function ImportBox({ onImported }: { onImported: (draft: RecipeFormInitial) => void }) {
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ message: string; retry: boolean } | null>(null);

  async function submit() {
    if (!url.trim() || pending) return;
    setPending(true);
    setError(null);
    try {
      const draft = await apiFetch<RecipeFormInitial>("/recipes/import", {
        method: "POST",
        body: JSON.stringify({ url: url.trim() }),
      });
      setUrl("");
      onImported(draft);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setError({ message: "Import limit reached — 20 per 6 hours. Try again later.", retry: false });
      } else if (err instanceof ApiError && err.status === 400) {
        setError({ message: "Couldn’t read a recipe from that link.", retry: true });
      } else {
        setError({ message: "Something went wrong. Please try again.", retry: true });
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="ai-box">
      <div className="ai-head">
        <Link2 size={14} color="var(--color-accent)" aria-hidden />
        <span className="ai-label">Import from a link</span>
      </div>
      <input
        className="input"
        type="url"
        inputMode="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="https://example.com/recipe"
        aria-label="Recipe link to import"
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
          Paste a recipe page — we’ll fill in the details below for you to review.
        </span>
        <button
          type="button"
          className="btn btn-primary"
          style={{ height: 34, flex: "none" }}
          onClick={submit}
          disabled={pending || !url.trim()}
        >
          {pending ? "Reading…" : "Import"}
        </button>
      </div>
    </div>
  );
}
