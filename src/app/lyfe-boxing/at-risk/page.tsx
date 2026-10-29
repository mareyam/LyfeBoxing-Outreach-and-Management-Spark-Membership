import { Suspense } from "react";
import { PageHeader, Card } from "@/components/ui";
import { SetupNeeded, SheetError, TabMissing } from "@/components/lyfe/SheetStates";
import GenerateDraftsButton from "@/components/lyfe/GenerateDraftsButton";
import { getAttendance, attendanceTabExists, TABS } from "@/lib/sheets/lyfe-boxing";
import { generateAtRiskCampaignsAction } from "@/app/lyfe-boxing/actions";
import { safeRead } from "@/lib/sheets/safe";
import { findField } from "@/lib/sheets/helpers";

export default function AtRiskPage() {
  return (
    <div className="max-w-5xl">
      <PageHeader
        title="At Risk"
        subtitle="Members who haven't attended in 10+ days, pulled from the Attendance tab."
      />
      <Suspense fallback={<Loading />}>
        <AtRiskContent />
      </Suspense>
    </div>
  );
}

function Loading() {
  return <div className="h-40 rounded-2xl bg-neutral-100 animate-pulse" />;
}

async function AtRiskContent() {
  const existsResult = await safeRead(attendanceTabExists);
  if (existsResult.state === "not-configured") return <SetupNeeded />;
  if (existsResult.state === "error") return <SheetError message={existsResult.message} />;
  if (!existsResult.data) return <TabMissing tabName={TABS.attendance} />;

  const result = await safeRead(getAttendance);
  if (result.state !== "ok") return <SheetError message="Could not read the Attendance tab." />;

  // eslint-disable-next-line react-hooks/purity -- intentionally fresh per request: this data is read live and uncached (see Suspense boundary above)
  const now = Date.now();
  const atRisk = result.data.filter((r) => {
    const lastAttended = findField(r, "last attended");
    if (!lastAttended) return false;
    const date = new Date(lastAttended);
    if (isNaN(date.getTime())) return false;
    const daysAgo = Math.floor((now - date.getTime()) / 86_400_000);
    return daysAgo >= 10;
  });

  return (
    <>
      <Card className="mb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-semibold text-neutral-900">
              {atRisk.length} member{atRisk.length === 1 ? "" : "s"} at risk
            </p>
            <p className="text-sm text-neutral-500 mt-1">
              Generates a friendly &quot;we miss you&quot; SMS and email as Drafts in Campaigns.
            </p>
          </div>
          <GenerateDraftsButton label="Generate at-risk drafts" action={generateAtRiskCampaignsAction} />
        </div>
      </Card>

      {atRisk.length === 0 ? (
        <Card className="text-center py-10 text-sm text-neutral-500">No one is currently at risk.</Card>
      ) : (
        <div className="space-y-3">
          {atRisk.map((r) => {
            const name = findField(r, "name", "member", "member name");
            const lastAttended = findField(r, "last attended");
            const membership = findField(r, "membership");
            return (
              <Card key={r._rowNumber}>
                <p className="font-semibold text-neutral-900">{name || "Unnamed member"}</p>
                <p className="text-sm text-neutral-500 mt-0.5">
                  {membership ? `${membership} · ` : ""}Last attended {lastAttended}
                </p>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
