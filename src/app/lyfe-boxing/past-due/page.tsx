import { Suspense } from "react";
import { PageHeader, Card, Badge, Stat } from "@/components/ui";
import { SetupNeeded, SheetError, EmptyState } from "@/components/lyfe/SheetStates";
import EmailModal from "@/components/lyfe/EmailModal";
import { getPastDue } from "@/lib/sheets/lyfe-boxing";
import { safeRead } from "@/lib/sheets/safe";
import { findField, parseMoney, formatMoney } from "@/lib/sheets/helpers";

export default function PastDuePage() {
  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Past Due"
        subtitle="Members behind on payment, with the draft collections email for each."
      />
      <Suspense fallback={<Loading />}>
        <PastDueContent />
      </Suspense>
    </div>
  );
}

function Loading() {
  return (
    <div className="space-y-3">
      <div className="h-20 rounded-2xl bg-neutral-100 animate-pulse" />
      <div className="h-20 rounded-2xl bg-neutral-100 animate-pulse" />
    </div>
  );
}

async function PastDueContent() {
  const result = await safeRead(getPastDue);

  if (result.state === "not-configured") return <SetupNeeded />;
  if (result.state === "error") return <SheetError message={result.message} />;
  if (result.data.length === 0) {
    return <EmptyState title="No one is past due" body="This page will list members once the Past Due tab has rows." />;
  }

  const rows = result.data;
  const totalOwed = rows.reduce((sum, r) => sum + parseMoney(findField(r, "amount due", "amount owed", "balance", "amount")), 0);

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <Stat label="Members past due" value={rows.length} />
        <Stat label="Total overdue amount" value={formatMoney(totalOwed)} />
      </div>

      <div className="space-y-3">
        {rows.map((r) => {
          const name = findField(r, "name", "member", "member name");
          const amount = parseMoney(findField(r, "amount due", "amount owed", "balance", "amount"));
          const emailSubject = findField(r, "email subject");
          const emailBody = findField(r, "email body");
          const emailStatus = findField(r, "email status");

          return (
            <Card key={r._rowNumber}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-neutral-900">{name || "Unnamed member"}</p>
                  <p className="text-sm text-neutral-500 mt-0.5">
                    {amount > 0 ? formatMoney(amount) : "Amount not set"} overdue
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {emailStatus && <Badge>{emailStatus}</Badge>}
                  <EmailModal name={name} subject={emailSubject} body={emailBody} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
