import { NextRequest, NextResponse } from "next/server";
import { SheetsNotConfiguredError } from "@/lib/googleSheetsServer";
import { notifyGrok } from "@/lib/notifyGrok";
import { MissingEmailError, prepareCampaignSend } from "@/lib/sendCampaign";
import { webhookErrorResponse } from "@/lib/webhookResponse";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const row = Number(body?.row);
    const subject: string | undefined = body?.subject;
    const messageBody: string | undefined = body?.messageBody;

    if (!row || row < 2) {
      return NextResponse.json({ error: "A valid row number is required." }, { status: 400 });
    }

    const { kind } = await prepareCampaignSend({ row, subject, messageBody });

    try {
      await notifyGrok({ tab: "Campaigns", rows: [row], kind });
    } catch (err) {
      return webhookErrorResponse(err);
    }

    return NextResponse.json({ ok: true, queued: true });
  } catch (err) {
    if (err instanceof SheetsNotConfiguredError) {
      return NextResponse.json({ error: err.message, notConfigured: true }, { status: 503 });
    }
    if (err instanceof MissingEmailError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 400 });
  }
}
