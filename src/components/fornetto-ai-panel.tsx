"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, Link2, Share2, Camera, Images, X, Loader2, AlertCircle, ChevronDown } from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";
import { fileToDownscaledBase64 } from "@/lib/image";
import { useMenu, type AiAction } from "@/lib/menu";
import { AllowanceTag, AllowanceRow, isCreditLimit, creditLimitMessage } from "@/components/ai-allowance";
import type { RecipeFormInitial } from "@/components/recipe-form";

// One consolidated "Fornetto AI" panel replacing the four peer import cards.
// A segmented control picks the route; the shared input + action + helper line
// change with it. Photo swaps the input for take/choose buttons. On success the
// draft prefills the recipe form below (via onImported) and the panel collapses
// to a one-line confirmation so the entry zone shrinks once it's done its job.
//
// NB: the design also specs a weekly AI-allowance line + "Go premium" upsell at
// the card foot — deferred until premium ships. See design/README.md ("Allowance
// row") and design/Add Recipe - AI Panel.dc.html to build it to match.

type Route = "link" | "social" | "title" | "photo";
const MAX_PHOTOS = 4;
// What the backend charges each route as (credits come from the household's
// weight snapshot: most things 1, a photo scan 3).
const ROUTE_ACTION: Record<Route, AiAction> = { link: "import", social: "social", title: "generate", photo: "photo" };

const ROUTES: Record<
  Route,
  { placeholder: string; action: string; pending: string; help: string }
> = {
  link: {
    placeholder: "https://example.com/recipe",
    action: "Import",
    pending: "Reading…",
    help: "We’ll read the page and fill in the details below for you to review.",
  },
  social: {
    placeholder: "Instagram, TikTok or YouTube link",
    action: "Import",
    pending: "Reading…",
    help: "We’ll read the caption — or paste it yourself if the post is private.",
  },
  title: {
    placeholder: "e.g. Thai green chicken curry",
    action: "Generate",
    pending: "Drafting…",
    help: "We’ll draft the ingredients and method for you to review and tweak.",
  },
  photo: {
    placeholder: "",
    action: "Extract",
    pending: "Reading…",
    help: "Snap a cookbook page — or both pages of a spread — and we’ll read it.",
  },
};

interface Photo {
  file: File;
  url: string;
}

