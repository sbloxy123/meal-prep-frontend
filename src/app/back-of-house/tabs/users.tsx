"use client";

import { useMemo, useState } from "react";
import { UserDrawer } from "../components/user-drawer";
import type { AdminUserRow } from "@/lib/types";
import { DataTable, type Column } from "../components/data-table";
import { Section } from "../components/primitives";
import { daysSince, fmtDate, planLabel, relative } from "../lib/format";
import { PLATFORM_LABEL, SEGMENTS, type Segment } from "../lib/constants";

// One person at a time: search, segment, sort. One table for every width —
// the DataTable turns rows into cards on phones.

export function UsersTab({ users }: { users: AdminUserRow[] }) {
  const [q, setQ] = useState("");
  const [segment, setSegment] = useState<Segment>("all");
  const [open, setOpen] = useState<string | null>(null);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return users.filter((u) => {
      if (needle && !`${u.name ?? ""} ${u.email} ${u.household_name ?? ""}`.toLowerCase().includes(needle)) return false;
      const active = (daysSince(u.last_active) ?? Infinity) <= 30;
      switch (segment) {
        case "active": return active;
        case "inactive": return !active;
        case "unverified": return !u.email_verified;
        case "recipes": return (u.recipe_count ?? 0) > 0;
        case "premium": return u.plan === "premium";
        case "installed": return u.installed_at != null;
        default: return true;
      }
    });
  }, [users, q, segment]);

  const columns: Column<AdminUserRow>[] = [
    {
      key: "name", label: "User", sortable: true, mobile: "title",
      sortValue: (u) => (u.name || u.email).toLowerCase(),
      render: (u) => (
        <>
          <div>{u.name || "—"}</div>
          <div className="admin-user-email">{u.email}</div>
        </>
      ),
    },
    { key: "created_at", label: "Joined", sortable: true, sortValue: (u) => u.created_at, render: (u) => fmtDate(u.created_at) },
    {
      key: "last_active", label: "Last active", sortable: true, mobile: "pill",
      sortValue: (u) => u.last_active ?? "",
      render: (u) => (
        <>
          {relative(u.last_active)}
          {!u.email_verified && <span className="admin-pill" style={{ marginLeft: 6 }}>unverified</span>}
        </>
      ),
    },
    { key: "recipe_count", label: "Recipes", numeric: true, sortable: true, sortValue: (u) => u.recipe_count ?? 0, render: (u) => u.recipe_count ?? 0 },
    { key: "ai", label: "AI", numeric: true, sortable: true, sortValue: (u) => u.ai_usage?.total ?? 0, render: (u) => u.ai_usage?.total ?? 0 },
    {
      key: "credits", label: "Credits", numeric: true, sortable: true, mobile: "hide",
      sortValue: (u) => u.ai_usage?.credits ?? 0, render: (u) => u.ai_usage?.credits ?? 0,
    },
    {
      key: "plan", label: "Plan", sortable: true, mobile: "pill",
      sortValue: (u) => (u.plan === "premium" ? (u.paid ? 2 : 1) : 0),
      render: (u) => planLabel(u).premium ? <span className="admin-pill is-premium">{planLabel(u).text}</span> : <span className="admin-muted">Free</span>,
    },
    {
      key: "app", label: "App", sortable: true, mobile: "pill",
      sortValue: (u) => u.installed_at ?? "",
      render: (u) => (u.installed_at ? <span className="admin-pill is-ok">{PLATFORM_LABEL[u.installed_platform ?? "unknown"] ?? "Installed"}</span> : <span className="admin-muted">Browser</span>),
    },
    {
      key: "household", label: "Household", sortable: true,
      sortValue: (u) => u.household_name ?? "",
      render: (u) => (
        <>
          {u.household_name || "—"}
          {(u.household_member_count ?? 1) > 1 && <span className="admin-pill is-ok" style={{ marginLeft: 6 }}>{u.household_member_count}</span>}
        </>
      ),
    },
  ];

  return (
    <Section title={`Users · ${rows.length}${rows.length !== users.length ? ` of ${users.length}` : ""}`}>
      <div className="admin-controls">
        <input
          className="input admin-search"
          placeholder="Search name, email or household"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search users"
        />
        <div className="admin-segments" role="group" aria-label="Segment">
          {SEGMENTS.map((s) => (
            <button key={s.key} type="button" className={`admin-seg ${segment === s.key ? "is-active" : ""}`} onClick={() => setSegment(s.key)}>
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <p className="admin-section-note">Tap a person for their plan, activity and recipe list (titles and metadata — opening a full recipe asks for a reason and is logged).</p>
      <DataTable columns={columns} rows={rows} rowKey={(u) => u.id} defaultSort={{ key: "created_at", dir: "desc" }} empty="No users match." onRowClick={(u) => setOpen(u.id)} />
      {open && <UserDrawer userId={open} onClose={() => setOpen(null)} />}
    </Section>
  );
}
