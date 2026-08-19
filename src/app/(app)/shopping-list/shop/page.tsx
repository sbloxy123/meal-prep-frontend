"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, GripVertical, RotateCcw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { apiFetch, apiSend } from "@/lib/api";
import { useMenu } from "@/lib/menu";
import { useToast } from "@/lib/toast";
import { useSession } from "@/lib/auth-client";
import { PageHeader } from "@/components/page-header";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface GenItem {
  id: number;
  product_name: string;
  aisle_name: string;
  is_collected: boolean;
  quantity: string | null;
}
interface GenResponse {
  generatedShoppingItems: GenItem[];
}
interface Aisle {
  name: string;
  items: GenItem[];
}

function groupByAisle(items: GenItem[]): Aisle[] {
  const order: string[] = [];
  const byName = new Map<string, GenItem[]>();
  for (const item of items) {
    const name = item.aisle_name || "Other";
    if (!byName.has(name)) {
      byName.set(name, []);
      order.push(name);
    }
    byName.get(name)!.push(item);
  }
  return order.map((name) => ({ name, items: byName.get(name)! }));
}

// §8.7 — sort aisles by the user's saved order; aisles they've never ordered
// (new ones from the AI) fall to the bottom in the AI's order.
function applyOrder(aisles: Aisle[], order: string[]): Aisle[] {
  if (order.length === 0) return aisles;
  const rank = new Map(order.map((name, i) => [name, i]));
  const known = aisles.filter((a) => rank.has(a.name));
  const unknown = aisles.filter((a) => !rank.has(a.name));
  known.sort((a, b) => rank.get(a.name)! - rank.get(b.name)!);
  return [...known, ...unknown];
}

