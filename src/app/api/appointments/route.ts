import { NextRequest, NextResponse } from "next/server";
import { appendAppointmentRequest, SheetsNotConfiguredError, SheetTabMissingError } from "@/lib/googleSheetsServer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { date, time, type, member, coach } = body ?? {};

    if (!date || !time || !type || !member) {
      return NextResponse.json({ error: "Date, time, type, and member are required." }, { status: 400 });
    }

    await appendAppointmentRequest({ date, time, type, member, coach });
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
