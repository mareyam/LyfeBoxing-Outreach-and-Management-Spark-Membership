import { NextRequest, NextResponse } from "next/server";
import { readTabRows, readRawRows, SheetsNotConfiguredError, SheetTabMissingError } from "@/lib/googleSheetsServer";

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
]);

export async function GET(req: NextRequest) {
  const tab = req.nextUrl.searchParams.get("tab");
  if (!tab || !ALLOWED_TABS.has(tab)) {
    return NextResponse.json({ error: "Unknown or missing tab." }, { status: 400 });
  }

  try {
    if (tab === "Summary") {
      const raw = await readRawRows(tab);
      return NextResponse.json({ raw });
    }
    const rows = await readTabRows(tab);
    return NextResponse.json({ rows });
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
