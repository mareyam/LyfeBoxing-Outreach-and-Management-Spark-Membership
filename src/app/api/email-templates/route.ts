import { NextRequest, NextResponse } from "next/server";
import {
  readTabRows,
  appendEmailTemplate,
  deleteSheetRow,
  updateTabRowCells,
  SheetsNotConfiguredError,
  SheetTabMissingError,
} from "@/lib/googleSheetsServer";

export async function GET() {
  try {
    const rows = await readTabRows("Email Templates");
    const templates = rows.map((r) => ({
      row: r._row,
      name: r["Name"] ?? "",
      subject: r["Subject"] ?? "",
      body: r["Body"] ?? "",
      created: r["Created"] ?? "",
    }));
    return NextResponse.json({ templates });
  } catch (err) {
    if (err instanceof SheetsNotConfiguredError) {
      return NextResponse.json({ error: err.message, notConfigured: true }, { status: 503 });
    }
    if (err instanceof SheetTabMissingError) {
      return NextResponse.json({ templates: [] });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, subject, body: templateBody } = body ?? {};
    if (!name || !subject || !templateBody) {
      return NextResponse.json({ error: "name, subject, and body are required." }, { status: 400 });
    }
    await appendEmailTemplate({ name, subject, body: templateBody });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof SheetsNotConfiguredError) {
      return NextResponse.json({ error: err.message, notConfigured: true }, { status: 503 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { row, name, subject, body: templateBody } = body ?? {};
    if (!row || row < 2) {
      return NextResponse.json({ error: "A valid row number is required." }, { status: 400 });
    }
    if (!name || !subject || !templateBody) {
      return NextResponse.json({ error: "name, subject, and body are required." }, { status: 400 });
    }
    await updateTabRowCells("Email Templates", row, { Name: name, Subject: subject, Body: templateBody });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof SheetsNotConfiguredError) {
      return NextResponse.json({ error: err.message, notConfigured: true }, { status: 503 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const row = Number(req.nextUrl.searchParams.get("row"));
    if (!row || row < 2) {
      return NextResponse.json({ error: "A valid row number is required." }, { status: 400 });
    }
    await deleteSheetRow("Email Templates", row);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof SheetsNotConfiguredError) {
      return NextResponse.json({ error: err.message, notConfigured: true }, { status: 503 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
