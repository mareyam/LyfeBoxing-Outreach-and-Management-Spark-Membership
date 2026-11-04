import { NextRequest, NextResponse } from "next/server";
import { tokensMatch } from "@/lib/siteAuth";
import { SupabaseNotConfiguredError } from "@/lib/supabaseServer";
import { markNurtureStepSent } from "@/lib/nurture";

export const maxDuration = 60;

function authorized(req: NextRequest): boolean {
  const secret = process.env.GROK_WEBHOOK_AUTH?.trim();
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  const supplied = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
  return tokensMatch(supplied, secret);
}

/** Grok's confirmation that a nurture email actually sent. Body: { lead_id, step_no, business_id, to, subject, body }. */
export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = (await req.json()) as {
      lead_id?: string;
      step_no?: number;
      to?: string;
      subject?: string;
      body?: string;
    };
    if (!body.lead_id || !body.step_no || !body.to) {
      return NextResponse.json({ error: "lead_id, step_no, and to are required." }, { status: 400 });
    }
    await markNurtureStepSent({
      leadId: body.lead_id,
      stepNo: Number(body.step_no),
      to: body.to,
      subject: body.subject ?? "",
      body: body.body ?? "",
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof SupabaseNotConfiguredError) {
      return NextResponse.json({ error: err.message, notConfigured: true }, { status: 503 });
    }
    console.error("[grok/sent] failed", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't record the send." }, { status: 500 });
  }
}
