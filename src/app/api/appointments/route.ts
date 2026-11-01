import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient, resolveBusinessId, SupabaseNotConfiguredError } from "@/lib/supabaseServer";

const VALID_TYPES = new Set(["intro", "trial class"]);

/** Today's + upcoming appointments, for the Leads page. */
export async function GET(_req: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const businessId = await resolveBusinessId(supabase);
    const { data, error } = await supabase
      .from("appointments")
      .select("id, lead_id, scheduled_at, type, status, source, leads:lead_id (full_name, email)")
      .eq("business_id", businessId)
      .in("status", ["booked", "no_show"])
      .order("scheduled_at", { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ appointments: data ?? [] });
  } catch (err) {
    if (err instanceof SupabaseNotConfiguredError) {
      return NextResponse.json({ error: err.message, notConfigured: true }, { status: 503 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

/** "Book appointment" button — inserts the booking, which stops that lead's follow-up sequence. */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { leadId?: string; date?: string; time?: string; type?: string };
    if (!body.leadId || !body.date || !body.time) {
      return NextResponse.json({ error: "leadId, date, and time are required." }, { status: 400 });
    }
    const type = VALID_TYPES.has(body.type ?? "") ? body.type! : "intro";
    const scheduledAt = new Date(`${body.date}T${body.time}`);
    if (Number.isNaN(scheduledAt.getTime())) {
      return NextResponse.json({ error: "Invalid date/time." }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    const businessId = await resolveBusinessId(supabase);
    const { data, error } = await supabase
      .from("appointments")
      .insert({
        business_id: businessId,
        lead_id: body.leadId,
        scheduled_at: scheduledAt.toISOString(),
        type,
        status: "booked",
        source: "manual",
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ appointment: data });
  } catch (err) {
    if (err instanceof SupabaseNotConfiguredError) {
      return NextResponse.json({ error: err.message, notConfigured: true }, { status: 503 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
