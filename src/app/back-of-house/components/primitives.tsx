"use client";

import type { ReactNode } from "react";
import type { AdminSeriesPoint } from "@/lib/types";
import { fmtShort } from "../lib/format";
import type { AiAction } from "../lib/constants";

// Hand-rolled chart/stat primitives (no chart dependency). Every tab composes
// these; new panels should too, so the dashboard keeps one look.

/** A titled block with an optional explanatory note. */
export function Section({ title, note, children, id }: { title: string; note?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section className="admin-section" id={id}>
      <h2>{title}</h2>
      {note && <p className="admin-section-note">{note}</p>}
      {children}
    </section>
  );
}

/** A small subheading inside a section ("Cost by model"). */
export function SubTitle({ children, top = 16 }: { children: ReactNode; top?: number }) {
  return (
    <p className="admin-chart-title" style={{ marginTop: top }}>
      {children}
    </p>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="admin-empty" style={{ padding: "16px 4px" }}>
      {children}
    </p>
  );
}

function Kpi({ label, value, text, sub }: { label: string; value?: number | null; text?: string; sub?: string }) {
  return (
    <div className="admin-kpi">
      <span className="admin-kpi-label">{label}</span>
      <span className="admin-kpi-value">{text ?? value ?? "—"}</span>
      {sub && <span className="admin-kpi-sub">{sub}</span>}
    </div>
  );
}

function Stat({ label, value, text }: { label: string; value?: number | null; text?: string }) {
  return (
    <div className="admin-stat">
      <div className="admin-stat-label">{label}</div>
      <div className="admin-stat-value">{text ?? value ?? "—"}</div>
    </div>
  );
}

function Chart({
  title,
  points,
  stacked,
}: {
  title: string;
  points?: AdminSeriesPoint[];
  stacked?: readonly AiAction[];
}) {
  if (!points || points.length === 0) {
    return (
      <div>
        <p className="admin-chart-title">{title}</p>
        <p className="admin-empty" style={{ padding: "24px 4px" }}>
          No data yet — collection starts after the tracking update ships.
        </p>
      </div>
    );
  }

  const totalsPer = points.map((p) =>
    stacked ? stacked.reduce((s, k) => s + (p.values?.[k] ?? 0), 0) : p.count ?? 0,
  );
  const max = Math.max(1, ...totalsPer);

  return (
    <div>
      <p className="admin-chart-title">{title}</p>
      <div className="admin-bars">
        {points.map((p, i) => {
          const t = totalsPer[i];
          const label = `${fmtShort(p.date)}: ${t}`;
          if (t <= 0) {
            return (
              <div key={i} className="admin-bar" title={label}>
                <div className="admin-bar-empty" />
              </div>
            );
          }
          return (
            <div key={i} className="admin-bar" title={label}>
              {stacked ? (
                stacked.map((k) => {
                  const v = p.values?.[k] ?? 0;
                  if (!v) return null;
                  return (
                    <div
                      key={k}
                      className={`admin-bar-seg admin-bar-seg--${k}`}
                      style={{ height: `${(v / max) * 100}%` }}
                    />
                  );
                })
              ) : (
                <div
                  className="admin-bar-seg admin-bar-seg--solid"
                  style={{ height: `${(t / max) * 100}%` }}
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="admin-chart-foot">
        <span>{fmtShort(points[0]?.date)}</span>
        <span>{fmtShort(points[points.length - 1]?.date)}</span>
      </div>
    </div>
  );
}

function Breakdown({
  items,
  format,
}: {
  items: { label: string; value: number }[];
  format?: (v: number) => string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="admin-rows">
      {items.map((it, i) => (
        <div key={`${it.label}-${i}`} className="admin-row">
          <span className="admin-row-label">{it.label}</span>
          <div className="admin-row-track">
            <div className="admin-row-fill" style={{ width: `${(it.value / max) * 100}%` }} />
          </div>
          <span className="admin-row-value">{format ? format(it.value) : it.value}</span>
        </div>
      ))}
    </div>
  );
}

export { Kpi, Stat, Chart, Breakdown };
