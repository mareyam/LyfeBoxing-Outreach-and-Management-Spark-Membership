import { NextRequest, NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/grokAuth";
import { SupabaseNotConfiguredError } from "@/lib/supabaseServer";
import { runDailyReportCron } from "@/lib/dailyReport";

export const maxDuration = 300;

// Scheduled for 01:00 UTC (9 PM EDT). During EST (UTC-5, roughly early Nov
// to mid March) this runs at 8 PM ET instead of 9 PM — a one-hour DST drift
// Vercel Cron's fixed UTC schedule can't avoid without a second cron entry.
export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const counts = await runDailyReportCron();
    return NextResponse.json({ ok: true, ...counts });
  } catch (err) {
    if (err instanceof SupabaseNotConfiguredError) {
      return NextResponse.json({ error: err.message, notConfigured: true }, { status: 503 });
    }
    console.error("[cron/daily-report] run failed", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Daily report failed." }, { status: 500 });
  }
}
