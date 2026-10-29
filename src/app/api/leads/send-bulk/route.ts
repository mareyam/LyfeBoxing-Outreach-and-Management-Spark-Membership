import { NextRequest, NextResponse } from "next/server";
import { SheetsNotConfiguredError } from "@/lib/googleSheetsServer";
import { getLeadRow, leadEmail, saveLeadDraft } from "@/lib/leadFollowup";
import { notifyGrok } from "@/lib/notifyGrok";
import { webhookErrorFields } from "@/lib/webhookResponse";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items: { row: number; subject?: string; messageBody?: string }[] = Array.isArray(body?.items) ? body.items : [];
    if (items.length === 0) {
      return NextResponse.json({ error: "At least one lead is required." }, { status: 400 });
    }

    const queued: number[] = [];
    const errors: string[] = [];
    for (const item of items) {
      const row = Number(item?.row);
      const messageBody = typeof item?.messageBody === "string" ? item.messageBody : "";
      const subject = typeof item?.subject === "string" ? item.subject : "";
      if (!row || row < 2 || !messageBody.trim()) {
        errors.push(`Row ${row || "?"} was skipped.`);
        continue;
      }
      try {
        const existing = await getLeadRow(row);
        const email = existing ? leadEmail(existing) : "";
        if (!email) {
          errors.push(`Row ${row} has no email.`);
          continue;
        }
        await saveLeadDraft({ row, subject, messageBody, status: "Queued" });
        queued.push(row);
      } catch (err) {
        errors.push(err instanceof Error ? err.message : `Row ${row} failed.`);
      }
    }

    if (queued.length === 0) {
      return NextResponse.json({ error: errors[0] ?? "None of the selected leads could be queued." }, { status: 400 });
    }

    try {
      await notifyGrok({ tab: "Leads", rows: queued, kind: "lead" });
    } catch (err) {
      const failure = webhookErrorFields(err);
      return NextResponse.json({ error: failure.error, queued: true }, { status: failure.status });
    }
    return NextResponse.json({ ok: true, queued, errors });
  } catch (err) {
    if (err instanceof SheetsNotConfiguredError) {
      return NextResponse.json({ error: err.message, notConfigured: true }, { status: 503 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't send." }, { status: 400 });
  }
}
