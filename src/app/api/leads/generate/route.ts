import { NextRequest, NextResponse } from "next/server";
import { SheetsNotConfiguredError } from "@/lib/googleSheetsServer";
import { AiNotConfiguredError } from "@/lib/generateDraft";
import { generateAndStoreLeadDraft } from "@/lib/leadFollowup";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rows: number[] = Array.isArray(body?.rows) ? body.rows.map((row: unknown) => Number(row)) : [Number(body?.row)];
    const targets = rows.filter((row) => row >= 2);
    if (targets.length === 0) {
      return NextResponse.json({ error: "A valid row number is required." }, { status: 400 });
    }

    const results: { row: number; ok: boolean; subject?: string; body?: string; error?: string }[] = [];
    for (const row of targets) {
      try {
        const draft = await generateAndStoreLeadDraft(row);
        results.push({ row, ok: true, subject: draft.subject, body: draft.body });
      } catch (err) {
        if (err instanceof AiNotConfiguredError) {
          return NextResponse.json({ error: err.message, notConfigured: true }, { status: 503 });
        }
        results.push({ row, ok: false, error: err instanceof Error ? err.message : "Couldn't generate a draft." });
      }
    }

    if (results.length === 1 && !results[0].ok) {
      return NextResponse.json({ error: results[0].error }, { status: 400 });
    }
    return NextResponse.json({ ok: results.some((item) => item.ok), results, subject: results[0]?.subject ?? "", body: results[0]?.body ?? "" });
  } catch (err) {
    if (err instanceof SheetsNotConfiguredError) {
      return NextResponse.json({ error: err.message, notConfigured: true }, { status: 503 });
    }
    if (err instanceof AiNotConfiguredError) {
      return NextResponse.json({ error: err.message, notConfigured: true }, { status: 503 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't generate a draft." }, { status: 500 });
  }
}
