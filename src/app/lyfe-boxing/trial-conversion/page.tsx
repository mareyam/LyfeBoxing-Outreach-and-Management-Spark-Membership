import { Suspense } from "react";
import { PageHeader, Card } from "@/components/ui";
import { SetupNeeded, SheetError, EmptyState } from "@/components/lyfe/SheetStates";
import GenerateDraftsButton from "@/components/lyfe/GenerateDraftsButton";
import { getMemberships } from "@/lib/sheets/lyfe-boxing";
import { generateTrialCampaignsAction } from "@/app/lyfe-boxing/actions";
import { safeRead } from "@/lib/sheets/safe";
import { findField } from "@/lib/sheets/helpers";

const TRIAL_MEMBERSHIPS = ["1 Day Boxing Program", "Ignite Pro | Adult Boxing | 3-Class Trial for $19.95"];

export default function TrialConversionPage() {
  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Trial Conversion"
        subtitle="Trial and 1-Day Boxing Program members to follow up with and convert to a full membership."
      />
      <Suspense fallback={<Loading />}>
        <TrialContent />
      </Suspense>
    </div>
  );
}

function Loading() {
  return <div className="h-40 rounded-2xl bg-neutral-100 animate-pulse" />;
}

async function TrialContent() {
  const result = await safeRead(getMemberships);

  if (result.state === "not-configured") return <SetupNeeded />;
  if (result.state === "error") return <SheetError message={result.message} />;

  const trialMembers = result.data.filter((r) => {
    const membership = findField(r, "membership", "membership name", "plan");
    return TRIAL_MEMBERSHIPS.some((t) => membership.toLowerCase().includes(t.toLowerCase().split(" | ")[0]));
  });

  if (result.data.length === 0) {
    return <EmptyState title="No membership data yet" body="This page will list trial members once All Memberships has rows." />;
  }

  return (
    <>
      <Card className="mb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-semibold text-neutral-900">
              {trialMembers.length} trial member{trialMembers.length === 1 ? "" : "s"} found
            </p>
            <p className="text-sm text-neutral-500 mt-1">
              Generates a first-class SMS and a day-3 upgrade email as Drafts in Campaigns.
            </p>
          </div>
          <GenerateDraftsButton label="Generate conversion drafts" action={generateTrialCampaignsAction} />
        </div>
      </Card>

      {trialMembers.length === 0 ? (
        <EmptyState title="No trial members right now" body="Nobody currently on a trial or 1-Day plan." />
      ) : (
        <div className="space-y-3">
          {trialMembers.map((r) => {
            const name = findField(r, "name", "member", "member name");
            const membership = findField(r, "membership", "membership name", "plan");
            return (
              <Card key={r._rowNumber}>
                <p className="font-semibold text-neutral-900">{name || "Unnamed member"}</p>
                <p className="text-sm text-neutral-500 mt-0.5">{membership}</p>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
