import { NextRequest, NextResponse } from "next/server";
import { grokAuthorized } from "@/lib/grokAuth";
import { getSupabaseClient, resolveBusinessId, SupabaseNotConfiguredError } from "@/lib/supabaseServer";

const STATUSES = ["booked", "attended", "showed", "no_show", "cancelled"];

/**
 * Grok's report that an appointment was booked or its status changed.
 * Body: { lead_id, scheduled_at, status?, source?, business_id }.
 * Upserts by (lead_id, scheduled_at) so a repeat call updates in place
 * instead of creating a duplicate appointment.
 */
export async function POST(req: NextRequest) {
  if (!grokAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = (await req.json()) as {
      lead_id?: string;
      scheduled_at?: string;
      status?: string;
      source?: string;
    };
    if (!body.lead_id || !body.scheduled_at) {
      return NextResponse.json({ error: "lead_id and scheduled_at are required." }, { status: 400 });
    }
    const status = STATUSES.includes(body.status ?? "") ? (body.status as string) : "booked";

    const supabase = getSupabaseClient();
    const businessId = await resolveBusinessId(supabase);

    const { data: existing } = await supabase
      .from("appointments")
      .select("id")
      .eq("business_id", businessId)
      .eq("lead_id", body.lead_id)
      .eq("scheduled_at", body.scheduled_at)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("appointments")
        .update({ status, source: body.source ?? "grok" })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, id: existing.id, updated: true });
    }

    const { data: created, error } = await supabase
      .from("appointments")
      .insert({
        business_id: businessId,
        lead_id: body.lead_id,
        scheduled_at: body.scheduled_at,
        status,
        source: body.source ?? "grok",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, id: created.id, updated: false });
  } catch (err) {
    if (err instanceof SupabaseNotConfiguredError) {
      return NextResponse.json({ error: err.message, notConfigured: true }, { status: 503 });
    }
    console.error("[grok/appointment] failed", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't save the appointment." }, { status: 500 });
  }
}
