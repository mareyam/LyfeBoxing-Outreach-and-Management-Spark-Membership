import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient, resolveBusinessId, SupabaseNotConfiguredError } from "@/lib/supabaseServer";

/** Edit a draft's subject/body before sending (Edit button on the Leads page). */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = (await req.json()) as { subject?: string; body?: string };
    const supabase = getSupabaseClient();
    const businessId = await resolveBusinessId(supabase);

    const { error } = await supabase
      .from("lead_drafts")
      .update({ subject: body.subject ?? undefined, body: body.body ?? undefined })
      .eq("id", id)
      .eq("business_id", businessId)
      .eq("status", "draft");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof SupabaseNotConfiguredError) {
      return NextResponse.json({ error: err.message, notConfigured: true }, { status: 503 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
