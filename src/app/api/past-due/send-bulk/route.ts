import { NextRequest, NextResponse } from "next/server";
import { updateTabRowCells, SheetsNotConfiguredError, SheetTabMissingError } from "@/lib/googleSheetsServer";
import { notifyGrok, GrokNotConfiguredError } from "@/lib/notifyGrok";

const TAB = "Past Due";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items: { row: number; email: string }[] = Array.isArray(body?.items) ? body.items : [];

    const valid = items.filter((i) => i.row >= 2 && i.email?.trim());
    if (valid.length === 0) {
      return NextResponse.json({ error: "At least one row with an email is required." }, { status: 400 });
    }

    const queuedRows: number[] = [];
    for (const item of valid) {
      try {
        await updateTabRowCells(TAB, item.row, { "Email Status": "Queued" });
        queuedRows.push(item.row);
      } catch {
        // skip rows that failed to update; the rest still proceed
      }
    }

    let grokWarning: string | undefined;
    if (queuedRows.length > 0) {
      try {
        await notifyGrok({ tab: TAB, rows: queuedRows, kind: "past-due" });
      } catch (err) {
        grokWarning = err instanceof GrokNotConfiguredError || err instanceof Error ? err.message : "Couldn't notify Grok.";
      }
    }

    return NextResponse.json({ ok: true, queuedRows, grokWarning });
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
