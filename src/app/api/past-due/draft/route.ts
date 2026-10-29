import { NextRequest, NextResponse } from "next/server";
import { updateTabRowCells, SheetsNotConfiguredError, SheetTabMissingError } from "@/lib/googleSheetsServer";
import { notifyGrok } from "@/lib/notifyGrok";
import { webhookErrorResponse } from "@/lib/webhookResponse";

const TAB = "Past Due";

// Save an edited (or freshly generated) draft back onto the Past Due row.
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const row = Number(body?.row);
    const { subject, messageBody } = body ?? {};

    if (!row || row < 2) {
      return NextResponse.json({ error: "A valid row number is required." }, { status: 400 });
    }
    if (!messageBody) {
      return NextResponse.json({ error: "messageBody is required." }, { status: 400 });
    }

    await updateTabRowCells(TAB, row, {
      "Email Subject": subject ?? "",
      "Email Body": messageBody,
      "Email Status": "Draft",
    });
    return NextResponse.json({ ok: true });
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

// Saves the edited subject/body, marks Email Status (column M) Queued, then
// tells Grok. Grok is the only thing that actually sends.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const row = Number(body?.row);
    const email: string | undefined = body?.email;
    const subject: string | undefined = body?.subject;
    const messageBody: string | undefined = body?.messageBody;

    if (!row || row < 2) {
      return NextResponse.json({ error: "A valid row number is required." }, { status: 400 });
    }
    if (!email || !email.trim()) {
      return NextResponse.json({ error: "This contact has no email on file — can't send." }, { status: 400 });
    }

    const content: Record<string, string> = {};
    if (subject !== undefined) content["Email Subject"] = subject ?? "";
    if (messageBody !== undefined) content["Email Body"] = messageBody;
    if (Object.keys(content).length > 0) {
      await updateTabRowCells(TAB, row, content);
    }
    await updateTabRowCells(TAB, row, { "Email Status": "Queued" });

    try {
      await notifyGrok({ tab: "Past Due", rows: [row], kind: "past-due" });
    } catch (err) {
      return webhookErrorResponse(err);
    }

    return NextResponse.json({ ok: true, queued: true });
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
