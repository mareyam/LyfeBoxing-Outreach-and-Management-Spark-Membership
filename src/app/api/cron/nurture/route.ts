import { NextRequest, NextResponse } from "next/server";
import { tokensMatch } from "@/lib/siteAuth";
import { SupabaseNotConfiguredError } from "@/lib/supabaseServer";
import { runNurtureCron } from "@/lib/nurture";

export const maxDuration = 300;

// HARD RULE: this route only ever queues an email through the Grok webhook
// ({type:"nurture", ...}). It never writes email_log or advances current_step
// itself — that happens only once Grok confirms via POST /api/grok/sent.
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
    const summary = await runNurtureCron();
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    if (err instanceof SupabaseNotConfiguredError) {
      return NextResponse.json({ error: err.message, notConfigured: true }, { status: 503 });
    }
    console.error("[cron/nurture] run failed", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Nurture run failed." }, { status: 500 });
  }
}
