"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { AdminAisleReview, AdminAisleRow } from "@/lib/types";
import { Stat } from "../components/primitives";

export function AislesTab() {
  return <AisleSection />;
}

function AisleSection() {
  const [data, setData] = useState<AdminAisleReview | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [missPicks, setMissPicks] = useState<Record<string, string>>({});

  function load() {
    apiFetch<AdminAisleReview>("/admin/aisles")
      .then(setData)
      .catch(() => setData(null));
  }
  // Load once on mount.
  useEffect(load, []);

  if (!data) return null;
  const slugs = Object.keys(data.aisles);
  const label = (slug: string) => data.aisles[slug] ?? slug;

  async function confirm(row: AdminAisleRow) {
    const aisle = picks[row.id] ?? row.aisle;
    setBusy(`row-${row.id}`);
    setNote(null);
    try {
      await apiFetch(`/admin/aisles/${row.id}`, { method: "PUT", body: JSON.stringify({ aisle }) });
      setNote({ kind: "ok", text: `${row.label} → ${label(aisle)} — saved for everyone.` });
      load();
    } catch {
      setNote({ kind: "err", text: `Couldn’t save ${row.label}.` });
    } finally {
      setBusy(null);
    }
  }

  async function remove(row: AdminAisleRow) {
    setBusy(`row-${row.id}`);
    setNote(null);
    try {
      await apiFetch(`/admin/aisles/${row.id}`, { method: "DELETE" });
      setNote({ kind: "ok", text: `${row.label} removed — the next list will ask again.` });
      load();
    } catch {
      setNote({ kind: "err", text: `Couldn’t remove ${row.label}.` });
    } finally {
      setBusy(null);
    }
  }

  async function mapMiss(m: AdminAisleReview["misses"][number]) {
    const aisle = missPicks[m.id];
    if (!aisle) return;
    setBusy(`miss-${m.id}`);
    setNote(null);
    try {
      await apiFetch("/admin/aisles", { method: "POST", body: JSON.stringify({ key: m.key, label: m.raw_sample ?? m.key, aisle }) });
      setNote({ kind: "ok", text: `${m.key} → ${label(aisle)} — added.` });
      load();
    } catch {
      setNote({ kind: "err", text: `Couldn’t add ${m.key}.` });
    } finally {
      setBusy(null);
    }
  }

  const s = data.stats;
  return (
    <section className="admin-section">
      <h2>Aisle cache</h2>
      <p className="admin-section-note">
        Every ingredient the shopping list has ever placed, shared by all households. The model
        only sees what the cache doesn&rsquo;t know; its guesses land here for you to confirm or
        correct. Human decisions are never overwritten.
      </p>
      <div className="admin-stat-grid" style={{ marginBottom: 16 }}>
        <Stat label="Mappings" value={s.total} />
        <Stat label="Seeded" value={s.seed} />
        <Stat label="From the model" value={s.model} />
        <Stat label="Confirmed by you" value={s.human} />
        <Stat label="To review" value={s.unreviewed} />
        <Stat label="Unplaced" value={s.misses} />
      </div>

      <p className="admin-chart-title">Model guesses to review · busiest first</p>
      {data.queue.length === 0 ? (
        <p className="admin-empty" style={{ padding: "12px 4px" }}>Nothing waiting — every mapping in use has been checked.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table admin-table-compact">
            <thead>
              <tr>
                <th>Ingredient</th>
                <th>Key</th>
                <th className="admin-td-num">Used</th>
                <th>Aisle</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.queue.map((row) => (
                <tr key={row.id}>
                  <td>{row.label}</td>
                  <td><code>{row.key}</code></td>
                  <td className="admin-td-num">{row.usage_count}</td>
                  <td>
                    <select
                      className="input admin-aisle-select"
                      value={picks[row.id] ?? row.aisle}
                      onChange={(e) => setPicks((p) => ({ ...p, [row.id]: e.target.value }))}
                    >
                      {slugs.map((slug) => (
                        <option key={slug} value={slug}>{label(slug)}</option>
                      ))}
                    </select>
                  </td>
                  <td className="admin-aisle-actions">
                    <button type="button" className="btn btn-secondary" disabled={busy === `row-${row.id}`} onClick={() => confirm(row)}>
                      {(picks[row.id] ?? row.aisle) === row.aisle ? "Confirm" : "Correct"}
                    </button>
                    <button type="button" className="btn btn-ghost admin-revoke" disabled={busy === `row-${row.id}`} onClick={() => remove(row)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="admin-chart-title" style={{ marginTop: 16 }}>Unplaced · seen most often</p>
      {data.misses.length === 0 ? (
        <p className="admin-empty" style={{ padding: "12px 4px" }}>Nothing unplaced.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table admin-table-compact">
            <thead>
              <tr>
                <th>Key</th>
                <th>As typed</th>
                <th className="admin-td-num">Seen</th>
                <th>Aisle</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.misses.map((m) => (
                <tr key={m.id}>
                  <td><code>{m.key}</code></td>
                  <td>{m.raw_sample ?? "—"}</td>
                  <td className="admin-td-num">{m.hit_count}</td>
                  <td>
                    <select
                      className="input admin-aisle-select"
                      value={missPicks[m.id] ?? ""}
                      onChange={(e) => setMissPicks((p) => ({ ...p, [m.id]: e.target.value }))}
                    >
                      <option value="">Choose…</option>
                      {slugs.map((slug) => (
                        <option key={slug} value={slug}>{label(slug)}</option>
                      ))}
                    </select>
                  </td>
                  <td className="admin-aisle-actions">
                    <button type="button" className="btn btn-secondary" disabled={!missPicks[m.id] || busy === `miss-${m.id}`} onClick={() => mapMiss(m)}>
                      Add
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {note && (
        <p className={note.kind === "ok" ? "admin-note-ok" : "admin-note-err"} role="status">
          {note.text}
        </p>
      )}
    </section>
  );
}
