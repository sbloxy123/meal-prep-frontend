"use client";

import Link from "next/link";
import { CookingPot } from "lucide-react";
import { useMenu, type WeekRecipe } from "@/lib/menu";
import { PageHeader } from "@/components/page-header";
import { plural } from "@/lib/format";

export default function ThisWeekPage() {
  const { loaded, thisWeek, listCount, openStockCheck, requestRemoveRecipe } = useMenu();

  const kicker = thisWeek.length
    ? `${plural(thisWeek.length, "recipe")} · ${plural(listCount, "item")}`
    : "Nothing yet";

  return (
    <div className="week-screen">
      <PageHeader title="This week" kicker={loaded ? kicker : undefined} />

      {!loaded ? (
        <div className="page-body">
          <p className="text-muted">Loading…</p>
        </div>
      ) : thisWeek.length === 0 ? (
        <EmptyWeek />
      ) : (
        <>
          <div className="week-list">
            {thisWeek.map((r) => (
              <WeekRow
                key={r.id}
                recipe={r}
                onEdit={() => openStockCheck(r)}
                onRemove={() => requestRemoveRecipe(r)}
              />
            ))}
          </div>
          <div className="week-foot">
            <Link
              href="/recipes"
              className="btn btn-secondary btn-block"
              style={{ height: 40, margin: 0 }}
            >
              Add another recipe
            </Link>
            <Link
              href="/shopping-list"
              className="btn btn-primary btn-block"
              style={{ height: 44, fontSize: 16, margin: 0 }}
            >
              Review shopping list
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

function WeekRow({
  recipe,
  onEdit,
  onRemove,
}: {
  recipe: WeekRecipe;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="week-item">
      <div className="week-item-main">
        <div className="week-item-title">{recipe.title}</div>
        {recipe.summary && (
          <div className="week-item-summary text-muted">{recipe.summary}</div>
        )}
        <div className="week-item-actions">
          <button type="button" className="btn btn-ghost" onClick={onEdit}>
            Edit stock check
          </button>
          <button type="button" className="week-remove" onClick={onRemove}>
            Remove
          </button>
        </div>
      </div>
      <span className="week-item-count">{recipe.itemCount}</span>
    </div>
  );
}

function EmptyWeek() {
  return (
    <div className="week-empty">
      <div className="week-empty-icon" aria-hidden>
        <CookingPot size={34} />
      </div>
      <h3>Nothing on the menu</h3>
      <p className="text-muted">
        Pick a few recipes and we&rsquo;ll work out what you actually need to buy.
      </p>
      <hr className="week-empty-rule" />
      <Link href="/recipes" className="btn btn-primary" style={{ height: 44, paddingInline: 22 }}>
        Browse recipes
      </Link>
      <Link href="/shopping-list" className="btn btn-ghost" style={{ marginTop: 6, fontSize: 13 }}>
        Or just add items to the list
      </Link>
    </div>
  );
}
