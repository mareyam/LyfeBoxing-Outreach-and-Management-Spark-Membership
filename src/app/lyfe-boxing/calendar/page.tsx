import { Suspense } from "react";
import { PageHeader, Card, Badge } from "@/components/ui";
import { SetupNeeded, SheetError, TabMissing } from "@/components/lyfe/SheetStates";
import BookAppointmentForm from "@/components/lyfe/BookAppointmentForm";
import { getAppointments, appointmentsTabExists, TABS } from "@/lib/sheets/lyfe-boxing";
import { safeRead } from "@/lib/sheets/safe";

export default function CalendarPage() {
  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Calendar"
        subtitle="Appointments and booking requests, grouped by date."
      />
      <div className="mb-6">
        <BookAppointmentForm />
      </div>
      <Suspense fallback={<div className="h-40 rounded-2xl bg-neutral-100 animate-pulse" />}>
        <CalendarContent />
      </Suspense>
    </div>
  );
}

async function CalendarContent() {
  const existsResult = await safeRead(appointmentsTabExists);
  if (existsResult.state === "not-configured") return <SetupNeeded />;
  if (existsResult.state === "error") return <SheetError message={existsResult.message} />;
  if (!existsResult.data) return <TabMissing tabName={TABS.appointments} />;

  const result = await safeRead(getAppointments);
  if (result.state !== "ok") return <SheetError message="Could not read the Appointments tab." />;

  if (result.data.length === 0) {
    return <Card className="text-center py-10 text-sm text-neutral-500">No appointments booked yet.</Card>;
  }

  const byDate = new Map<string, typeof result.data>();
  for (const row of result.data) {
    const date = row.Date || "Unscheduled";
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date)!.push(row);
  }
  const sortedDates = [...byDate.keys()].sort();

  return (
    <div className="space-y-6">
      {sortedDates.map((date) => (
        <div key={date}>
          <p className="text-sm font-semibold text-neutral-900 mb-2">{date}</p>
          <div className="space-y-2">
            {byDate.get(date)!.map((a) => (
              <Card key={a._rowNumber} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-neutral-900">
                    {a.Time} · {a.Type}
                  </p>
                  <p className="text-sm text-neutral-500 mt-0.5">
                    {a.Member}
                    {a.Coach ? ` · with ${a.Coach}` : ""}
                  </p>
                </div>
                <Badge>{a.Status || "Requested"}</Badge>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
