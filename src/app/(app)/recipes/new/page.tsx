"use client";

import { useState } from "react";
import { ImportBox } from "@/components/import-box";
import { RecipeForm, type RecipeFormInitial } from "@/components/recipe-form";

export default function NewRecipePage() {
  const [draft, setDraft] = useState<RecipeFormInitial | null>(null);
  // RecipeForm seeds its state from `initial` only on mount, so bump the key when a
  // fresh import arrives to force a re-initialisation with the imported values.
  const [draftVersion, setDraftVersion] = useState(0);

  function handleImported(next: RecipeFormInitial) {
    setDraft(next);
    setDraftVersion((v) => v + 1);
  }

  return (
    <>
      <div className="rf-import">
        <ImportBox onImported={handleImported} />
      </div>
      <RecipeForm mode="create" initial={draft ?? undefined} key={draftVersion} />
    </>
  );
}
