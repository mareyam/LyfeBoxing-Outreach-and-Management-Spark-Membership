import { NextRequest, NextResponse } from "next/server";
import { updateTabRowCells, SheetsNotConfiguredError, SheetTabMissingError } from "@/lib/googleSheetsServer";

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

// Marks a draft as ready to go out — an external automation ("grok") picks
// up rows in this status and sends them; this app never sends directly.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const row = Number(body?.row);

    if (!row || row < 2) {
      return NextResponse.json({ error: "A valid row number is required." }, { status: 400 });
    }

    await updateTabRowCells(TAB, row, { "Email Status": "Queued" });
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
