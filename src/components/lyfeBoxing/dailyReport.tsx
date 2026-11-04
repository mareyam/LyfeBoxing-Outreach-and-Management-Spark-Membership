"use client";

import { useEffect, useState } from "react";
import { Card, PageHeader } from "@/components/ui";

type Counts = {
  reportDate: string;
  newLeads: number;
  nurtureSent: number;
  repliesByCategory: Record<string, number>;
  unsubscribes: number;
  calendarLinksSent: number;
  appointmentsBooked: number;
  remindersSent: number;
};

function repliesLabel(counts: Record<string, number>): string {
  const entries = Object.entries(counts);
  if (entries.length === 0) return "0";
  return entries.map(([category, n]) => `${n} ${category}`).join(", ");
}

export function DailyReportView() {
  const [reports, setReports] = useState<Counts[]>([]);
  const [today, setToday] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/daily-report")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Couldn't load daily reports.");
        setReports(data.reports ?? []);
        setToday(data.today ?? null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load daily reports."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-sm text-neutral-500">Loading…</div>;

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Daily Report"
        subtitle="New leads, nurture sends, replies, unsubscribes, calendar links, bookings, and reminders — one row per day."
      />
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {today && (
        <Card className="mb-6">
          <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">Today so far ({today.reportDate})</h2>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 text-center">
            <Stat label="New leads" value={today.newLeads} />
            <Stat label="Nurture sent" value={today.nurtureSent} />
            <Stat label="Unsubscribes" value={today.unsubscribes} />
            <Stat label="Calendar links" value={today.calendarLinksSent} />
            <Stat label="Appointments" value={today.appointmentsBooked} />
            <Stat label="Reminders" value={today.remindersSent} />
          </div>
          <p className="text-xs text-neutral-400 mt-3">Replies: {repliesLabel(today.repliesByCategory)}</p>
          <p className="text-xs text-neutral-400 mt-1">
            Saved at 9 PM America/New_York by the daily-report cron; this card is computed live.
          </p>
        </Card>
      )}

      <Card>
        <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">Past days</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-500 border-b border-neutral-200">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">New leads</th>
                <th className="py-2 pr-4">Nurture sent</th>
                <th className="py-2 pr-4">Replies</th>
                <th className="py-2 pr-4">Unsubscribes</th>
                <th className="py-2 pr-4">Calendar links</th>
                <th className="py-2 pr-4">Appointments</th>
                <th className="py-2 pr-4">Reminders</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.reportDate} className="border-b border-neutral-100">
                  <td className="py-2 pr-4">{r.reportDate}</td>
                  <td className="py-2 pr-4">{r.newLeads}</td>
                  <td className="py-2 pr-4">{r.nurtureSent}</td>
                  <td className="py-2 pr-4">{repliesLabel(r.repliesByCategory)}</td>
                  <td className="py-2 pr-4">{r.unsubscribes}</td>
                  <td className="py-2 pr-4">{r.calendarLinksSent}</td>
                  <td className="py-2 pr-4">{r.appointmentsBooked}</td>
                  <td className="py-2 pr-4">{r.remindersSent}</td>
                </tr>
              ))}
              {reports.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-4 text-neutral-500">
                    No saved reports yet — the first one is written at 9 PM America/New_York.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-2xl font-semibold text-neutral-900">{value}</p>
      <p className="text-xs text-neutral-500 mt-1">{label}</p>
    </div>
  );
}
