"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";
import type { AdminRecipeDetail, AdminUserDetail } from "@/lib/types";
import { useModalA11y } from "@/lib/use-modal";
import { DataTable, type Column } from "./data-table";
import { PLATFORM_LABEL } from "../lib/constants";
import { Stat, SubTitle, Empty } from "./primitives";
import { fmtDate, fmtPence, relative, cap } from "../lib/format";

// One person, proportionately: plan, household, activity and their recipes as
// titles + metadata. Opening a full recipe is the intrusive step — it asks for
// a reason, which the backend stores with the access log entry.

const ACTIVITY_LABEL: Record<string, string> = {
  onboarding_shown: "Saw the questionnaire", onboarding_completed: "Completed the questionnaire", onboarding_skipped: "Skipped the questionnaire",
  week_add: "Added a recipe to the week", list_generated: "Generated the list", shop_finished: "Finished a shop",
  trial_started: "Trial started", trial_prompt: "Trial prompt", trial_converted: "Trial → paid", checkout_started: "Started checkout",
  subscription_cancelled: "Cancelled subscription", household_limit_hit: "Hit the household limit", premium_cta: "Tapped Go Premium",
  install_standalone_open: "Opened the installed app", recipe_created: "Added a recipe", recipe_shared: "Shared a recipe",
};

export function UserDrawer({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [data, setData] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openRecipe, setOpenRecipe] = useState<number | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  useModalA11y(modalRef, onClose);

  useEffect(() => {
    let cancelled = false;
    apiFetch<AdminUserDetail>(`/admin/users/${encodeURIComponent(userId)}`)
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setError("Couldn’t load this person."); });
    return () => { cancelled = true; };
  }, [userId]);

  const recipeColumns: Column<AdminUserDetail["recipes"][number]>[] = [
    { key: "title", label: "Recipe", mobile: "title", render: (r) => <>{r.title || "Untitled"}{!r.mine && <span className="admin-muted"> · another member</span>}</> },
    { key: "source", label: "Source", mobile: "pill", render: (r) => <span className="admin-pill">{cap(r.source ?? "unknown")}</span> },
    { key: "created_at", label: "Added", render: (r) => fmtDate(r.created_at) },
    { key: "tags", label: "Collections", render: (r) => (r.tags.length ? r.tags.join(", ") : "—") },
    { key: "ingredients", label: "Ingr.", numeric: true, render: (r) => r.ingredients },
    { key: "times_on_menu", label: "Weeks", numeric: true, render: (r) => `${r.times_on_menu}×${r.is_on_menu ? " (now)" : ""}` },
    { key: "flags", label: "", mobile: "hide", render: (r) => <>{r.has_photo && "📷 "}{r.favorite && "★ "}{r.has_link && "🔗"}</> },
    { key: "open", label: "", mobile: "stat", render: (r) => <button type="button" className="btn btn-ghost admin-open-recipe" onClick={() => setOpenRecipe(r.id)}>Open</button> },
  ];

  return (
    <div className="admin-drawer-backdrop" onClick={onClose}>
      <div className="admin-drawer" role="dialog" aria-modal="true" aria-label="User detail" ref={modalRef} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="admin-drawer-close" onClick={onClose} aria-label="Close"><X size={18} aria-hidden /></button>
        {error && <Empty>{error}</Empty>}
        {!data && !error && <Empty>Loading…</Empty>}
        {data && (
          <>
            <h2 className="admin-drawer-title">{data.user.name || data.user.email}</h2>
            <p className="admin-user-email">{data.user.email}{!data.user.email_verified && " · unverified"}</p>
            <div className="admin-stat-grid" style={{ margin: "12px 0" }}>
              <Stat label="Plan" text={data.entitlement ? cap(data.entitlement.plan) : "—"} />
              <Stat label="Credits this period" text={data.entitlement ? `${data.entitlement.credits.used} / ${data.entitlement.credits.allowance ?? "∞"}` : "—"} />
              <Stat label="Joined" text={fmtDate(data.user.created_at)} />
              <Stat label="Onboarding" text={data.user.onboarding_outcome ? cap(data.user.onboarding_outcome.replace("_", " ")) : "not yet"} />
              <Stat label="Household" text={data.household ? `${data.household.name ?? "—"} · ${data.household.members.length}` : "—"} />
              <Stat label="AI actions" value={data.ai.reduce((a, r) => a + r.count, 0)} />
              <Stat
                label="Installed app"
                text={data.user.installed_at
                  ? `${PLATFORM_LABEL[data.user.installed_platform ?? "unknown"] ?? "Yes"} · ${data.user.standalone_days_30} of ${data.user.active_days_30} active days (30d)`
                  : "Browser only"}
              />
            </div>
            {data.household && data.household.members.length > 1 && (
              <p className="admin-section-note">Members: {data.household.members.map((m) => `${m.name || m.email} (${m.role})`).join(", ")}</p>
            )}

            <SubTitle>Recipes · {data.recipes.length}</SubTitle>
            <p className="admin-section-note">Titles and metadata only. &ldquo;Open&rdquo; shows the full recipe and is logged with your reason.</p>
            <DataTable columns={recipeColumns} rows={data.recipes} rowKey={(r) => r.id} compact empty="No recipes yet." />

            {data.ai.length > 0 && (
              <>
                <SubTitle>AI use · all time</SubTitle>
                <p className="admin-section-note">{data.ai.map((a) => `${cap(a.action)} ${a.count}${a.costPence ? ` (${fmtPence(a.costPence)})` : ""}`).join(" · ")}</p>
              </>
            )}

            <SubTitle>Recent activity</SubTitle>
            {data.activity.length === 0 ? <Empty>Nothing logged yet.</Empty> : (
              <ul className="admin-timeline">
                {data.activity.map((a, i) => (
                  <li key={i}><span className="admin-timeline-when">{relative(a.at)}</span> {ACTIVITY_LABEL[a.type] ?? a.type}{a.type === "premium_cta" && a.meta?.source ? ` (${String(a.meta.source)})` : ""}</li>
                ))}
              </ul>
            )}
          </>
        )}
        {openRecipe != null && <RecipeModal recipeId={openRecipe} onClose={() => setOpenRecipe(null)} />}
      </div>
    </div>
  );
}

