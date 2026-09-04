"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { apiFetch } from "@/lib/api";

// "Add with AI" — pastes free text, POST /shopping-list/parse-ingredients splits
// it into custom items. §8.3: the button is disabled + shows a pending label
// while the (real, multi-second) AI call is in flight, guarding double submits,
// and a failure surfaces an inline error with retry.
export function AiBox({ onDone }: { onDone: () => Promise<void> }) {
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function submit() {
    if (!text.trim() || pending) return;
    setPending(true);
    setError(false);
    try {
      await apiFetch("/shopping-list/parse-ingredients", {
        method: "POST",
        body: JSON.stringify({ ingredients_text: text }),
      });
      setText("");
      await onDone();
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="ai-box">
      <div className="ai-head">
        <Sparkles size={14} color="var(--color-accent)" aria-hidden />
        <span className="ai-label">Add with AI</span>
      </div>
      <textarea
        className="input ai-textarea"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="milk, kitchen roll, 2 tins chopped toms, coffee…"
        aria-label="Paste items to add with AI"
        disabled={pending}
      />
      {error && (
        <p className="ai-error" role="alert">
          Couldn&rsquo;t sort that.{" "}
          <button type="button" className="btn btn-ghost" onClick={submit}>
            Retry
          </button>
        </p>
      )}
      <div className="ai-foot">
        <span className="ai-hint text-muted">
          Type it however you like — it gets split into separate items. Free, no credits used.
        </span>
        <button
          type="button"
          className="btn btn-ai"
          style={{ height: 34, flex: "none" }}
          onClick={submit}
          disabled={pending || !text.trim()}
        >
          <Sparkles size={15} className="btn-ai-spark" aria-hidden />
          {pending ? "Sorting…" : "Sort it"}
        </button>
      </div>
    </div>
  );
}
