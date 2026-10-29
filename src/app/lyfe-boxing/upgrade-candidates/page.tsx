import { Suspense } from "react";
import { PageHeader, Card } from "@/components/ui";
import { SetupNeeded, SheetError, TabMissing } from "@/components/lyfe/SheetStates";
import GenerateDraftsButton from "@/components/lyfe/GenerateDraftsButton";
import { getAttendance, attendanceTabExists, TABS } from "@/lib/sheets/lyfe-boxing";
import { generateUpgradeCampaignAction } from "@/app/lyfe-boxing/actions";
import { safeRead } from "@/lib/sheets/safe";
import { findField } from "@/lib/sheets/helpers";

// Plan allowances, approximated per 30 days (×~4.3 weeks). Adjust here if
// Alex confirms different numbers.
const PLAN_MONTHLY_LIMIT: Record<string, number> = {
  "light boxer 1x": 4,
  "basic boxer 2x": 8,
};

export default function UpgradeCandidatesPage() {
  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Upgrade Candidates"
        subtitle="Light Boxer 1x and Basic Boxer 2x members attending more than their plan allows."
      />
      <Suspense fallback={<Loading />}>
        <UpgradeContent />
      </Suspense>
    </div>
  );
}

function Loading() {
  return <div className="h-40 rounded-2xl bg-neutral-100 animate-pulse" />;
}

async function UpgradeContent() {
  const existsResult = await safeRead(attendanceTabExists);
  if (existsResult.state === "not-configured") return <SetupNeeded />;
  if (existsResult.state === "error") return <SheetError message={existsResult.message} />;
  if (!existsResult.data) return <TabMissing tabName={TABS.attendance} />;

  const result = await safeRead(getAttendance);
  if (result.state !== "ok") return <SheetError message="Could not read the Attendance tab." />;

  const candidates = result.data
    .map((r) => {
      const membership = findField(r, "membership").toLowerCase();
      const limit = PLAN_MONTHLY_LIMIT[membership];
      const classes = Number(findField(r, "classes last 30 days").replace(/[^0-9.-]/g, "")) || 0;
      return { row: r, membership, limit, classes };
    })
    .filter((c) => c.limit !== undefined && c.classes > c.limit);

  return (
    <>
      <Card className="mb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-semibold text-neutral-900">
              {candidates.length} upgrade candidate{candidates.length === 1 ? "" : "s"}
            </p>
            <p className="text-sm text-neutral-500 mt-1">
              Generates a monthly upgrade-to-Unlimited email as a Draft in Campaigns.
            </p>
          </div>
          <GenerateDraftsButton label="Generate upgrade draft" action={generateUpgradeCampaignAction} />
        </div>
      </Card>

      {candidates.length === 0 ? (
        <Card className="text-center py-10 text-sm text-neutral-500">No one is currently over their plan limit.</Card>
      ) : (
        <div className="space-y-3">
          {candidates.map((c) => {
            const name = findField(c.row, "name", "member", "member name");
            return (
              <Card key={c.row._rowNumber}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-neutral-900">{name || "Unnamed member"}</p>
                    <p className="text-sm text-neutral-500 mt-0.5 capitalize">{c.membership}</p>
                  </div>
                  <span className="text-xs font-medium text-neutral-500 bg-neutral-100 rounded-full px-3 py-1">
                    {c.classes} / {c.limit} classes this month
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
