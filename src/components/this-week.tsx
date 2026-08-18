"use client";

import Link from "next/link";
import { useMenu } from "@/lib/menu";

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/** Mobile: a tray docked above the tab bar whenever ≥1 recipe is on the menu.
    Renders a spacer in flow so the last rows clear the fixed tray. */
export function ThisWeekTray() {
  const { thisWeek, listCount } = useMenu();
  if (thisWeek.length === 0) return null;
  return (
    <>
      <div className="tray-spacer" aria-hidden />
      <div className="tray">
        <div style={{ flex: 1 }}>
          <div className="tray-title">This week · {plural(thisWeek.length, "recipe")}</div>
          <div className="tray-sub">{plural(listCount, "item")} to buy</div>
        </div>
        <Link href="/this-week" className="btn btn-primary tray-open">
          Open ›
        </Link>
      </div>
    </>
  );
}

/** Desktop: the permanent 290px right column on Recipes. */
export function ThisWeekColumn() {
  const { thisWeek, listCount } = useMenu();
  return (
    <aside className="week-col" aria-label="This week">
      <div className="week-col-head">
        <div className="week-col-kicker">
          {plural(thisWeek.length, "recipe")} · {plural(listCount, "item")}
        </div>
        <h2 className="week-col-title">This week</h2>
      </div>

      {thisWeek.length === 0 ? (
        <div className="week-col-empty text-muted">
          Nothing on the menu yet. Add a recipe to start your list.
        </div>
      ) : (
        <div className="week-col-list">
          {thisWeek.map((r) => (
            <div className="week-col-item" key={r.id}>
              <div className="week-col-item-head">
                <span className="week-col-item-title">{r.title}</span>
                <span className="week-col-item-count">{r.itemCount}</span>
              </div>
              {r.summary && <div className="week-col-item-summary text-muted">{r.summary}</div>}
            </div>
          ))}
        </div>
      )}

      <div className="week-col-foot">
        <Link
          href="/shopping-list"
          className="btn btn-primary btn-block"
          style={{ height: 44, fontSize: 15, margin: 0 }}
        >
          Review shopping list
        </Link>
      </div>
    </aside>
  );
}