export function FornettoAiPanel({
  onImported,
  shared,
  collapsed = false,
  onToggle,
}: {
  onImported: (draft: RecipeFormInitial) => void;
  // Android share-target payload from /recipes/new (?url / ?text).
  shared?: { route: Route; value: string } | null;
  // Collapse is controlled by the page (collapses after a successful import).
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  const [route, setRoute] = useState<Route>(shared?.route ?? "title");
  const [value, setValue] = useState(shared?.value ?? "");
  const [caption, setCaption] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [needsCaption, setNeedsCaption] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ message: string; retry: boolean } | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const captionRef = useRef<HTMLTextAreaElement>(null);
  const menu = useMenu();
  const { allowance } = menu;

  const cfg = ROUTES[route];

  // Revoke object URLs on unmount (add/remove revoke as they go).
  const photosRef = useRef(photos);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  useEffect(() => {
    if (needsCaption) captionRef.current?.focus();
  }, [needsCaption]);

  function pickRoute(next: Route) {
    setRoute(next);
    setError(null);
    setNeedsCaption(false);
    // value is intentionally preserved across the three text routes.
  }

  function addFiles(input: HTMLInputElement) {
    const list = input.files;
    if (!list || list.length === 0) return;
    setError(null);
    setPhotos((prev) => {
      const additions = Array.from(list).map((file) => ({ file, url: URL.createObjectURL(file) }));
      const combined = [...prev, ...additions];
      combined.slice(MAX_PHOTOS).forEach((p) => URL.revokeObjectURL(p.url));
      return combined.slice(0, MAX_PHOTOS);
    });
    input.value = "";
  }
  function removeAt(i: number) {
    setPhotos((prev) => {
      const t = prev[i];
      if (t) URL.revokeObjectURL(t.url);
      return prev.filter((_, idx) => idx !== i);
    });
  }

  function fail(message: string, retry: boolean) {
    setError({ message, retry });
  }

  async function run() {
    if (pending) return;
    setError(null);
    setNeedsCaption(false);

    // Bail on an empty input before the spend confirmation, so a stray tap
    // never costs the user a dialog. Mirrors actionDisabled.
    const hasInput =
      route === "photo"
        ? photos.length > 0
        : route === "social"
          ? value.trim() !== "" || caption.trim() !== ""
          : value.trim() !== "";
    if (!hasInput) return;
    // Every route below spends AI credits. Confirming here (rather than on the
    // button) also covers the Enter key and the share-target auto-run.
    if (!allowance.canAfford(ROUTE_ACTION[route])) return;
    if (!(await menu.confirmAiSpend(ROUTE_ACTION[route]))) return;

    try {
      let draft: RecipeFormInitial;

      if (route === "link") {
        const url = value.trim();
        if (!url) return;
        setPending(true);
        draft = await apiFetch<RecipeFormInitial>("/recipes/import", {
          method: "POST",
          body: JSON.stringify({ url }),
        });
      } else if (route === "title") {
        const title = value.trim();
        if (!title) return;
        setPending(true);
        draft = await apiFetch<RecipeFormInitial>("/recipes/generate-from-title", {
          method: "POST",
          body: JSON.stringify({ title }),
        });
      } else if (route === "photo") {
        if (photos.length === 0) return;
        setPending(true);
        const images = await Promise.all(photos.map((p) => fileToDownscaledBase64(p.file)));
        draft = await apiFetch<RecipeFormInitial>("/recipes/parse-from-photo", {
          method: "POST",
          body: JSON.stringify({ images }),
        });
      } else {
        // social
        const url = value.trim();
        const cap = caption.trim();
        if (!url && !cap) return;
        setPending(true);
        const res = await apiFetch<RecipeFormInitial & { needsCaption?: boolean }>(
          "/recipes/import-social",
          {
            method: "POST",
            body: JSON.stringify(cap ? { text: cap, url: url || undefined } : { url }),
          },
        );
        if (res.needsCaption) {
          setShowPaste(true);
          setNeedsCaption(true);
          setPending(false);
          return;
        }
        draft = res;
      }

      onImported(draft);
      // The action has been spent — pull the fresh count so the allowance tag
      // and the spend confirmation aren't a step behind.
      void menu.refresh();
      // Clear transient inputs so a reopened panel is fresh. The page collapses
      // the panel + expands the form in its onImported handler.
      setValue("");
      setCaption("");
      setPhotos((prev) => {
        prev.forEach((p) => URL.revokeObjectURL(p.url));
        return [];
      });
      setShowPaste(false);
      setNeedsCaption(false);
    } catch (err) {
      handleError(err);
    } finally {
      setPending(false);
    }
  }

  function handleError(err: unknown) {
    const status = err instanceof ApiError ? err.status : 0;
    if (isCreditLimit(err)) {
      fail(creditLimitMessage(err), false);
      return;
    }
    if (status === 429) {
      const per =
        route === "title" ? "15 generations" : route === "photo" ? "15 photo scans" : "20 imports";
      fail(`Limit reached — ${per} per 6 hours. Try again later.`, false);
      return;
    }
    if (route === "social" && status === 400) {
      fail("Couldn’t find a recipe in that caption — check you copied it all, then try again.", true);
      setShowPaste(true);
      return;
    }
    if (status === 400) {
      fail("We couldn’t read that. Try a different link, or paste the recipe text.", true);
      return;
    }
    if (status === 413) {
      fail("Those photos are too large.", true);
      return;
    }
    fail("Something went wrong. Please try again.", true);
  }

  // Android share-target: auto-run once on mount if a payload was shared in.
  useEffect(() => {
    if (shared && shared.value.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      run();
    }
    // Run only on mount for the shared payload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Collapsed bar (a draft was made, or the user collapsed it) ───────────
  if (collapsed) {
    return (
      <button type="button" className="card ai-panel ai-panel--done" onClick={onToggle} aria-expanded={false}>
        <span className="ai-panel-doneline">
          <Sparkles size={15} aria-hidden />
          Draft a recipe with Fornetto AI
        </span>
        <span className="rf-head-toggle-cue">
          <span className="rf-head-open">Open</span>
          <span className="rf-toggle-chevron">
            <ChevronDown size={18} className="rf-chevron" aria-hidden />
          </span>
        </span>
      </button>
    );
  }

  const actionDisabled =
    pending ||
    !allowance.canAfford(ROUTE_ACTION[route]) ||
    (route === "photo" ? photos.length === 0 : !value.trim() && !caption.trim());
  const igPending = pending && route === "social" && /instagram\.com/i.test(value) && !caption.trim();

  return (
    <div className="card ai-panel">
      <div className="ai-panel-head">
        <Sparkles size={16} className="ai-panel-spark" aria-hidden />
        <span className="card-kicker">Fornetto AI</span>
        <AllowanceTag allowance={allowance} />
        {onToggle && (
          <button
            type="button"
            className="rf-toggle-chevron ai-panel-collapse-btn"
            aria-expanded
            aria-label="Collapse Fornetto AI"
            onClick={onToggle}
          >
            <ChevronDown size={18} className="rf-chevron is-open" aria-hidden />
          </button>
        )}
      </div>

      <div>
        <h1 className="ai-panel-title">Let it write the recipe</h1>
        <p className="ai-panel-pitch">
          Point it at a link, a post, a title or a photo — we’ll draft the ingredients and method
          for you to review.
        </p>
      </div>

      <div className="seg ai-seg" role="radiogroup" aria-label="How should we get the recipe?">
        {(
          [
            ["title", "Title", Sparkles],
            ["link", "Link", Link2],
            ["social", "Social", Share2],
            ["photo", "Photo", Camera],
          ] as const
        ).map(([key, label, Icon]) => (
          <label key={key} className="seg-opt">
            <input
              type="radio"
              name="ai-route"
              value={key}
              checked={route === key}
              onChange={() => pickRoute(key)}
              disabled={pending}
            />
            <Icon size={15} aria-hidden />
            {label}
          </label>
        ))}
      </div>

      {route === "photo" ? (
        <>
          <div className="ai-panel-photobtns">
            <label className="btn btn-secondary" data-disabled={pending || undefined}>
              <Camera size={16} aria-hidden style={{ marginRight: 6 }} />
              Take photo
              <input
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={(e) => addFiles(e.currentTarget)}
                disabled={pending || photos.length >= MAX_PHOTOS}
              />
            </label>
            <label className="btn btn-secondary" data-disabled={pending || undefined}>
              <Images size={16} aria-hidden style={{ marginRight: 6 }} />
              Choose
              <input
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => addFiles(e.currentTarget)}
                disabled={pending || photos.length >= MAX_PHOTOS}
              />
            </label>
          </div>
          {photos.length > 0 && (
            <ul className="ai-thumbs">
              {photos.map((photo, i) => (
                <li key={photo.url} className="ai-thumb">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.url} alt={`Recipe photo ${i + 1}`} />
                  <button
                    type="button"
                    className="ai-thumb-remove"
                    onClick={() => removeAt(i)}
                    aria-label={`Remove photo ${i + 1}`}
                    disabled={pending}
                  >
                    <X size={12} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {photos.length > 0 && (
            <button
              type="button"
              className="btn btn-ai ai-panel-action"
              style={{ alignSelf: "flex-start" }}
              onClick={run}
              disabled={pending || !allowance.canAfford("photo")}
            >
              <Sparkles size={14} className="btn-ai-spark" aria-hidden />
              {pending ? "Reading…" : "Extract"}
            </button>
          )}
        </>
      ) : (
        <div className="ai-panel-inputrow">
          <input
            className="input"
            type={route === "title" ? "text" : "url"}
            inputMode={route === "title" ? "text" : "url"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                run();
              }
            }}
            placeholder={cfg.placeholder}
            aria-label={cfg.placeholder}
            disabled={pending}
          />
          <button
            type="button"
            className="btn btn-ai ai-panel-action"
            onClick={run}
            disabled={actionDisabled}
          >
            <Sparkles size={14} className="btn-ai-spark" aria-hidden />
            {pending ? cfg.pending : cfg.action}
          </button>
        </div>
      )}

      {/* Social: paste-the-caption fallback field. */}
      {route === "social" && showPaste && (
        <label className="social-caption-field">
          <span className="social-caption-label">Post caption</span>
          <textarea
            ref={captionRef}
            className={`input${needsCaption ? " social-caption-input--flag" : ""}`}
            style={{ minHeight: 80, whiteSpace: "pre-wrap" }}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Paste the post caption here"
            aria-label="Post caption"
            disabled={pending}
          />
        </label>
      )}
      {route === "social" && !showPaste && !pending && (
        <button
          type="button"
          className="btn btn-ghost ai-panel-pastetoggle"
          onClick={() => setShowPaste(true)}
        >
          or paste the caption instead
        </button>
      )}

      {/* Fetching indicator (Instagram in particular is slow). */}
      {pending && (
        <div className="social-callout" role="status">
          <Loader2 size={16} className="social-spin" aria-hidden />
          <span>
            {igPending ? (
              <>Fetching from Instagram — this can take <strong>up to a minute</strong>. Hang tight…</>
            ) : (
              "Working on it…"
            )}
          </span>
        </div>
      )}

      {/* needsCaption prompt (link couldn't be read). */}
      {needsCaption && !pending && (
        <div className="social-callout" role="status">
          <AlertCircle size={16} aria-hidden />
          <span>
            <strong>Couldn’t read that link automatically.</strong> Instagram and TikTok usually
            block it — copy the post’s caption and paste it above.
          </span>
        </div>
      )}

      {/* Helper line, or the error line in its place. */}
      {error ? (
        <p className="ai-panel-error" role="alert">
          {error.message}
          {error.retry && (
            <>
              {" "}
              <button type="button" className="btn btn-ghost" onClick={run}>
                Retry
              </button>
            </>
          )}
        </p>
      ) : (
        !pending && <p className="ai-panel-help">{cfg.help}</p>
      )}

      <AllowanceRow source="add_recipe_allowance_row" />
    </div>
  );
}
