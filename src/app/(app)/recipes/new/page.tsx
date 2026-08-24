"use client";

import { useEffect, useState } from "react";
import { FornettoAiPanel } from "@/components/fornetto-ai-panel";
import { RecipeForm, type RecipeFormInitial } from "@/components/recipe-form";

type Shared = { route: "link" | "social" | "title" | "photo"; value: string };

const SOCIAL_HOST = /(instagram\.com|tiktok\.com|youtube\.com|youtu\.be)/i;

export default function NewRecipePage() {
  const [draft, setDraft] = useState<RecipeFormInitial | null>(null);
  // RecipeForm seeds its state from `initial` only on mount, so bump the key when a
  // fresh import/generation arrives to force a re-initialisation with those values.
  const [draftVersion, setDraftVersion] = useState(0);
  // Android share-target payload (manifest points share_target at this page).
  const [shared, setShared] = useState<Shared | null>(null);
  // The AI panel leads (open); the manual form is a collapsed fallback. A
  // successful import flips both: collapse the panel, expand the populated form.
  const [aiOpen, setAiOpen] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const rawUrl = sp.get("url") ?? "";
    const rawText = sp.get("text") ?? "";
    if (!rawUrl && !rawText) return;
    // Android usually delivers a shared link inside `text`; pull it out if so.
    const link = rawUrl || (rawText.match(/https?:\/\/\S+/)?.[0] ?? "");
    let next: Shared | null = null;
    if (link) next = { route: SOCIAL_HOST.test(link) ? "social" : "link", value: link };
    else if (rawText.trim()) next = { route: "title", value: rawText.trim() };
    if (next) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShared(next);
      window.history.replaceState(null, "", "/recipes/new");
    }
  }, []);

  function handleImported(next: RecipeFormInitial) {
    setDraft(next);
    setDraftVersion((v) => v + 1);
    setAiOpen(false);
    setFormOpen(true);
    // Bring the now-populated form into view once it's re-rendered.
    requestAnimationFrame(() =>
      document.getElementById("recipe-details")?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }

  return (
    <>
      <div className="ai-panel-region">
        <FornettoAiPanel
          key={shared ? "shared" : "empty"}
          onImported={handleImported}
          shared={shared}
          collapsed={!aiOpen}
          onToggle={() => setAiOpen((v) => !v)}
        />
      </div>
      <div id="recipe-details">
        <RecipeForm
          mode="create"
          initial={draft ?? undefined}
          key={draftVersion}
          collapsible
          open={formOpen}
          onToggle={() => setFormOpen((v) => !v)}
        />
      </div>
    </>
  );
}
