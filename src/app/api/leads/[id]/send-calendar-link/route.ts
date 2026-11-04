import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient, resolveBusinessId, SupabaseNotConfiguredError } from "@/lib/supabaseServer";
import { resolveBookingCalendarUrl } from "@/lib/playbook";
import { notifyGrokPayload } from "@/lib/notifyGrok";

/** "Send calendar link" button on Replies and on interested leads. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: leadId } = await params;
  try {
    const supabase = getSupabaseClient();
    const businessId = await resolveBusinessId(supabase);

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, full_name, email")
      .eq("id", leadId)
      .eq("business_id", businessId)
      .single();
    if (leadError || !lead) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }
    if (!lead.email) {
      return NextResponse.json({ error: "This lead has no email on file." }, { status: 400 });
    }

    const url = await resolveBookingCalendarUrl();
    if (!url) {
      return NextResponse.json({ error: "Set a booking calendar URL on the Playbook page first." }, { status: 400 });
    }

    const firstName = (lead.full_name ?? "").trim().split(/\s+/)[0] || "there";
    const subject = "Pick a time that works for you";
    const body = `Hi ${firstName}, here's the link to grab a time on the calendar: ${url}`;

    await notifyGrokPayload(
      {
        type: "calendar_link",
        business_id: businessId,
        lead_id: lead.id,
        to: lead.email,
        first_name: firstName,
        url,
      },
      `calendar_link lead=${lead.id}`
    );

    await supabase.from("email_log").insert({
      business_id: businessId,
      lead_id: lead.id,
      source: "calendar_link",
      to_email: lead.email,
      subject,
      body,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof SupabaseNotConfiguredError) {
      return NextResponse.json({ error: err.message, notConfigured: true }, { status: 503 });
    }
    console.error("[send-calendar-link] failed", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't send the calendar link." }, { status: 500 });
  }
}
