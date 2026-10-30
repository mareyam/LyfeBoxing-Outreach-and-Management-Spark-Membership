import { NextRequest, NextResponse } from "next/server";
import { tokensMatch } from "@/lib/siteAuth";
import { SheetsNotConfiguredError } from "@/lib/googleSheetsServer";
import { runLeadSequence } from "@/lib/leadFollowup";

export const maxDuration = 300;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  const supplied = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
  return tokensMatch(supplied, secret);
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const summary = await runLeadSequence();
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    if (err instanceof SheetsNotConfiguredError) {
      return NextResponse.json({ error: err.message, notConfigured: true }, { status: 503 });
    }
    console.error("[lead-sequence] run failed");
    return NextResponse.json({ error: err instanceof Error ? err.message : "Lead sequence failed." }, { status: 500 });
  }
}