function RecipeModal({ recipeId, onClose }: { recipeId: number; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [data, setData] = useState<AdminRecipeDetail["recipe"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useModalA11y(ref, onClose);

  async function open() {
    if (reason.trim().length < 3 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const d = await apiFetch<AdminRecipeDetail>(`/admin/recipes/${recipeId}?reason=${encodeURIComponent(reason.trim())}`);
      setData(d.recipe);
    } catch (e) {
      let msg = "Couldn’t open this recipe.";
      if (e instanceof ApiError) { try { msg = JSON.parse(e.body)?.error ?? msg; } catch { /* keep */ } }
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal" role="dialog" aria-modal="true" aria-label="Recipe" ref={ref} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="admin-drawer-close" onClick={onClose} aria-label="Close"><X size={18} aria-hidden /></button>
        {!data ? (
          <>
            <h3 className="admin-drawer-title">Open the full recipe?</h3>
            <p className="admin-section-note">This shows everything the person wrote. Say why in a few words — it goes in the access log.</p>
            <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. support: import came back empty" aria-label="Reason" autoFocus />
            {error && <p className="admin-note-err">{error}</p>}
            <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
              <button type="button" className="btn btn-secondary" onClick={open} disabled={busy || reason.trim().length < 3}>{busy ? "Opening…" : "Open recipe"}</button>
              <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            </div>
          </>
        ) : (
          <>
            <h3 className="admin-drawer-title">{data.title || "Untitled"}</h3>
            <p className="admin-section-note">
              Added {fmtDate(data.created_at)}{data.added_by_email ? ` by ${data.added_by_email}` : ""}{data.tags.length ? ` · ${data.tags.join(", ")}` : ""}
              {data.link_url ? <> · <a className="admin-link" href={data.link_url} target="_blank" rel="noreferrer">source link</a></> : null}
            </p>
            {data.description && <p>{data.description}</p>}
            <SubTitle top={8}>Ingredients</SubTitle>
            <ul className="admin-recipe-list">
              {data.ingredients.map((i, idx) => <li key={idx}>{[i.quantity && Number(i.quantity) ? i.quantity : null, i.unit, i.name].filter(Boolean).join(" ")}</li>)}
            </ul>
            <SubTitle>Method</SubTitle>
            <ol className="admin-recipe-list">
              {(data.instructions ?? "").split("\n").filter((l) => l.trim()).map((l, idx) => <li key={idx}>{l}</li>)}
            </ol>
          </>
        )}
      </div>
    </div>
  );
}