export default function ShoppingModePage() {
  const router = useRouter();
  const menu = useMenu();
  const toast = useToast();
  const { data: session } = useSession();
  const userId = session?.user.id;

  const [items, setItems] = useState<GenItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [forgot, setForgot] = useState("");
  const [addingForgot, setAddingForgot] = useState(false);
  const [forgotError, setForgotError] = useState(false);
  const [order, setOrder] = useState<string[]>([]);
  const [dragging, setDragging] = useState<string | null>(null);

  const orderKey = userId ? `mise:aisle-order:${userId}` : null;

  // Ids with an optimistic mutation in flight, so a background sync (poll /
  // focus) doesn't clobber them: items hidden during their undo window, and
  // items with an in-flight collect toggle.
  const pendingRemove = useRef<Set<number>>(new Set());
  const pendingToggle = useRef<Set<number>>(new Set());

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<GenResponse>("/generated-shopping-list");
      setItems(res.generatedShoppingItems ?? []);
    } catch {
      // leave last state
    } finally {
      setLoading(false);
    }
  }, []);

  // Background sync — takes server state as the base (so items added/removed on
  // another device show up), but keeps optimistic changes: hides items in their
  // undo window and preserves in-flight toggles.
  const sync = useCallback(async () => {
    try {
      const res = await apiFetch<GenResponse>("/generated-shopping-list");
      const server = res.generatedShoppingItems ?? [];
      setItems((local) => {
        const localById = new Map(local.map((i) => [i.id, i]));
        return server
          .filter((si) => !pendingRemove.current.has(si.id))
          .map((si) => (pendingToggle.current.has(si.id) ? localById.get(si.id) ?? si : si));
      });
    } catch {
      // ignore transient failures
    }
  }, []);

  useEffect(() => {
    // State only changes after the fetch resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  // Poll every 60s while visible, and sync on focus/visibility regain, so a
  // list edited elsewhere updates without a manual refresh.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void sync();
    };
    const interval = setInterval(onVisible, 60000);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [sync]);

  // Load the saved aisle order for this user.
  useEffect(() => {
    if (!orderKey) return;
    const raw = localStorage.getItem(orderKey);
    if (raw) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setOrder(JSON.parse(raw));
      } catch {
        /* ignore malformed */
      }
    }
  }, [orderKey]);

  // Persist whenever the order changes.
  useEffect(() => {
    if (orderKey && order.length) localStorage.setItem(orderKey, JSON.stringify(order));
  }, [order, orderKey]);

  const aisles = applyOrder(groupByAisle(items), order);
  const total = items.length;
  const collected = items.filter((i) => i.is_collected).length;
  const pct = total ? Math.round((collected / total) * 100) : 0;

  function toggleCollected(item: GenItem) {
    const next = !item.is_collected;
    pendingToggle.current.add(item.id);
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_collected: next } : i)));
    apiSend(`/generated-shopping-list/item/${item.id}`, {
      method: "PUT",
      body: JSON.stringify({ is_collected: next }),
    })
      .catch(() => {
        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_collected: !next } : i)));
      })
      .finally(() => pendingToggle.current.delete(item.id));
  }

  // Optimistic delete with undo (§8.4): remove locally; the DELETE only fires
  // when the toast expires, so Undo re-inserts it at its original position.
  function deleteItem(item: GenItem) {
    const index = items.findIndex((i) => i.id === item.id);
    // Mark pending so a background sync doesn't resurrect it during the undo
    // window (the server still has it until the toast commits).
    pendingRemove.current.add(item.id);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    toast.showUndo({
      message: `Removed ${item.product_name}`,
      onUndo: () => {
        pendingRemove.current.delete(item.id);
        setItems((prev) => {
          if (prev.some((i) => i.id === item.id)) return prev;
          const arr = [...prev];
          arr.splice(Math.min(index, arr.length), 0, item);
          return arr;
        });
      },
      onCommit: () => {
        apiSend(`/generated-shopping-list/item/${item.id}`, {
          method: "DELETE",
          body: JSON.stringify({ productId: item.id, productName: item.product_name }),
        })
          .then(() => menu.refresh())
          .catch(() => void load())
          .finally(() => pendingRemove.current.delete(item.id));
      },
    });
  }

  async function clearCollected() {
    const done = items.filter((i) => i.is_collected);
    setItems((prev) => prev.filter((i) => !i.is_collected));
    await Promise.all(
      done.map((i) =>
        apiSend(`/generated-shopping-list/item/${i.id}`, {
          method: "DELETE",
          body: JSON.stringify({ productId: i.id, productName: i.product_name }),
        }).catch(() => {}),
      ),
    );
    await menu.refresh();
    void load();
  }

  async function addForgotten() {
    const name = forgot.trim();
    if (!name || addingForgot) return;
    setAddingForgot(true);
    setForgotError(false);
    try {
      await apiSend("/generated-shopping-list", {
        method: "POST",
        body: JSON.stringify({ product_name: name }),
      });
      setForgot("");
      await load();
    } catch {
      setForgotError(true);
    } finally {
      setAddingForgot(false);
    }
  }

  function toggleAisle(name: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  // §8.7 — pointer-based drag reordering (works with touch and mouse).
  function onGripDown(e: React.PointerEvent, name: string) {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(name);
    setOrder(aisles.map((a) => a.name)); // promote all current aisles into the order
  }
  function onGripMove(e: React.PointerEvent, name: string) {
    if (dragging !== name) return;
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>(".shop-aisle");
    const over = el?.dataset.aisle;
    if (!over || over === name) return;
    setOrder((prev) => {
      const arr = prev.filter((n) => n !== name);
      const idx = arr.indexOf(over);
      if (idx === -1) return prev;
      arr.splice(idx, 0, name);
      return arr;
    });
  }
  function resetOrder() {
    setOrder([]);
    if (orderKey) localStorage.removeItem(orderKey);
  }

  if (loading) {
    return (
      <div className="shop">
        <PageHeader title="In the shop" kicker="Sorted by aisle" />
        <div className="page-body">
          <p className="text-muted">Loading…</p>
        </div>
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="shop">
        <PageHeader title="In the shop" kicker="Sorted by aisle" />
        <div className="week-empty">
          <h3>No list to shop yet</h3>
          <p className="text-muted">
            Generate your shopping list by aisle from the draft and it&rsquo;ll appear here.
          </p>
          <hr className="week-empty-rule" />
          <Link href="/shopping-list" className="btn btn-primary" style={{ height: 44, paddingInline: 22 }}>
            Go to the list
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="shop">
      <div className="shop-head">
        <div className="shop-head-row">
          <div>
            <div className="page-header-kicker">Sorted by aisle · AI</div>
            <h1 className="page-header-title">In the shop</h1>
          </div>
          <span className="shop-counter" aria-hidden>
            {collected}/{total}
          </span>
        </div>
        <div className="shop-progress">
          <div className="shop-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <p className="sr-only" role="status" aria-live="polite">
          {collected} of {total} collected
        </p>
      </div>

      <div className="shop-body">
        <div className="shop-aisles">
          {aisles.map((aisle) => {
            const isCollapsed = collapsed.has(aisle.name);
            const done = aisle.items.filter((i) => i.is_collected).length;
            return (
              <section
                key={aisle.name}
                data-aisle={aisle.name}
                className={`shop-aisle${isCollapsed ? " shop-aisle--collapsed" : ""}${dragging === aisle.name ? " shop-aisle--dragging" : ""}`}
              >
                <div className="shop-aisle-head">
                  <button
                    type="button"
                    className="shop-aisle-toggle"
                    aria-expanded={!isCollapsed}
                    onClick={() => toggleAisle(aisle.name)}
                  >
                    {isCollapsed ? <ChevronRight size={14} aria-hidden /> : <ChevronDown size={14} aria-hidden />}
                    <h6>{aisle.name}</h6>
                    <span className="shop-aisle-count">
                      {done}/{aisle.items.length}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="shop-aisle-grip"
                    aria-label={`Reorder ${aisle.name}`}
                    onPointerDown={(e) => onGripDown(e, aisle.name)}
                    onPointerMove={(e) => onGripMove(e, aisle.name)}
                    onPointerUp={() => setDragging(null)}
                    onPointerCancel={() => setDragging(null)}
                  >
                    <GripVertical size={15} aria-hidden />
                  </button>
                </div>
                {!isCollapsed && (
                  <div className="shop-items">
                    {aisle.items.map((item) => (
                      <ShopItem
                        key={item.id}
                        item={item}
                        onToggle={() => toggleCollected(item)}
                        onDelete={() => deleteItem(item)}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>

      <div className="shop-foot">
        <form
          className="shop-add"
          onSubmit={(e) => {
            e.preventDefault();
            addForgotten();
          }}
        >
          <input
            className="input"
            value={forgot}
            onChange={(e) => setForgot(e.target.value)}
            placeholder="Forgot something? Add it…"
            aria-label="Add a forgotten item"
          />
          <button type="submit" className="btn btn-secondary" disabled={addingForgot || !forgot.trim()}>
            {addingForgot ? "Adding…" : "Add"}
          </button>
        </form>
        {forgotError && (
          <p className="shop-add-error" role="alert">
            Couldn&rsquo;t add that.{" "}
            <button type="button" className="btn btn-ghost" onClick={addForgotten}>
              Retry
            </button>
          </p>
        )}
        <div className="shop-foot-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={clearCollected}
            disabled={collected === 0}
          >
            Clear collected
          </button>
          {order.length > 0 && (
            <button type="button" className="btn btn-ghost shop-reset" onClick={resetOrder}>
              <RotateCcw size={13} aria-hidden /> Reset order
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary shop-finish"
            onClick={() => setConfirmFinish(true)}
          >
            Finish shop
          </button>
        </div>
      </div>

      {confirmFinish && (
        <ConfirmDialog
          title="Finish shop?"
          body="This clears your shopping list and the aisle list, and takes every recipe off this week — a clean slate for next time. It can't be undone."
          confirmLabel="Finish shop"
          onConfirm={async () => {
            await apiSend("/shopping-list/finish", { method: "POST" });
            await menu.refresh();
            setConfirmFinish(false);
            toast.show("Shop finished — this week's all cleared.");
            router.push("/recipes");
          }}
          onClose={() => setConfirmFinish(false)}
        />
      )}
    </div>
  );
}

function ShopItem({
  item,
  onToggle,
  onDelete,
}: {
  item: GenItem;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const qty = item.quantity && item.quantity !== "1" ? `×${item.quantity}` : "";
  return (
    <label className={`shop-item${item.is_collected ? " is-collected" : ""}`}>
      <input type="checkbox" checked={item.is_collected} onChange={onToggle} />
      <span className="shop-check" aria-hidden>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m4 12.5 5 5L20 6.5" />
        </svg>
      </span>
      <span className="shop-item-name">{item.product_name}</span>
      {qty && <span className="shop-item-qty">{qty}</span>}
      {item.is_collected && (
        <button
          type="button"
          className="shop-item-delete"
          aria-label={`Remove ${item.product_name}`}
          onClick={(e) => {
            e.preventDefault();
            onDelete();
          }}
        >
          <X size={16} aria-hidden />
        </button>
      )}
    </label>
  );
}
