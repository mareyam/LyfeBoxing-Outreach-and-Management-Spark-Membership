import { Suspense } from "react";
import { PageHeader, Card } from "@/components/ui";
import { SetupNeeded, SheetError, EmptyState } from "@/components/lyfe/SheetStates";
import GenerateDraftsButton from "@/components/lyfe/GenerateDraftsButton";
import { getCancelled } from "@/lib/sheets/lyfe-boxing";
import { generateWinbackCampaignsAction } from "@/app/lyfe-boxing/actions";
import { safeRead } from "@/lib/sheets/safe";
import { findField } from "@/lib/sheets/helpers";

export default function CancelledPage() {
  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Cancelled / Win-back"
        subtitle="Members who cancelled, with a win-back draft campaign for anyone gone 14+ days."
      />
      <Suspense fallback={<Loading />}>
        <CancelledContent />
      </Suspense>
    </div>
  );
}

function Loading() {
  return <div className="h-40 rounded-2xl bg-neutral-100 animate-pulse" />;
}

async function CancelledContent() {
  const result = await safeRead(getCancelled);

  if (result.state === "not-configured") return <SetupNeeded />;
  if (result.state === "error") return <SheetError message={result.message} />;
  if (result.data.length === 0) {
    return <EmptyState title="No cancellations" body="This page will list cancelled members once the Cancelled tab has rows." />;
  }

  // eslint-disable-next-line react-hooks/purity -- intentionally fresh per request: this data is read live and uncached (see Suspense boundary above)
  const now = Date.now();
  const rows = result.data.map((r) => {
    const name = findField(r, "name", "member", "member name");
    const dateStr = findField(r, "cancelled date", "cancellation date", "date cancelled", "date");
    const date = dateStr ? new Date(dateStr) : null;
    const daysAgo = date && !isNaN(date.getTime()) ? Math.floor((now - date.getTime()) / 86_400_000) : null;
    return { ...r, name, dateStr, daysAgo };
  });

  const winback = rows.filter((r) => r.daysAgo !== null && r.daysAgo >= 14);

  return (
    <>
      <Card className="mb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-semibold text-neutral-900">
              Win-back: {winback.length} member{winback.length === 1 ? "" : "s"} cancelled 14+ days ago
            </p>
            <p className="text-sm text-neutral-500 mt-1">
              Generates a free-class email and a short &quot;why&apos;d you leave&quot; SMS as Drafts in Campaigns.
            </p>
          </div>
          <GenerateDraftsButton label="Generate win-back drafts" action={generateWinbackCampaignsAction} />
        </div>
      </Card>

      <div className="space-y-3">
        {rows.map((r) => (
          <Card key={r._rowNumber}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-neutral-900">{r.name || "Unnamed member"}</p>
                <p className="text-sm text-neutral-500 mt-0.5">
                  {r.dateStr ? `Cancelled ${r.dateStr}` : "No cancellation date on file"}
                  {r.daysAgo !== null ? ` · ${r.daysAgo} days ago` : ""}
                </p>
              </div>
              {r.daysAgo !== null && r.daysAgo >= 14 && (
                <span className="text-xs font-medium text-neutral-500 bg-neutral-100 rounded-full px-3 py-1">
                  Win-back eligible
                </span>
              )}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
