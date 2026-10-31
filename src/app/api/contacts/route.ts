import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient, SupabaseNotConfiguredError, LYFE_BOXING_BUSINESS_SLUG } from "@/lib/supabaseServer";

const MAX_LIMIT = 500;
const DEFAULT_LIMIT = 50;

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseClient();

    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("id")
      .eq("slug", LYFE_BOXING_BUSINESS_SLUG)
      .single();

    if (businessError || !business) {
      return NextResponse.json({ error: "Business not found." }, { status: 404 });
    }

    const { searchParams } = req.nextUrl;
    const search = searchParams.get("search")?.trim();
    const contactType = searchParams.get("contactType")?.trim();
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(searchParams.get("limit")) || DEFAULT_LIMIT));
    const offset = Math.max(0, Number(searchParams.get("offset")) || 0);

    let query = supabase
      .from("contacts")
      .select(
        "id, spark_contact_id, full_name, first_name, last_name, email, phone, contact_type, status, date_entered, birthday, age, gender, city, state, zip, country, last_seen_days, prospect_phase, trial_status, trial_phase, marketing_source, referred_by, tags, source, created_at, updated_at",
        { count: "exact" }
      )
      .eq("business_id", business.id)
      .order("full_name", { ascending: true })
      .range(offset, offset + limit - 1);

    if (search) {
      const term = `%${search}%`;
      query = query.or(`full_name.ilike.${term},email.ilike.${term},phone.ilike.${term}`);
    }
    if (contactType) {
      query = query.eq("contact_type", contactType);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      contacts: data ?? [],
      total: count ?? 0,
      limit,
      offset,
    });
  } catch (err) {
    if (err instanceof SupabaseNotConfiguredError) {
      return NextResponse.json({ error: err.message, notConfigured: true }, { status: 503 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
