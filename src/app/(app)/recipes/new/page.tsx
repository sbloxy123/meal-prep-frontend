"use client";

import { useEffect, useState } from "react";
import { ImportBox } from "@/components/import-box";
import { GenerateBox } from "@/components/generate-box";
import { ParsePhotoBox } from "@/components/parse-photo-box";
import { SocialBox } from "@/components/social-box";
import { RecipeForm, type RecipeFormInitial } from "@/components/recipe-form";

export default function NewRecipePage() {
  const [draft, setDraft] = useState<RecipeFormInitial | null>(null);
  // RecipeForm seeds its state from `initial` only on mount, so bump the key when a
  // fresh import/generation arrives to force a re-initialisation with those values.
  const [draftVersion, setDraftVersion] = useState(0);
  // Android share-target payload: the manifest points share_target at this page,
  // so a link/caption shared from TikTok/IG arrives as ?url=/?text= — hand it to
  // SocialBox to auto-run. Read once on mount, then strip the query.
  const [shared, setShared] = useState<{ url: string; text: string } | null>(null);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const rawUrl = sp.get("url") ?? "";
    const rawText = sp.get("text") ?? "";
    if (!rawUrl && !rawText) return;
    // Android usually delivers a shared link inside `text`; pull it out if so.
    const linkInText = rawText.match(/https?:\/\/\S+/);
    const url = rawUrl || (linkInText ? linkInText[0] : "");
    const text = linkInText ? "" : rawText;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShared({ url, text });
    window.history.replaceState(null, "", "/recipes/new");
  }, []);

  function handleImported(next: RecipeFormInitial) {
    setDraft(next);
    setDraftVersion((v) => v + 1);
  }

  return (
    <>
      <div className="rf-import">
        <ImportBox onImported={handleImported} />
        <SocialBox
          key={shared ? "shared" : "empty"}
          onImported={handleImported}
          initialUrl={shared?.url ?? ""}
          initialText={shared?.text ?? ""}
          autoRun={Boolean(shared)}
        />
        <GenerateBox onGenerated={handleImported} />
        <ParsePhotoBox onParsed={handleImported} />
      </div>
      <RecipeForm mode="create" initial={draft ?? undefined} key={draftVersion} />
    </>
  );
}
