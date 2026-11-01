import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient, resolveBusinessId, SupabaseNotConfiguredError } from "@/lib/supabaseServer";

/** Today's + outstanding draft follow-ups, for the top of the Leads page. Read-only, Supabase only. */
export async function GET(_req: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const businessId = await resolveBusinessId(supabase);

    const { data, error } = await supabase
      .from("lead_drafts")
      .select(
        "id, lead_id, step, subject, body, status, created_at, leads:lead_id (id, full_name, email, stage)"
      )
      .eq("business_id", businessId)
      .in("status", ["draft", "needs_reply"])
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ drafts: data ?? [] });
  } catch (err) {
    if (err instanceof SupabaseNotConfiguredError) {
      return NextResponse.json({ error: err.message, notConfigured: true }, { status: 503 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
