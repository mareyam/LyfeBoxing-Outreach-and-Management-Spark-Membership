import { NextRequest, NextResponse } from "next/server";
import { queueCampaignSendBulk, SheetsNotConfiguredError } from "@/lib/googleSheetsServer";
import { notifyGrok, kindFromCampaignNotes, GrokNotConfiguredError } from "@/lib/notifyGrok";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items: { row: number; audience?: string }[] = Array.isArray(body?.items) ? body.items : [];

    if (items.length === 0) {
      return NextResponse.json({ error: "At least one row is required." }, { status: 400 });
    }

    const results = await queueCampaignSendBulk(items);
    const queuedRows = results.filter((r) => r.ok).map((r) => r.row);
    const kinds = new Set(results.filter((r) => r.ok).map((r) => kindFromCampaignNotes(r.notes)));
    const kind = kinds.size === 1 ? [...kinds][0] : "campaign";

    let grokWarning: string | undefined;
    if (queuedRows.length > 0) {
      try {
        await notifyGrok({ tab: "Campaigns", rows: queuedRows, kind });
      } catch (err) {
        grokWarning = err instanceof GrokNotConfiguredError || err instanceof Error ? err.message : "Couldn't notify Grok.";
      }
    }

    return NextResponse.json({ ok: true, results, grokWarning });
  } catch (err) {
    if (err instanceof SheetsNotConfiguredError) {
      return NextResponse.json({ error: err.message, notConfigured: true }, { status: 503 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 400 });
  }
}
