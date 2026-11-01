import { NextRequest, NextResponse } from "next/server";
import { getCachedRawTab, getCachedSheetTitles, getCachedTab } from "@/lib/cachedSheets";
import { SheetsNotConfiguredError, SheetTabMissingError } from "@/lib/googleSheetsServer";
import {
  ATTENDANCE_TAB_CANDIDATES,
  filterPastDueRows,
  missingAttendanceHeaders,
  PAST_DUE_SOURCE_LABEL,
  pastDueExcludeNames,
} from "@/lib/lyfeMetrics";

const ALLOWED_TABS = new Set([
  "All Memberships",
  "Summary",
  "Payments (Oct 1-25)",
  "Cancelled (Oct)",
  "Past Due",
  "SMS Conversations",
  "Contacts",
  "Leads",
  "Digest",
  "Playbook",
  "Attendance",
  "Email Templates",
]);

const TAB_CANDIDATES: Record<string, readonly string[]> = {
  Attendance: ATTENDANCE_TAB_CANDIDATES,
};

export async function GET(req: NextRequest) {
  const tab = req.nextUrl.searchParams.get("tab");
  if (!tab || !ALLOWED_TABS.has(tab)) {
    return NextResponse.json({ error: "Unknown or missing tab." }, { status: 400 });
  }

  try {
    const resolvedTab = await resolveTab(tab);
    if (tab === "Summary") {
      const raw = await getCachedRawTab(resolvedTab);
      return NextResponse.json({ raw, resolvedTab });
    }
    const { headers, rows } = await getCachedTab(resolvedTab);
    if (tab === "Past Due") {
      const filtered = filterPastDueRows(rows, pastDueExcludeNames(process.env.PAST_DUE_EXCLUDE_NAMES));
      return NextResponse.json({
        rows: filtered.rows,
        headers,
        resolvedTab,
        source: PAST_DUE_SOURCE_LABEL,
        hiddenZeroBalance: filtered.hiddenZeroBalance,
        hiddenTestContacts: filtered.hiddenTestContacts,
      });
    }
    const missingHeaders = tab === "Attendance" ? missingAttendanceHeaders(headers) : [];
    return NextResponse.json({ rows, headers, resolvedTab, missingHeaders });
  } catch (err) {
    if (err instanceof SheetsNotConfiguredError) {
      return NextResponse.json({ error: err.message, notConfigured: true }, { status: 503 });
    }
    if (err instanceof SheetTabMissingError) {
      return NextResponse.json({ error: err.message, tabMissing: true }, { status: 503 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

async function resolveTab(requested: string): Promise<string> {
  const candidates = TAB_CANDIDATES[requested] ?? [requested];
  const titles = await getCachedSheetTitles();
  const found = candidates.find((name) => titles.includes(name));
  if (found) return found;
  if (candidates.length === 1) throw new SheetTabMissingError(candidates[0]);
  throw new SheetTabMissingError(candidates.join('" or "'));
}
