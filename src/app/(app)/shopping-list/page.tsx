"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useMenu, type ShoppingItem } from "@/lib/menu";
import { useToast } from "@/lib/toast";
import { useSession } from "@/lib/auth-client";
import { apiFetch, apiSend } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { AiBox } from "@/components/ai-box";
import { ConfirmDialog } from "@/components/confirm-dialog";

export default function ShoppingListPage() {
  const router = useRouter();
  const menu = useMenu();
  const toast = useToast();
  const { data: session } = useSession();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [removedIds, setRemovedIds] = useState<Set<number>>(new Set());
  const [newItem, setNewItem] = useState("");
  const [adding, setAdding] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);
  // Whether an aisle list already exists, and a fingerprint of the draft it was
  // generated from — so we can offer "Show list by aisle" (just navigate) when
  // the draft is unchanged, and "Generate list by aisle" when it's moved on.
  const [genExists, setGenExists] = useState(false);
  const [savedSig, setSavedSig] = useState<string | null>(null);

  const sigKey = session?.user.id ? `mise:generated-from:${session.user.id}` : null;

  const items = menu.shoppingList.filter((i) => !removedIds.has(i.id));
  const recipeItems = items.filter((i) => !i.custom_product);
  const ownItems = items.filter((i) => i.custom_product);

  function displayName(item: ShoppingItem) {
    return item.custom_product ?? item.ingredient_name ?? "";
  }

  // Fingerprint of the persisted draft (id + name of each item), order-agnostic.
  function draftSignature() {
    return JSON.stringify(
      menu.shoppingList
        .map((i) => `${i.id}:${(i.custom_product ?? i.ingredient_name ?? "").toLowerCase()}`)
        .sort(),
    );
  }

  useEffect(() => {
    if (!sigKey) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSavedSig(localStorage.getItem(sigKey));
  }, [sigKey]);

  useEffect(() => {
    let cancelled = false;
    apiFetch<{ generatedShoppingItems: unknown[] }>("/generated-shopping-list")
      .then((g) => {
        if (!cancelled) setGenExists((g.generatedShoppingItems?.length ?? 0) > 0);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // The aisle list is current if one exists and the draft hasn't changed since.
  const listIsCurrent = genExists && savedSig !== null && savedSig === draftSignature();

  async function addItem() {
    const name = newItem.trim();
    if (!name || adding) return;
    setAdding(true);
    try {
      await apiSend("/shopping-list/custom-product", {
        method: "POST",
        body: JSON.stringify({ custom_product: name }),
      });
      setNewItem("");
      await menu.refresh();
    } finally {
      setAdding(false);
    }
  }

  async function rename(item: ShoppingItem, value: string) {
    const name = value.trim();
    if (!name || name === displayName(item)) return;
    const path = item.custom_product
      ? `/shopping-list/custom-product/${item.id}`
      : `/shopping-list/${item.id}`;
    const body = item.custom_product
      ? { custom_product: name }
      : { ingredient_name: name };
    await apiSend(path, { method: "PUT", body: JSON.stringify(body) });
    await menu.refresh();
  }

  // Optimistic delete with an undo toast (§8.4): hide immediately; the real
  // DELETE only fires when the toast expires, so Undo just un-hides it.
  function restore(id: number) {
    setRemovedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }
  function remove(item: ShoppingItem) {
    setRemovedIds((prev) => new Set(prev).add(item.id));
    toast.showUndo({
      message: `Removed ${displayName(item)}`,
      onUndo: () => restore(item.id),
      onCommit: () => {
        apiSend(`/shopping-list/shopping-list-item/${item.id}`, { method: "DELETE" })
          .then(() => menu.refresh())
          .catch(() => restore(item.id));
      },
    });
  }

  async function organiseAndGo() {
    await apiSend("/shopping-list/organise", { method: "POST" });
    if (sigKey) localStorage.setItem(sigKey, draftSignature());
    router.push("/shopping-list/shop");
  }

  // The primary CTA either opens the current aisle list or (re)generates it.
  function primaryAction() {
    if (listIsCurrent) router.push("/shopping-list/shop");
    else generate();
  }
  const primaryLabel = generating
    ? "Generating…"
    : listIsCurrent
      ? "Show list by aisle"
      : "Generate list by aisle";

  async function generate() {
    if (generating || items.length === 0) return;
    setGenerating(true);
    setGenerateError(false);
    try {
      // §8.2b — if a generated list already has collected items, regenerating
      // would wipe that progress; confirm first.
      const gen = await apiFetch<{ generatedShoppingItems: { is_collected: boolean }[] }>(
        "/generated-shopping-list",
      );
      if (gen.generatedShoppingItems?.some((i) => i.is_collected)) {
        setGenerating(false);
        setConfirmRegen(true);
        return;
      }
      await organiseAndGo();
    } catch {
      setGenerateError(true);
      setGenerating(false);
    }
  }

  const empty = menu.loaded && items.length === 0;

  return (
    <div className="sl">
      <PageHeader
        title="Shopping list"
        kicker={menu.loaded ? `Draft · ${items.length} item${items.length === 1 ? "" : "s"}` : undefined}
        actions={
          <div className="sl-header-actions">
            <button
              type="button"
              className="btn btn-ghost"
              style={{ color: "var(--color-neutral-700)" }}
              onClick={() => setConfirmClear(true)}
              disabled={items.length === 0}
            >
              Clear list
            </button>
            <button
              type="button"
              className="btn btn-primary"
              style={{ height: 42, paddingInline: 20 }}
              onClick={primaryAction}
              disabled={generating || items.length === 0}
            >
              {primaryLabel}
            </button>
          </div>
        }
      />

      {generateError && (
        <p className="sl-generate-error" role="alert">
          Couldn&rsquo;t generate the list.{" "}
          <button type="button" className="btn btn-ghost" onClick={generate}>
            Retry
          </button>
        </p>
      )}

      <div className="sl-body">
        {!menu.loaded ? (
          <div className="page-body">
            <p className="text-muted">Loading…</p>
          </div>
        ) : (
          <div className="sl-cols">
            <section className="sl-col sl-col-recipes">
              <div className="sl-group-head">
                <h6>From recipes</h6>
                <span className="sl-group-rule" />
                <span className="sl-group-count">{recipeItems.length}</span>
              </div>
              {recipeItems.length === 0 ? (
                <p className="sl-empty">
                  {empty
                    ? "Nothing here yet."
                    : "No recipe ingredients — add recipes to this week."}
                </p>
              ) : (
                <div className="sl-items">
                  {recipeItems.map((item) => {
                    const titles = menu.recipeTitlesFor(item.ingredient_name ?? "");
                    const count = Number(item.recipe_count) || titles.length;
                    const note = count > 1 ? `in ${count} recipes` : titles[0] ?? "";
                    return (
                      <ItemRow
                        key={item.id}
                        name={displayName(item)}
                        note={note}
                        editing={editingId === item.id}
                        onStartEdit={() => setEditingId(item.id)}
                        onCommit={(v) => {
                          setEditingId(null);
                          rename(item, v);
                        }}
                        onCancel={() => setEditingId(null)}
                        onRemove={() => remove(item)}
                      />
                    );
                  })}
                </div>
              )}
            </section>

            <section className="sl-col sl-col-own">
              <div className="sl-group-head">
                <h6>Your own items</h6>
                <span className="sl-group-rule" />
                <span className="sl-group-count">{ownItems.length}</span>
              </div>
              {ownItems.length === 0 ? (
                <p className="sl-empty">Nothing added yet.</p>
              ) : (
                <div className="sl-items">
                  {ownItems.map((item) => (
                    <ItemRow
                      key={item.id}
                      name={displayName(item)}
                      editing={editingId === item.id}
                      onStartEdit={() => setEditingId(item.id)}
                      onCommit={(v) => {
                        setEditingId(null);
                        rename(item, v);
                      }}
                      onCancel={() => setEditingId(null)}
                      onRemove={() => remove(item)}
                    />
                  ))}
                </div>
              )}

              <form
                className="sl-add"
                onSubmit={(e) => {
                  e.preventDefault();
                  addItem();
                }}
              >
                <input
                  className="input"
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  placeholder="Add a single item"
                  aria-label="Add a single item"
                />
                <button type="submit" className="btn btn-secondary" disabled={adding || !newItem.trim()}>
                  Add
                </button>
              </form>

              <AiBox onDone={() => menu.refresh()} />
            </section>
          </div>
        )}
      </div>

      {/* Mobile: actions live in a footer bar instead of the header. */}
      {menu.loaded && (
        <div className="sl-foot">
          <button
            type="button"
            className="btn btn-primary btn-block"
            style={{ height: 46, fontSize: 16, margin: 0 }}
            onClick={primaryAction}
            disabled={generating || items.length === 0}
          >
            {primaryLabel}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setConfirmClear(true)}
            disabled={items.length === 0}
          >
            Clear list
          </button>
        </div>
      )}

      {confirmClear && (
        <ConfirmDialog
          title="Clear the whole list?"
          body="This empties your shopping list and takes every recipe off this week. It can't be undone."
          confirmLabel="Clear list"
          onConfirm={async () => {
            await apiSend("/shopping-list", { method: "DELETE" });
            await menu.refresh();
            setConfirmClear(false);
          }}
          onClose={() => setConfirmClear(false)}
        />
      )}

      {confirmRegen && (
        <ConfirmDialog
          title="Regenerate the list?"
          body="You've already collected some items in the shop. Regenerating rebuilds the aisle list from scratch and loses that progress."
          confirmLabel="Regenerate"
          onConfirm={organiseAndGo}
          onClose={() => setConfirmRegen(false)}
        />
      )}
    </div>
  );
}

function ItemRow({
  name,
  note,
  editing,
  onStartEdit,
  onCommit,
  onCancel,
  onRemove,
}: {
  name: string;
  note?: string;
  editing: boolean;
  onStartEdit: () => void;
  onCommit: (value: string) => void;
  onCancel: () => void;
  onRemove: () => void;
}) {
  if (editing) {
    return (
      <div className="sl-item">
        <EditField initial={name} onCommit={onCommit} onCancel={onCancel} />
      </div>
    );
  }
  return (
    <div className="sl-item">
      <button type="button" className="sl-item-name" onClick={onStartEdit} title="Click to rename">
        {name}
      </button>
      {note && <span className="sl-item-note">{note}</span>}
      <button
        type="button"
        className="sl-item-delete"
        aria-label={`Delete ${name}`}
        onClick={onRemove}
      >
        <X size={15} aria-hidden />
      </button>
    </div>
  );
}

function EditField({
  initial,
  onCommit,
  onCancel,
}: {
  initial: string;
  onCommit: (value: string) => void;
  onCancel: () => void;
}) {
  const done = useRef(false);
  function commit(value: string) {
    if (done.current) return;
    done.current = true;
    onCommit(value);
  }
  return (
    <input
      className="sl-item-edit"
      autoFocus
      defaultValue={initial}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit(e.currentTarget.value);
        } else if (e.key === "Escape") {
          done.current = true;
          onCancel();
        }
      }}
      onBlur={(e) => commit(e.currentTarget.value)}
    />
  );
}
