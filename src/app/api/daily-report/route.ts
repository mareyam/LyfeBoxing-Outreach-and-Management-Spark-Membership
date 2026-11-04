import { NextResponse } from "next/server";
import { SupabaseNotConfiguredError } from "@/lib/supabaseServer";
import { computeDailyReport, listDailyReports, todayInTimeZone, DAILY_REPORT_TIME_ZONE } from "@/lib/dailyReport";

export async function GET() {
  try {
    const [reports, today] = await Promise.all([
      listDailyReports(),
      computeDailyReport(todayInTimeZone(DAILY_REPORT_TIME_ZONE)),
    ]);
    return NextResponse.json({ reports, today });
  } catch (err) {
    if (err instanceof SupabaseNotConfiguredError) {
      return NextResponse.json({ error: err.message, notConfigured: true }, { status: 503 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't load daily reports." }, { status: 500 });
  }
}
