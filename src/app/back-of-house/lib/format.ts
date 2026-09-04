import type { AdminRetentionPoint, AdminSeriesPoint, AdminUserRow } from "@/lib/types";
import { AI_ACTIONS, AI_LABEL } from "./constants";

// Formatting helpers shared by every tab. Pure; no React.

/** Pence → "£1.23" / "0.45p". The ledger stores 4 dp; two is plenty here. */
function fmtPence(p?: number | null): string {
  if (p == null) return "—";
  if (p === 0) return "£0.00";
  if (p >= 100) return `£${(p / 100).toFixed(2)}`;
  return `${p.toFixed(2)}p`;
}

function fmtMs(ms?: number | null): string {
  if (ms == null) return "—";
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`;
}

function fmtTokens(n?: number | null): string {
  if (n == null) return "—";
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function pct(v?: number | null): string {
  return v == null ? "—" : `${v}%`;
}

/** How a user's plan reads in the table: comped, paid, or free. */
function planLabel(u: AdminUserRow): { text: string; premium: boolean } {
  if (u.plan === "premium") return { text: u.paid ? "Premium" : "Comp", premium: true };
  return { text: "Free", premium: false };
}

function sum(points: AdminSeriesPoint[] | undefined, keys?: readonly string[]): number {
  if (!points) return 0;
  return points.reduce((acc, p) => {
    if (keys) return acc + keys.reduce((s, k) => s + (p.values?.[k] ?? 0), 0);
    return acc + (p.count ?? 0);
  }, 0);
}

function daysSince(iso?: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86_400_000);
}

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function fmtShort(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function relative(iso?: string | null): string {
  const d = daysSince(iso);
  if (d == null) return "never";
  if (d <= 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 30) return `${d}d ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

function aiSubtitle(points?: AdminSeriesPoint[]): string {
  if (!points) return "";
  const parts = AI_ACTIONS.map((a) => `${AI_LABEL[a][0]} ${sum(points, [a])}`);
  return parts.join(" · ");
}

function retentionText(p?: AdminRetentionPoint | null): string {
  if (!p || !p.eligible) return "—";
  return `${pct(p.rate)} · ${p.retained ?? 0}/${p.eligible}`;
}

function toItems(rec: Record<string, number>): { label: string; value: number }[] {
  return Object.entries(rec)
    .map(([label, value]) => ({ label: cap(label), value }))
    .sort((a, b) => b.value - a.value);
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export { fmtPence, fmtMs, fmtTokens, pct, planLabel, sum, daysSince, fmtDate, fmtShort, relative, aiSubtitle, retentionText, toItems, cap };
