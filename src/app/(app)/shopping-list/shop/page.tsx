import Link from "next/link";
import { PageHeader } from "@/components/page-header";

// Placeholder for the generated aisle list / shopping mode, built in step 5.
// The draft list's "Generate list by aisle" routes here after organising.
export default function ShoppingModePage() {
  return (
    <>
      <PageHeader title="Shopping" kicker="By aisle" />
      <div className="page-body">
        <p className="text-muted">
          Your list has been organised by aisle. Shopping mode arrives in the next step of the
          rebuild.
        </p>
        <Link href="/shopping-list" className="btn btn-secondary" style={{ marginTop: 12 }}>
          Back to list
        </Link>
      </div>
    </>
  );
}
