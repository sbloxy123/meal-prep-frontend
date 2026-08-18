import { PageHeader } from "@/components/page-header";

// Placeholder destination so the shell's "List" tab resolves. The draft list
// and shopping mode are built in steps 4–5 of the rebuild.
export default function ShoppingListPage() {
  return (
    <>
      <PageHeader title="List" />
      <div className="page-body">
        <p className="text-muted">The shopping list arrives in a later step of the rebuild.</p>
      </div>
    </>
  );
}
