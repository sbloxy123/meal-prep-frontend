"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { apiFetch, apiSend, ApiError } from "@/lib/api";
import { useSession } from "@/lib/auth-client";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface Member {
  user_id: string;
  role: string;
  joined_at: string;
  name: string | null;
  email: string;
}
interface Invite {
  id: string;
  invited_email: string;
  created_at: string;
  expires_at: string;
}
interface HouseholdData {
  household: { id: string; name: string | null } | null;
  members: Member[];
  invites: Invite[];
  role: string;
}

function errMsg(e: unknown, fallback: string): string {
  if (e instanceof ApiError) {
    try {
      return (JSON.parse(e.body) as { error?: string })?.error || fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

export function HouseholdCard() {
  const { data: session } = useSession();
  const [data, setData] = useState<HouseholdData | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMsg, setInviteMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<
    null | { kind: "leave" } | { kind: "remove"; member: Member }
  >(null);

  const load = useCallback(
    () =>
      apiFetch<HouseholdData>("/household")
        .then(setData)
        .catch(() => {})
        .finally(() => setLoading(false)),
    [],
  );
  useEffect(() => {
    load();
  }, [load]);

  const isOwner = data?.role === "owner";
  const members = data?.members ?? [];
  const invites = data?.invites ?? [];

  async function sendInvite(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = inviteEmail.trim();
    if (!email || busy) return;
    setBusy(true);
    setInviteMsg(null);
    try {
      await apiSend("/household/invite", { method: "POST", body: JSON.stringify({ email }) });
      setInviteEmail("");
      setInviteMsg({ ok: true, text: `Invite sent to ${email}.` });
      await load();
    } catch (err) {
      setInviteMsg({ ok: false, text: errMsg(err, "Couldn't send that invite.") });
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    setBusy(true);
    try {
      await apiSend(`/household/invite/${id}`, { method: "DELETE" });
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <section className="account-card">
        <h2>Household</h2>
        <p className="text-muted">Loading…</p>
      </section>
    );
  }

  return (
    <section className="account-card">
      <h2>Household</h2>
      {isOwner ? (
        <HouseholdName name={data?.household?.name ?? ""} onSaved={load} />
      ) : (
        <div className="account-readonly" style={{ borderTop: "none", paddingTop: 0 }}>
          <span className="account-readonly-label">Name</span>
          <span className="account-readonly-value">{data?.household?.name ?? "Household"}</span>
        </div>
      )}

      <div className="hh-members">
        {members.map((m) => {
          const isSelf = m.user_id === session?.user.id;
          return (
            <div className="hh-member" key={m.user_id}>
              <span className="hh-avatar" aria-hidden>
                {(m.name || m.email || "?").trim().charAt(0).toUpperCase()}
              </span>
              <span className="hh-member-main">
                <span className="hh-member-name">
                  {m.name || m.email}
                  {isSelf && <span className="hh-you"> (you)</span>}
                </span>
                <span className="hh-member-email text-muted">{m.email}</span>
              </span>
              <span className={`hh-role ${m.role === "owner" ? "hh-role-owner" : ""}`}>
                {m.role}
              </span>
              {isOwner && !isSelf && (
                <button
                  type="button"
                  className="hh-remove"
                  onClick={() => setConfirm({ kind: "remove", member: m })}
                  disabled={busy}
                >
                  Remove
                </button>
              )}
            </div>
          );
        })}
      </div>

      {invites.length > 0 && (
        <div className="hh-invites">
          <h6 className="hh-subhead">Pending invites</h6>
          {invites.map((inv) => (
            <div className="hh-invite" key={inv.id}>
              <span className="hh-invite-email">{inv.invited_email}</span>
              {isOwner && (
                <button
                  type="button"
                  className="hh-remove"
                  onClick={() => revoke(inv.id)}
                  disabled={busy}
                >
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {isOwner && (
        <form className="hh-invite-form" onSubmit={sendInvite}>
          <h6 className="hh-subhead">Invite someone</h6>
          <div className="account-inline-row">
            <input
              className="input"
              type="email"
              placeholder="their@email.com"
              value={inviteEmail}
              onChange={(e) => {
                setInviteEmail(e.target.value);
                setInviteMsg(null);
              }}
              aria-label="Invite by email"
            />
            <button type="submit" className="btn btn-secondary" disabled={busy || !inviteEmail.trim()}>
              {busy ? "Sending…" : "Send invite"}
            </button>
          </div>
          {inviteMsg && (
            <p className={inviteMsg.ok ? "account-ok" : "account-err"}>{inviteMsg.text}</p>
          )}
          <p className="hh-hint text-muted">
            They&rsquo;ll get an email link to join. Everyone in the household shares the same
            recipes, weekly menu and shopping list.
          </p>
        </form>
      )}

      {members.length > 1 && (
        <button
          type="button"
          className="btn btn-ghost hh-leave"
          onClick={() => setConfirm({ kind: "leave" })}
          disabled={busy}
        >
          Leave household
        </button>
      )}

      {confirm?.kind === "leave" && (
        <ConfirmDialog
          title="Leave this household?"
          body="You'll get a fresh, empty household of your own. The shared recipes and lists stay with the others — you won't take them with you."
          confirmLabel="Leave"
          onConfirm={async () => {
            await apiSend("/household/leave", { method: "POST" });
            await load();
            setConfirm(null);
          }}
          onClose={() => setConfirm(null)}
        />
      )}
      {confirm?.kind === "remove" && (
        <ConfirmDialog
          title={`Remove ${confirm.member.name || confirm.member.email}?`}
          body="They'll be moved to a fresh household of their own. Anything they added stays in yours."
          confirmLabel="Remove"
          onConfirm={async () => {
            await apiSend(`/household/member/${confirm.member.user_id}`, { method: "DELETE" });
            await load();
            setConfirm(null);
          }}
          onClose={() => setConfirm(null)}
        />
      )}
    </section>
  );
}

function HouseholdName({ name, onSaved }: { name: string; onSaved: () => Promise<void> | void }) {
  const [value, setValue] = useState(name);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const dirty = value.trim() !== name && value.trim().length > 0;

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!dirty || status === "saving") return;
    setStatus("saving");
    try {
      await apiSend("/household", { method: "PUT", body: JSON.stringify({ name: value.trim() }) });
      setStatus("saved");
      await onSaved();
    } catch {
      setStatus("error");
    }
  }

  return (
    <form className="field account-inline" onSubmit={save}>
      <label htmlFor="hh-name">Name</label>
      <div className="account-inline-row">
        <input
          id="hh-name"
          className="input"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setStatus("idle");
          }}
        />
        <button type="submit" className="btn btn-secondary" disabled={!dirty || status === "saving"}>
          {status === "saving" ? "Saving…" : "Save"}
        </button>
      </div>
      {status === "saved" && <p className="account-ok">Household renamed.</p>}
      {status === "error" && <p className="account-err">Couldn&rsquo;t rename the household.</p>}
    </form>
  );
}
