"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import { apiFetch, apiSend } from "@/lib/api";
import { useMenu } from "@/lib/menu";
import { PageHeader } from "@/components/page-header";

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

export default function ShoppingModePage() {
  const menu = useMenu();
  const [items, setItems] = useState<GenItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [forgot, setForgot] = useState("");
  const [addingForgot, setAddingForgot] = useState(false);
  const [forgotError, setForgotError] = useState(false);

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

  useEffect(() => {
    // State only changes after the fetch resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const aisles = groupByAisle(items);
  const total = items.length;
  const collected = items.filter((i) => i.is_collected).length;
  const pct = total ? Math.round((collected / total) * 100) : 0;

  function toggleCollected(item: GenItem) {
    const next = !item.is_collected;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_collected: next } : i)));
    apiSend(`/generated-shopping-list/item/${item.id}`, {
      method: "PUT",
      body: JSON.stringify({ is_collected: next }),
    }).catch(() => {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_collected: !next } : i)));
    });
  }

  function deleteItem(item: GenItem) {
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    apiSend(`/generated-shopping-list/item/${item.id}`, {
      method: "DELETE",
      body: JSON.stringify({ productId: item.id, productName: item.product_name }),
    })
      .then(() => menu.refresh())
      .catch(() => void load());
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

  // §8.2a — add one item without regenerating (goes to an "Other" aisle).
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
                className={`shop-aisle${isCollapsed ? " shop-aisle--collapsed" : ""}`}
              >
                <button
                  type="button"
                  className="shop-aisle-head"
                  aria-expanded={!isCollapsed}
                  onClick={() => toggleAisle(aisle.name)}
                >
                  {isCollapsed ? <ChevronRight size={14} aria-hidden /> : <ChevronDown size={14} aria-hidden />}
                  <h6>{aisle.name}</h6>
                  <span className="shop-aisle-count">
                    {done}/{aisle.items.length}
                  </span>
                </button>
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
          {/* Finish shop is wired in step 7 (§8.1). */}
          <button type="button" className="btn btn-primary shop-finish" disabled>
            Finish shop
          </button>
        </div>
      </div>
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
      {/* Delete appears once collected, matching today's behaviour (§6.7). */}
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
