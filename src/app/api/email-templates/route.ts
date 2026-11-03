import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient, resolveBusinessId, SupabaseNotConfiguredError } from "@/lib/supabaseServer";
import { rowNumberToId } from "@/lib/supabaseRowOrder";

export async function GET() {
  try {
    const supabase = getSupabaseClient();
    const businessId = await resolveBusinessId(supabase);
    const { data, error } = await supabase
      .from("email_templates")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const templates = (data ?? [])
      .map((r, i) => ({
        row: i + 2,
        name: r.name ?? "",
        subject: r.subject ?? "",
        body: r.body ?? "",
        created: r.created ?? "",
      }))
      .filter((t) => t.name.trim() !== "");
    return NextResponse.json({ templates });
  } catch (err) {
    if (err instanceof SupabaseNotConfiguredError) {
      return NextResponse.json({ error: err.message, notConfigured: true }, { status: 503 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, subject, body: templateBody } = body ?? {};
    if (!name || !subject || !templateBody) {
      return NextResponse.json({ error: "name, subject, and body are required." }, { status: 400 });
    }
    const supabase = getSupabaseClient();
    const businessId = await resolveBusinessId(supabase);
    const { error } = await supabase.from("email_templates").insert({
      business_id: businessId,
      name,
      subject,
      body: templateBody,
      created: new Date().toLocaleDateString("en-US"),
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof SupabaseNotConfiguredError) {
      return NextResponse.json({ error: err.message, notConfigured: true }, { status: 503 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { row, name, subject, body: templateBody } = body ?? {};
    if (!row || row < 2) {
      return NextResponse.json({ error: "A valid row number is required." }, { status: 400 });
    }
    if (!name || !subject || !templateBody) {
      return NextResponse.json({ error: "name, subject, and body are required." }, { status: 400 });
    }
    const supabase = getSupabaseClient();
    const businessId = await resolveBusinessId(supabase);
    const id = await rowNumberToId(supabase, "email_templates", businessId, row);
    if (!id) return NextResponse.json({ error: `Row ${row} not found.` }, { status: 404 });
    const { error } = await supabase
      .from("email_templates")
      .update({ name, subject, body: templateBody })
      .eq("id", id)
      .eq("business_id", businessId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof SupabaseNotConfiguredError) {
      return NextResponse.json({ error: err.message, notConfigured: true }, { status: 503 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const row = Number(req.nextUrl.searchParams.get("row"));
    if (!row || row < 2) {
      return NextResponse.json({ error: "A valid row number is required." }, { status: 400 });
    }
    const supabase = getSupabaseClient();
    const businessId = await resolveBusinessId(supabase);
    const id = await rowNumberToId(supabase, "email_templates", businessId, row);
    if (!id) return NextResponse.json({ ok: true }); // already gone
    // Never delete rows: templates are "removed" by blanking them out so
    // row-number ordering for everything after it stays stable.
    const { error } = await supabase
      .from("email_templates")
      .update({ name: "", subject: "", body: "" })
      .eq("id", id)
      .eq("business_id", businessId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof SupabaseNotConfiguredError) {
      return NextResponse.json({ error: err.message, notConfigured: true }, { status: 503 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
