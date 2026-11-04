import "server-only";
import { getSupabaseClient, resolveBusinessId } from "@/lib/supabaseServer";
import { notifyGrokPayload } from "@/lib/notifyGrok";

export const DAILY_REPORT_TIME_ZONE = "America/New_York";

export type DailyReportCounts = {
  reportDate: string;
  newLeads: number;
  nurtureSent: number;
  repliesByCategory: Record<string, number>;
  unsubscribes: number;
  calendarLinksSent: number;
  appointmentsBooked: number;
  remindersSent: number;
};

/** YYYY-MM-DD for "today" in the report's time zone. */
export function todayInTimeZone(timeZone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/**
 * A UTC window wide enough to contain all of dateStr's local day in timeZone
 * (up to a 14h offset either side of UTC), with the exact boundary left to
 * onDate()'s per-row timeZone check below.
 */
function dayBoundsUtc(dateStr: string): { startUtc: string; endUtc: string } {
  const utcMidnight = new Date(`${dateStr}T00:00:00Z`).getTime();
  const startUtc = new Date(utcMidnight - 26 * 60 * 60 * 1000).toISOString();
  const endUtc = new Date(utcMidnight + 26 * 60 * 60 * 1000).toISOString();
  return { startUtc, endUtc };
}

/** Filters rows (already fetched in the wide UTC window) down to ones whose dateField falls on dateStr in timeZone. */
function onDate<T extends Record<string, unknown>>(rows: T[], dateField: keyof T, dateStr: string, timeZone: string): T[] {
  return rows.filter((row) => {
    const value = row[dateField];
    if (!value) return false;
    const local = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
      new Date(value as string)
    );
    return local === dateStr;
  });
}

/** Computes the day's counts for reportDate (YYYY-MM-DD, America/New_York). Read-only. */
export async function computeDailyReport(reportDate: string): Promise<DailyReportCounts> {
  const supabase = getSupabaseClient();
  const businessId = await resolveBusinessId(supabase);
  const { startUtc, endUtc } = dayBoundsUtc(reportDate);

  const [leadsRes, emailLogRes, repliesRes, remindersRes] = await Promise.all([
    supabase.from("leads").select("id, created_at").eq("business_id", businessId).gte("created_at", startUtc).lt("created_at", endUtc),
    supabase
      .from("email_log")
      .select("id, source, sent_at")
      .eq("business_id", businessId)
      .gte("sent_at", startUtc)
      .lt("sent_at", endUtc),
    supabase
      .from("lead_replies")
      .select("id, category, received_at")
      .eq("business_id", businessId)
      .gte("received_at", startUtc)
      .lt("received_at", endUtc),
    supabase
      .from("appointments")
      .select("id, reminder_3d_sent_at, reminder_1d_sent_at")
      .eq("business_id", businessId),
  ]);

  const newLeads = onDate(leadsRes.data ?? [], "created_at", reportDate, DAILY_REPORT_TIME_ZONE).length;

  const emailLog = onDate(emailLogRes.data ?? [], "sent_at", reportDate, DAILY_REPORT_TIME_ZONE);
  const nurtureSent = emailLog.filter((r) => r.source === "nurture").length;
  const calendarLinksSent = emailLog.filter((r) => r.source === "calendar_link").length;

  const replies = onDate(repliesRes.data ?? [], "received_at", reportDate, DAILY_REPORT_TIME_ZONE);
  const repliesByCategory: Record<string, number> = {};
  for (const reply of replies) {
    const category = (reply.category as string) ?? "other";
    repliesByCategory[category] = (repliesByCategory[category] ?? 0) + 1;
  }
  const unsubscribes = repliesByCategory["unsubscribe"] ?? 0;

  // Appointments "booked that day" = rows whose created_at falls on this date.
  const { data: apptCreated } = await supabase
    .from("appointments")
    .select("id, created_at")
    .eq("business_id", businessId)
    .gte("created_at", startUtc)
    .lt("created_at", endUtc);
  const appointmentsBooked = onDate(apptCreated ?? [], "created_at", reportDate, DAILY_REPORT_TIME_ZONE).length;

  const reminderRows = remindersRes.data ?? [];
  const reminders3d = onDate(reminderRows, "reminder_3d_sent_at", reportDate, DAILY_REPORT_TIME_ZONE).length;
  const reminders1d = onDate(reminderRows, "reminder_1d_sent_at", reportDate, DAILY_REPORT_TIME_ZONE).length;

  return {
    reportDate,
    newLeads,
    nurtureSent,
    repliesByCategory,
    unsubscribes,
    calendarLinksSent,
    appointmentsBooked,
    remindersSent: reminders3d + reminders1d,
  };
}

export async function saveDailyReport(counts: DailyReportCounts): Promise<void> {
  const supabase = getSupabaseClient();
  const businessId = await resolveBusinessId(supabase);
  const { error } = await supabase.from("daily_reports").upsert(
    {
      business_id: businessId,
      report_date: counts.reportDate,
      new_leads: counts.newLeads,
      nurture_sent: counts.nurtureSent,
      replies_by_category: counts.repliesByCategory,
      unsubscribes: counts.unsubscribes,
      calendar_links_sent: counts.calendarLinksSent,
      appointments_booked: counts.appointmentsBooked,
      reminders_sent: counts.remindersSent,
    },
    { onConflict: "business_id,report_date" }
  );
  if (error) throw new Error(error.message);
}

/** The 9 PM America/New_York cron: computes, saves, and reports today's counts to Grok. */
export async function runDailyReportCron(): Promise<DailyReportCounts> {
  const supabase = getSupabaseClient();
  const businessId = await resolveBusinessId(supabase);
  const reportDate = todayInTimeZone(DAILY_REPORT_TIME_ZONE);
  const counts = await computeDailyReport(reportDate);
  await saveDailyReport(counts);
  await notifyGrokPayload(
    {
      type: "daily_report",
      business_id: businessId,
      report_date: counts.reportDate,
      new_leads: counts.newLeads,
      nurture_sent: counts.nurtureSent,
      replies_by_category: counts.repliesByCategory,
      unsubscribes: counts.unsubscribes,
      calendar_links_sent: counts.calendarLinksSent,
      appointments_booked: counts.appointmentsBooked,
      reminders_sent: counts.remindersSent,
    },
    `daily_report ${counts.reportDate}`
  );
  return counts;
}

export type DailyReportRow = DailyReportCounts & { id: string };

export async function listDailyReports(limit = 30): Promise<DailyReportRow[]> {
  const supabase = getSupabaseClient();
  const businessId = await resolveBusinessId(supabase);
  const { data, error } = await supabase
    .from("daily_reports")
    .select("*")
    .eq("business_id", businessId)
    .order("report_date", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id as string,
    reportDate: row.report_date as string,
    newLeads: row.new_leads as number,
    nurtureSent: row.nurture_sent as number,
    repliesByCategory: (row.replies_by_category as Record<string, number>) ?? {},
    unsubscribes: row.unsubscribes as number,
    calendarLinksSent: row.calendar_links_sent as number,
    appointmentsBooked: row.appointments_booked as number,
    remindersSent: row.reminders_sent as number,
  }));
}
