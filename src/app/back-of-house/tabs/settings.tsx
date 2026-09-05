"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ApiError, apiFetch } from "@/lib/api";
import type { AdminConfig } from "@/lib/types";
import { fmtDate, relative } from "../lib/format";
import type { AdminAccessLog } from "@/lib/types";
import { useAdminData } from "../lib/use-admin-data";
import { Section, Empty } from "../components/primitives";

export function SettingsTab() {
  return (
    <>
      <ConfigSection />
      <PremiumGrantsSection />
      <AccessLogSection />
    </>
  );
}

// Every time an admin opened a person or a full recipe, with the reason given.
function AccessLogSection() {
  const { data } = useAdminData<AdminAccessLog>("/admin/access-log");
  const entries = data?.entries ?? [];
  return (
    <Section title="Access log" note="Who looked at whom from this dashboard, and why. Kept so there is an answer if a user ever asks.">
      {entries.length === 0 ? <Empty>Nothing yet.</Empty> : (
        <ul className="admin-timeline">
          {entries.map((e, i) => (
            <li key={i}>
              <span className="admin-timeline-when">{relative(e.at)}</span> {e.admin ?? "admin"}{" "}
              {e.type === "admin_viewed_recipe" ? `opened recipe #${e.recipe_id}` : "viewed"} {e.target ?? "?"}
              {e.reason ? <> — <em>{e.reason}</em></> : null}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function adminErrMsg(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    try {
      return (JSON.parse(err.body)?.error as string) || fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

type Comp = { id: string; emails: string[]; created_at: string | null };

function PremiumGrantsSection() {
  const [comps, setComps] = useState<Comp[] | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  function load() {
    apiFetch<{ comps: Comp[] }>("/admin/premium/comps")
      .then((d) => setComps(d.comps ?? []))
      .catch(() => setComps([]));
  }
  // Load once on mount.
  useEffect(load, []);

  async function grant(e: FormEvent) {
    e.preventDefault();
    const addr = email.trim();
    if (!addr || busy) return;
    setBusy(true);
    setNote(null);
    try {
      await apiFetch("/admin/premium/grant", {
        method: "POST",
        body: JSON.stringify({ email: addr }),
      });
      setNote({ kind: "ok", text: `${addr} is now Premium.` });
      setEmail("");
      load();
    } catch (err) {
      setNote({ kind: "err", text: adminErrMsg(err, "Couldn’t grant Premium.") });
    } finally {
      setBusy(false);
    }
  }

  async function revoke(addr: string) {
    if (busy) return;
    setBusy(true);
    setNote(null);
    try {
      await apiFetch("/admin/premium/revoke", {
        method: "POST",
        body: JSON.stringify({ email: addr }),
      });
      setNote({ kind: "ok", text: `${addr} reverted to free.` });
      load();
    } catch (err) {
      setNote({ kind: "err", text: adminErrMsg(err, "Couldn’t revoke.") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-section">
      <h2>Premium grants</h2>
      <p className="admin-section-note">
        Comp a household to Premium (unlimited AI, no charge, no expiry) by a member’s email. Revoke
        drops it back to free. Paid subscribers aren’t listed here — manage those in Stripe.
      </p>
      <form className="admin-controls" onSubmit={grant}>
        <input
          className="input admin-search"
          type="email"
          placeholder="friend@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={busy}
        />
        <button type="submit" className="btn btn-ai" disabled={busy || !email.trim()}>
          Grant Premium
        </button>
      </form>
      {note && (
        <p className={note.kind === "err" ? "admin-note-err" : "admin-note-ok"} role="status">
          {note.text}
        </p>
      )}
      {comps == null ? null : comps.length === 0 ? (
        <p className="admin-empty" style={{ marginTop: 12 }}>
          No comped households yet.
        </p>
      ) : (
        <div className="admin-rows" style={{ marginTop: 12 }}>
          {comps.map((c) => (
            <div key={c.id} className="admin-grant-row">
              <span className="admin-row-label">{c.emails.join(", ") || "(no members)"}</span>
              <button
                type="button"
                className="btn btn-ghost admin-revoke"
                onClick={() => revoke(c.emails[0] ?? "")}
                disabled={busy || c.emails.length === 0}
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

const CONFIG_FIELDS: {
  key: keyof AdminConfig["config"];
  label: string;
  help: string;
  kind: "int" | "int-or-null" | "json" | "string-or-null";
}[] = [
  { key: "trial_days", label: "Trial length (days)", help: "Full Premium from signup, no card. New signups only.", kind: "int" },
  { key: "free_credit_allowance", label: "Free credits / month", help: "Per household, on the signup anniversary. Blank = unlimited.", kind: "int-or-null" },
  { key: "premium_credit_allowance", label: "Premium & trial credits / month", help: "Soft cap. Blank = unlimited (what a comp gets).", kind: "int-or-null" },
  { key: "credit_weights", label: "Credits per action", help: "JSON, action → credits. 0 = free (the shopping list must stay 0).", kind: "json" },
  { key: "member_limit_free", label: "Free household size", help: "Members a free household can have. Existing households keep theirs.", kind: "int" },
  { key: "founders_coupon", label: "Founders’ coupon id", help: "Stripe coupon applied to annual checkouts while it has redemptions left. Blank = off.", kind: "string-or-null" },
  { key: "founders_cap", label: "Founders’ cap", help: "For display only — Stripe enforces max_redemptions.", kind: "int" },
];

function ConfigSection() {
  const [data, setData] = useState<AdminConfig | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  function load() {
    apiFetch<AdminConfig>("/admin/config")
      .then((d) => {
        setData(d);
        const next: Record<string, string> = {};
        for (const f of CONFIG_FIELDS) {
          const v = d.config[f.key];
          next[f.key] = v == null ? "" : f.kind === "json" ? JSON.stringify(v) : String(v);
        }
        setDrafts(next);
      })
      .catch(() => setData(null));
  }
  // Load once on mount.
  useEffect(load, []);

  async function save(f: (typeof CONFIG_FIELDS)[number]) {
    const raw = (drafts[f.key] ?? "").trim();
    let value: unknown;
    try {
      if (f.kind === "int") value = Number.parseInt(raw, 10);
      else if (f.kind === "int-or-null") value = raw === "" ? null : Number.parseInt(raw, 10);
      else if (f.kind === "string-or-null") value = raw === "" ? null : raw;
      else value = JSON.parse(raw);
      if ((f.kind === "int" || (f.kind === "int-or-null" && raw !== "")) && !Number.isInteger(value)) {
        throw new Error("not a whole number");
      }
    } catch {
      setNote({ kind: "err", text: `${f.label}: that isn’t valid.` });
      return;
    }
    setBusy(f.key);
    setNote(null);
    try {
      const d = await apiFetch<AdminConfig>("/admin/config", {
        method: "PUT",
        body: JSON.stringify({ key: f.key, value }),
      });
      setData((prev) => ({ ...(prev ?? {}), ...d }));
      setNote({ kind: "ok", text: `${f.label} saved — applies to new households.` });
    } catch (e) {
      let text = `Couldn’t save ${f.label}.`;
      if (e instanceof ApiError) {
        try {
          text = JSON.parse(e.body)?.error ?? text;
        } catch {
          // keep default
        }
      }
      setNote({ kind: "err", text });
    } finally {
      setBusy(null);
    }
  }

  if (!data) return null;

  return (
    <section className="admin-section">
      <h2>Plan settings</h2>
      <p className="admin-section-note">
        Changes here apply to households created from now on. Every existing household keeps the
        allowances, weights and member limit it was created with, so early users are never moved.
      </p>
      <div className="admin-config">
        {CONFIG_FIELDS.map((f) => {
          const m = data.meta?.[f.key];
          return (
            <div key={f.key} className="admin-config-row">
              <label htmlFor={`cfg-${f.key}`} className="admin-config-label">
                {f.label}
                <span className="admin-config-help">{f.help}</span>
              </label>
              <input
                id={`cfg-${f.key}`}
                className="input admin-config-input"
                value={drafts[f.key] ?? ""}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [f.key]: e.target.value }))}
                spellCheck={false}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => save(f)}
                disabled={busy === f.key}
              >
                {busy === f.key ? "Saving…" : "Save"}
              </button>
              {m?.updatedAt && (
                <span className="admin-config-meta">
                  {fmtDate(m.updatedAt)}
                  {m.updatedBy ? ` · ${m.updatedBy}` : ""}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {note && (
        <p className={note.kind === "ok" ? "admin-note-ok" : "admin-note-err"} role="status">
          {note.text}
        </p>
      )}
    </section>
  );
}
