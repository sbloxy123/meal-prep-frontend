"use client";

import { useMemo, useState, type ReactNode } from "react";

// The one table. Renders a real <table>; below 1024px CSS turns each row into
// a card (data-label on every cell), so there is a single markup path for
// desktop and phone. Columns declare how they behave on a phone:
//   title – the card's heading (shown once, no label)
//   pill  – small tag in the heading row
//   stat  – "Label  value" line (default)
//   hide  – not shown on phones
// layout="scroll" keeps the table shape on phones (for wide numeric tables)
// and scrolls it inside the section instead.

export interface Column<T> {
  key: string;
  label: string;
  numeric?: boolean;
  sortable?: boolean;
  /** Value used for sorting; defaults to row[key]. */
  sortValue?: (row: T) => number | string | null | undefined;
  render: (row: T) => ReactNode;
  mobile?: "title" | "pill" | "stat" | "hide";
  width?: string;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  layout = "cards",
  defaultSort,
  compact,
  empty = "Nothing to show.",
  onRowClick,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  layout?: "cards" | "scroll";
  defaultSort?: { key: string; dir: "asc" | "desc" };
  compact?: boolean;
  empty?: ReactNode;
  /** Makes rows clickable (cursor + keyboard). */
  onRowClick?: (row: T) => void;
}) {
  const [sort, setSort] = useState(defaultSort ?? null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return rows;
    const val = (r: T) => (col.sortValue ? col.sortValue(r) : (r as Record<string, unknown>)[col.key]) as number | string | null | undefined;
    const out = [...rows].sort((a, b) => {
      const x = val(a);
      const y = val(b);
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      if (typeof x === "number" && typeof y === "number") return x - y;
      return String(x).localeCompare(String(y));
    });
    return sort.dir === "asc" ? out : out.reverse();
  }, [rows, sort, columns]);

  function toggle(key: string) {
    setSort((s) => (s?.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));
  }

  if (rows.length === 0) return <p className="admin-empty">{empty}</p>;

  return (
    <div className={`admin-table-wrap ${layout === "scroll" ? "is-scroll" : "is-cards"}`}>
      <table className={`admin-table ${compact ? "admin-table-compact" : ""}`}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                style={c.width ? { width: c.width } : undefined}
                className={`${c.numeric ? "admin-td-num" : ""} ${sort?.key === c.key ? "is-sorted" : ""} ${c.sortable ? "is-sortable" : ""}`}
                onClick={c.sortable ? () => toggle(c.key) : undefined}
                aria-sort={sort?.key === c.key ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
              >
                {c.label}
                {sort?.key === c.key ? (sort.dir === "asc" ? " ↑" : " ↓") : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr
              key={rowKey(row)}
              className={onRowClick ? "is-clickable" : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onKeyDown={onRowClick ? (e) => { if (e.key === "Enter") onRowClick(row); } : undefined}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  data-label={c.label}
                  data-mobile={c.mobile ?? "stat"}
                  className={c.numeric ? "admin-td-num" : undefined}
                >
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
