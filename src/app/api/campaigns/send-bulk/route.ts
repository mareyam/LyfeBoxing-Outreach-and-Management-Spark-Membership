import { NextRequest, NextResponse } from "next/server";
import { SheetsNotConfiguredError } from "@/lib/googleSheetsServer";
import { notifyGrok } from "@/lib/notifyGrok";
import { prepareCampaignSend } from "@/lib/sendCampaign";
import { webhookErrorFields } from "@/lib/webhookResponse";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items: { row: number; subject?: string; messageBody?: string }[] = Array.isArray(body?.items) ? body.items : [];

    if (items.length === 0) {
      return NextResponse.json({ error: "At least one row is required." }, { status: 400 });
    }

    const results: { row: number; ok: boolean; kind?: string; error?: string }[] = [];
    const queued: { row: number; kind: string }[] = [];

    for (const item of items) {
      const row = Number(item?.row);
      if (!row || row < 2) {
        results.push({ row, ok: false, error: "A valid row number is required." });
        continue;
      }
      try {
        const { kind } = await prepareCampaignSend({
          row,
          subject: item.subject,
          messageBody: item.messageBody,
        });
        queued.push({ row, kind });
        results.push({ row, ok: true, kind });
      } catch (err) {
        results.push({ row, ok: false, error: err instanceof Error ? err.message : "Unknown error" });
      }
    }

    if (queued.length === 0) {
      return NextResponse.json({ error: "None of the selected rows could be queued.", results }, { status: 400 });
    }

    const kinds = new Set(queued.map((item) => item.kind));
    const kind = kinds.size === 1 ? [...kinds][0] : "campaign";

    try {
      await notifyGrok({
        tab: "Campaigns",
        rows: queued.map((item) => item.row),
        kind,
      });
    } catch (err) {
      const { error, status } = webhookErrorFields(err);
      return NextResponse.json({ error, results, queued: true }, { status });
    }

    return NextResponse.json({ ok: true, results });
  } catch (err) {
    if (err instanceof SheetsNotConfiguredError) {
      return NextResponse.json({ error: err.message, notConfigured: true }, { status: 503 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 400 });
  }
}
