import { NextRequest, NextResponse } from "next/server";
import { grokAuthorized } from "@/lib/grokAuth";
import { SupabaseNotConfiguredError } from "@/lib/supabaseServer";
import { createReply, type ReplyCategory } from "@/lib/replies";

const CATEGORIES: ReplyCategory[] = ["interested", "positive", "not_interested", "unsubscribe", "question", "other"];

/**
 * Grok's report of an inbound reply. Body: { lead_id, business_id, from_email,
 * subject, snippet, full_text, category }. unsubscribe stops the sequence and
 * flags the lead opted out; interested/positive stops it and flags interested.
 * The lead is never deleted either way.
 */
export async function POST(req: NextRequest) {
  if (!grokAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = (await req.json()) as {
      lead_id?: string;
      from_email?: string;
      subject?: string;
      snippet?: string;
      full_text?: string;
      category?: string;
    };
    if (!body.lead_id) {
      return NextResponse.json({ error: "lead_id is required." }, { status: 400 });
    }
    const category = CATEGORIES.includes(body.category as ReplyCategory) ? (body.category as ReplyCategory) : "other";

    const reply = await createReply({
      leadId: body.lead_id,
      fromEmail: body.from_email ?? "",
      subject: body.subject ?? "",
      snippet: body.snippet ?? "",
      fullText: body.full_text ?? "",
      category,
    });
    return NextResponse.json({ ok: true, reply });
  } catch (err) {
    if (err instanceof SupabaseNotConfiguredError) {
      return NextResponse.json({ error: err.message, notConfigured: true }, { status: 503 });
    }
    console.error("[grok/reply] failed", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't record the reply." }, { status: 500 });
  }
}
