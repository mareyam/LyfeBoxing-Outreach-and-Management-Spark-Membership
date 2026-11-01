import { NextRequest, NextResponse } from "next/server";
import { tokensMatch } from "@/lib/siteAuth";
import { SupabaseNotConfiguredError } from "@/lib/supabaseServer";
import { runLeadFollowups } from "@/lib/supabaseLeadFollowup";

export const maxDuration = 300;

// HARD RULE: this route only ever creates lead_drafts rows with status "draft"
// (see runLeadFollowups / decideLeadFollowup). It never sends an email. Sending
// happens only when a human clicks "Approve & Send" on the Leads page, which
// calls POST /api/leads/drafts/[id]/send.
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
    const summary = await runLeadFollowups();
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    if (err instanceof SupabaseNotConfiguredError) {
      return NextResponse.json({ error: err.message, notConfigured: true }, { status: 503 });
    }
    console.error("[lead-followups] run failed", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Lead follow-up run failed." }, { status: 500 });
  }
}
