import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient, resolveBusinessId, SupabaseNotConfiguredError } from "@/lib/supabaseServer";
import { rowNumberToId } from "@/lib/supabaseRowOrder";
import { notifyGrok } from "@/lib/notifyGrok";
import { webhookErrorResponse } from "@/lib/webhookResponse";

// Save an edited (or freshly generated) draft back onto the Past Due row.
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const row = Number(body?.row);
    const { subject, messageBody } = body ?? {};

    if (!row || row < 2) {
      return NextResponse.json({ error: "A valid row number is required." }, { status: 400 });
    }
    if (!messageBody) {
      return NextResponse.json({ error: "messageBody is required." }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    const businessId = await resolveBusinessId(supabase);
    const id = await rowNumberToId(supabase, "past_due", businessId, row);
    if (!id) return NextResponse.json({ error: `Row ${row} not found.` }, { status: 404 });

    const { error } = await supabase
      .from("past_due")
      .update({ email_subject: subject ?? "", email_body: messageBody, email_status: "Draft" })
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

// Saves the edited subject/body, marks Email Status Queued, then tells Grok.
// Grok is the only thing that actually sends — nothing here sends by itself.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const row = Number(body?.row);
    const email: string | undefined = body?.email;
    const subject: string | undefined = body?.subject;
    const messageBody: string | undefined = body?.messageBody;

    if (!row || row < 2) {
      return NextResponse.json({ error: "A valid row number is required." }, { status: 400 });
    }
    if (!email || !email.trim()) {
      return NextResponse.json({ error: "This contact has no email on file — can't send." }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    const businessId = await resolveBusinessId(supabase);
    const id = await rowNumberToId(supabase, "past_due", businessId, row);
    if (!id) return NextResponse.json({ error: `Row ${row} not found.` }, { status: 404 });

    const content: Record<string, string> = { email_status: "Queued" };
    if (subject !== undefined) content.email_subject = subject ?? "";
    if (messageBody !== undefined) content.email_body = messageBody;
    const { error } = await supabase.from("past_due").update(content).eq("id", id).eq("business_id", businessId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    try {
      await notifyGrok({ tab: "Past Due", rows: [row], kind: "past-due" });
    } catch (err) {
      return webhookErrorResponse(err);
    }

    return NextResponse.json({ ok: true, queued: true });
  } catch (err) {
    if (err instanceof SupabaseNotConfiguredError) {
      return NextResponse.json({ error: err.message, notConfigured: true }, { status: 503 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
