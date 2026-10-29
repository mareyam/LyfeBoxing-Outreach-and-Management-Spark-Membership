import { NextRequest, NextResponse } from "next/server";
import { queueCampaignSend, SheetsNotConfiguredError } from "@/lib/googleSheetsServer";
import { notifyGrok, kindFromCampaignNotes, GrokNotConfiguredError } from "@/lib/notifyGrok";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const row = Number(body?.row);
    const audience: string | undefined = body?.audience;

    if (!row || row < 2) {
      return NextResponse.json({ error: "A valid row number is required." }, { status: 400 });
    }

    const { notes } = await queueCampaignSend(row, audience);

    try {
      await notifyGrok({ tab: "Campaigns", row, kind: kindFromCampaignNotes(notes) });
    } catch (err) {
      // Row is Queued either way — Grok failing to be notified isn't fatal,
      // but the UI should know so the person can retry if it never picks up.
      if (err instanceof GrokNotConfiguredError) {
        return NextResponse.json({ ok: true, queued: true, grokWarning: err.message });
      }
      return NextResponse.json({ ok: true, queued: true, grokWarning: err instanceof Error ? err.message : "Couldn't notify Grok." });
    }

    return NextResponse.json({ ok: true, queued: true });
  } catch (err) {
    if (err instanceof SheetsNotConfiguredError) {
      return NextResponse.json({ error: err.message, notConfigured: true }, { status: 503 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 400 });
  }
}
