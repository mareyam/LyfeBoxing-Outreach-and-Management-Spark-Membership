import { NextRequest, NextResponse } from "next/server";
import { SheetsNotConfiguredError } from "@/lib/googleSheetsServer";
import { getLeadRow, leadEmail, saveLeadDraft } from "@/lib/leadFollowup";
import { notifyGrok } from "@/lib/notifyGrok";
import { webhookErrorResponse } from "@/lib/webhookResponse";

// Last Contacted is written by Grok after it actually sends. This route only queues.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const row = Number(body?.row);
    const subject = typeof body?.subject === "string" ? body.subject : "";
    const messageBody = typeof body?.messageBody === "string" ? body.messageBody : "";
    if (!row || row < 2) {
      return NextResponse.json({ error: "A valid row number is required." }, { status: 400 });
    }
    if (!messageBody.trim()) {
      return NextResponse.json({ error: "Generate or write a message before sending." }, { status: 400 });
    }
    const existing = await getLeadRow(row);
    const email = existing ? leadEmail(existing) : "";
    if (!email) {
      return NextResponse.json({ error: "This lead has no email — can't send." }, { status: 400 });
    }
    await saveLeadDraft({ row, subject, messageBody, status: "Queued" });
    try {
      await notifyGrok({ tab: "Leads", rows: [row], kind: "lead" });
    } catch (err) {
      return webhookErrorResponse(err);
    }
    return NextResponse.json({ ok: true, queued: true });
  } catch (err) {
    if (err instanceof SheetsNotConfiguredError) {
      return NextResponse.json({ error: err.message, notConfigured: true }, { status: 503 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't send." }, { status: 400 });
  }
}
