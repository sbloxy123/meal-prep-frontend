import { PageHeader } from "@/components/page-header";

// Placeholder destination so the shell's "This week" tab resolves. The real
// screen (tray + list + empty state) is built in step 3 of the rebuild.
export default function ThisWeekPage() {
  return (
    <>
      <PageHeader title="This week" />
      <div className="page-body">
        <p className="text-muted">This week arrives in a later step of the rebuild.</p>
      </div>
    </>
  );
}
