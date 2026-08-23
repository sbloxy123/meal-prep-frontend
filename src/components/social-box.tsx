"use client";

import { useEffect, useState } from "react";
import { Share2, Sparkles } from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";
import type { RecipeFormInitial } from "@/components/recipe-form";

// "Import from social" — pastes an Instagram/TikTok/YouTube post URL; the backend
// reads the caption/description and returns a draft (not persisted) that prefills
// the form. When the platform blocks the fetch (IG/TikTok login walls), the
// backend replies { needsCaption: true } and we reveal a textarea so the user can
// paste the caption directly — which always works. Mirrors ImportBox.
export function SocialBox({
  onImported,
  initialUrl = "",
  initialText = "",
  autoRun = false,
}: {
  onImported: (draft: RecipeFormInitial) => void;
  // Prefill (used by the Android share-target flow on /recipes/new).
  initialUrl?: string;
  initialText?: string;
  autoRun?: boolean;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [caption, setCaption] = useState(initialText);
  const [showPaste, setShowPaste] = useState(Boolean(initialText));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ message: string; retry: boolean } | null>(null);
  const [notice, setNotice] = useState("");

  async function run(next?: { url?: string; caption?: string }) {
    const u = (next?.url ?? url).trim();
    const c = (next?.caption ?? caption).trim();
    if (pending || (!u && !c)) return;
    setPending(true);
    setError(null);
    setNotice("");
    try {
      const res = await apiFetch<RecipeFormInitial & { needsCaption?: boolean }>(
        "/recipes/import-social",
        {
          method: "POST",
          // Prefer a pasted caption when present; otherwise send the URL.
          body: JSON.stringify(c ? { text: c, url: u || undefined } : { url: u }),
        },
      );
      if (res.needsCaption) {
        setShowPaste(true);
        setNotice(
          "Instagram and TikTok won’t share this one automatically — open the post, copy its caption and paste it here.",
        );
        return;
      }
      onImported(res);
      setUrl("");
      setCaption("");
      setShowPaste(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setError({ message: "Import limit reached — 20 per 6 hours. Try again later.", retry: false });
      } else if (err instanceof ApiError && err.status === 400) {
        setError({ message: "Couldn’t read a recipe from that. Try pasting the caption.", retry: true });
        setShowPaste(true);
      } else {
        setError({ message: "Something went wrong. Please try again.", retry: true });
      }
    } finally {
      setPending(false);
    }
  }

  // Android share-target: /recipes/new opened with a shared url/text → run once.
  useEffect(() => {
    if (autoRun && (initialUrl.trim() || initialText.trim())) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      run({ url: initialUrl, caption: initialText });
    }
    // Run only on mount for the shared payload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="ai-box">
      <div className="ai-head">
        <Share2 size={14} color="var(--color-accent)" aria-hidden />
        <span className="ai-label">Import from social</span>
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
            run();
          }
        }}
        placeholder="Instagram, TikTok or YouTube link"
        aria-label="Social post link to import"
        disabled={pending}
      />

      {showPaste ? (
        <textarea
          className="input"
          style={{ minHeight: 90, whiteSpace: "pre-wrap" }}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Paste the post caption here"
          aria-label="Post caption"
          disabled={pending}
        />
      ) : (
        <button
          type="button"
          className="btn btn-ghost"
          style={{ alignSelf: "flex-start", height: 28, fontSize: 13 }}
          onClick={() => setShowPaste(true)}
        >
          or paste the caption instead
        </button>
      )}

      {notice && <p className="ai-hint text-muted" style={{ margin: 0 }}>{notice}</p>}

      {error && (
        <p className="ai-error" role="alert">
          {error.message}
          {error.retry && (
            <>
              {" "}
              <button type="button" className="btn btn-ghost" onClick={() => run()}>
                Retry
              </button>
            </>
          )}
        </p>
      )}

      <div className="ai-foot">
        <span className="ai-hint text-muted">
          Paste a recipe post — we’ll read the caption and fill in the details for you to review.
        </span>
        <button
          type="button"
          className="btn btn-ai"
          style={{ height: 34, flex: "none" }}
          onClick={() => run()}
          disabled={pending || (!url.trim() && !caption.trim())}
        >
          <Sparkles size={15} className="btn-ai-spark" aria-hidden />
          {pending ? "Reading…" : "Import"}
        </button>
      </div>
    </div>
  );
}
