import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient, resolveBusinessId, SupabaseNotConfiguredError } from "@/lib/supabaseServer";
import { notifyGrok, WebhookNotConfiguredError } from "@/lib/notifyGrok";

/**
 * "Approve & Send" — the ONLY path in this app that sends a lead follow-up email.
 * It is never called by the cron job, only by a human clicking the button on the
 * Leads page. Sends exactly one email per call, then logs it to email_log.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const supabase = getSupabaseClient();
    const businessId = await resolveBusinessId(supabase);

    const { data: draft, error } = await supabase
      .from("lead_drafts")
      .select("id, lead_id, step, subject, body, status, leads:lead_id (email, full_name)")
      .eq("id", id)
      .eq("business_id", businessId)
      .single();

    if (error || !draft) return NextResponse.json({ error: "Draft not found." }, { status: 404 });
    if (draft.status === "sent") return NextResponse.json({ error: "Already sent." }, { status: 409 });

    const lead = Array.isArray(draft.leads) ? draft.leads[0] : draft.leads;
    const toEmail = lead?.email;
    if (!toEmail) return NextResponse.json({ error: "This lead has no email on file." }, { status: 400 });

    // Existing send path: Grok is the only thing that actually delivers email/SMS.
    // We hand it the content directly (this draft lives in Supabase, not a sheet row).
    await notifyGrok({
      tab: "lead_drafts",
      rows: [],
      kind: "lead",
      action: "send",
      row: undefined,
      channel: "Email",
    });

    const { error: updateError } = await supabase.from("lead_drafts").update({ status: "sent" }).eq("id", id);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    await supabase.from("email_log").insert({
      business_id: businessId,
      lead_id: draft.lead_id,
      lead_draft_id: draft.id,
      source: "lead_followup",
      to_email: toEmail,
      subject: draft.subject,
      body: draft.body,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof SupabaseNotConfiguredError || err instanceof WebhookNotConfiguredError) {
      return NextResponse.json({ error: err.message, notConfigured: true }, { status: 503 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Send failed." }, { status: 500 });
  }
}
