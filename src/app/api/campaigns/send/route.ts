import { NextRequest, NextResponse } from "next/server";
import { queueCampaignSend, SheetsNotConfiguredError } from "@/lib/googleSheetsServer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const row = Number(body?.row);
    if (!row || row < 2) {
      return NextResponse.json({ error: "A valid row number is required." }, { status: 400 });
    }

    await queueCampaignSend(row);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof SheetsNotConfiguredError) {
      return NextResponse.json({ error: err.message, notConfigured: true }, { status: 503 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 400 });
  }
}
