import { NextRequest, NextResponse } from "next/server";
import { SheetsNotConfiguredError } from "@/lib/googleSheetsServer";
import { saveLeadDraft } from "@/lib/leadFollowup";

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const row = Number(body?.row);
    const subject = typeof body?.subject === "string" ? body.subject : "";
    const messageBody = typeof body?.messageBody === "string" ? body.messageBody : "";
    if (!row || row < 2) {
      return NextResponse.json({ error: "A valid row number is required." }, { status: 400 });
    }
    if (!messageBody.trim()) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }
    await saveLeadDraft({ row, subject, messageBody, status: "Draft" });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof SheetsNotConfiguredError) {
      return NextResponse.json({ error: err.message, notConfigured: true }, { status: 503 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't save the draft." }, { status: 400 });
  }
}
