import { Suspense } from "react";
import { Mail, MessageSquare } from "lucide-react";
import { PageHeader, Card, Badge } from "@/components/ui";
import { SetupNeeded, SheetError, EmptyState } from "@/components/lyfe/SheetStates";
import NewCampaignForm from "@/components/lyfe/NewCampaignForm";
import SendCampaignButton from "@/components/lyfe/SendCampaignButton";
import { getCampaigns } from "@/lib/sheets/lyfe-boxing";
import { safeRead } from "@/lib/sheets/safe";

export default function CampaignsPage() {
  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Campaigns"
        subtitle="Draft Email/SMS campaigns here. Ticking Send only queues them — your assistant sends through Spark at the next 3 PM or 12 AM PKT run."
      />

      <div className="mb-6">
        <NewCampaignForm />
      </div>

      <Suspense fallback={<CampaignsLoading />}>
        <CampaignsList />
      </Suspense>
    </div>
  );
}

function CampaignsLoading() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-20 rounded-2xl bg-neutral-100 animate-pulse" />
      ))}
    </div>
  );
}

async function CampaignsList() {
  const result = await safeRead(getCampaigns);

  if (result.state === "not-configured") return <SetupNeeded />;
  if (result.state === "error") return <SheetError message={result.message} />;
  if (result.data.length === 0) {
    return (
      <EmptyState
        title="No campaigns yet"
        body="Use “New campaign” above to draft your first one, or generate one from the Cancelled, Trial Conversion, At Risk, or Upgrade Candidates pages."
      />
    );
  }

  return (
    <div className="space-y-3">
      {result.data.map((c) => {
        const locked = c.Status === "Sending" || c.Status === "Sent" || c.Status === "Queued";
        return (
          <Card key={c._rowNumber}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="h-9 w-9 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
                  {c.Channel === "SMS" ? (
                    <MessageSquare className="h-4 w-4 text-neutral-500" strokeWidth={1.75} />
                  ) : (
                    <Mail className="h-4 w-4 text-neutral-500" strokeWidth={1.75} />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-neutral-900 truncate">
                    {c["Campaign Name"] || "Untitled campaign"}
                  </p>
                  <p className="text-sm text-neutral-500 mt-0.5">
                    {c.Audience || "Audience not set"}
                    {c["Recipients"] ? ` · ${c["Recipients"]} recipients` : ""}
                  </p>
                </div>
              </div>
              <Badge>{c.Status || "Draft"}</Badge>
            </div>

            {c["Message Body"] && (
              <p className="text-sm text-neutral-600 mt-3 whitespace-pre-line line-clamp-3">
                {c["Message Body"]}
              </p>
            )}

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-neutral-100">
              <p className="text-xs text-neutral-400">
                {c["Sent At (PKT)"] ? `Sent ${c["Sent At (PKT)"]}` : "Not sent yet"}
              </p>
              <SendCampaignButton rowNumber={c._rowNumber} locked={locked} />
            </div>
          </Card>
        );
      })}
    </div>
  );
}
