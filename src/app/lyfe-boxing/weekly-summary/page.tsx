import { Suspense } from "react";
import { PageHeader, Card, Stat } from "@/components/ui";
import { SetupNeeded, SheetError } from "@/components/lyfe/SheetStates";
import {
  getPayments,
  getCancelled,
  getPastDue,
  getCampaigns,
  attendanceTabExists,
  getAttendance,
} from "@/lib/sheets/lyfe-boxing";
import { safeRead } from "@/lib/sheets/safe";
import { findField, parseMoney, formatMoney } from "@/lib/sheets/helpers";

export default function WeeklySummaryPage() {
  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Weekly Summary"
        subtitle="A clean, screenshot-ready recap to send to Alex."
      />
      <Suspense fallback={<div className="h-80 rounded-2xl bg-neutral-100 animate-pulse" />}>
        <SummaryContent />
      </Suspense>
    </div>
  );
}

function withinLast7Days(dateStr: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  return Date.now() - d.getTime() <= 7 * 86_400_000;
}

async function SummaryContent() {
  const [payments, cancelled, pastDue, campaigns, attendanceExists] = await Promise.all([
    safeRead(getPayments),
    safeRead(getCancelled),
    safeRead(getPastDue),
    safeRead(getCampaigns),
    safeRead(attendanceTabExists),
  ]);

  if (payments.state === "not-configured") return <SetupNeeded />;
  const firstError = [payments, cancelled, pastDue, campaigns].find((r) => r.state === "error");
  if (firstError && firstError.state === "error") return <SheetError message={firstError.message} />;

  const paymentRows = payments.state === "ok" ? payments.data : [];
  const cancelledRows = cancelled.state === "ok" ? cancelled.data : [];
  const pastDueRows = pastDue.state === "ok" ? pastDue.data : [];
  const campaignRows = campaigns.state === "ok" ? campaigns.data : [];

  const revenue = paymentRows.reduce((sum, r) => sum + parseMoney(findField(r, "amount", "amount paid", "payment")), 0);
  const newThisWeek = paymentRows.filter((r) => withinLast7Days(findField(r, "date", "payment date"))).length;
  const cancellationsThisWeek = cancelledRows.filter((r) =>
    withinLast7Days(findField(r, "cancelled date", "cancellation date", "date"))
  ).length;
  const pastDueTotal = pastDueRows.reduce((sum, r) => sum + parseMoney(findField(r, "amount due", "amount owed", "balance", "amount")), 0);
  const campaignsSentThisWeek = campaignRows.filter(
    (r) => (r.Status === "Sent" || r.Status === "Queued") && withinLast7Days(r["Sent At (PKT)"] ?? "")
  );

  let topAtRisk: { name: string; lastAttended: string }[] = [];
  if (attendanceExists.state === "ok" && attendanceExists.data) {
    const attendance = await safeRead(getAttendance);
    if (attendance.state === "ok") {
      // eslint-disable-next-line react-hooks/purity -- intentionally fresh per request: this data is read live and uncached (see Suspense boundary above)
      const now = Date.now();
      topAtRisk = attendance.data
        .map((r) => ({
          name: findField(r, "name", "member", "member name"),
          lastAttended: findField(r, "last attended"),
        }))
        .filter((m) => {
          const d = new Date(m.lastAttended);
          return !isNaN(d.getTime()) && now - d.getTime() >= 10 * 86_400_000;
        })
        .sort((a, b) => new Date(a.lastAttended).getTime() - new Date(b.lastAttended).getTime())
        .slice(0, 5);
    }
  }

  return (
    <div id="weekly-summary-card">
      <Card>
        <p className="text-xs text-neutral-400 uppercase tracking-wide font-medium">
          Week ending {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </p>
        <p className="text-xl font-semibold text-neutral-900 mt-1">Lyfe Boxing — Weekly Summary</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-5">
          <Stat label="New members" value={newThisWeek} />
          <Stat label="Cancellations" value={cancellationsThisWeek} />
          <Stat label="Revenue (period)" value={formatMoney(revenue)} />
          <Stat label="Past due total" value={formatMoney(pastDueTotal)} />
          <Stat label="Campaigns sent" value={campaignsSentThisWeek.length} />
          <Stat label="Members past due" value={pastDueRows.length} />
        </div>

        <div className="mt-6 pt-5 border-t border-neutral-100">
          <p className="text-sm font-semibold text-neutral-900 mb-2">Top at-risk members</p>
          {topAtRisk.length === 0 ? (
            <p className="text-sm text-neutral-400">
              {attendanceExists.state === "ok" && attendanceExists.data
                ? "Nobody currently at risk."
                : "Add the Attendance tab to see this."}
            </p>
          ) : (
            <ul className="text-sm text-neutral-600 space-y-1">
              {topAtRisk.map((m, i) => (
                <li key={i}>
                  {m.name || "Unnamed member"} — last attended {m.lastAttended}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-6 pt-5 border-t border-neutral-100">
          <p className="text-sm font-semibold text-neutral-900 mb-2">Campaigns sent this week</p>
          {campaignsSentThisWeek.length === 0 ? (
            <p className="text-sm text-neutral-400">None yet.</p>
          ) : (
            <ul className="text-sm text-neutral-600 space-y-1">
              {campaignsSentThisWeek.map((c) => (
                <li key={c._rowNumber}>
                  {c["Campaign Name"]} ({c.Channel}) — {c.Status}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}
