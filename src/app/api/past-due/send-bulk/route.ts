import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient, resolveBusinessId, SupabaseNotConfiguredError } from "@/lib/supabaseServer";
import { rowNumberToId } from "@/lib/supabaseRowOrder";
import { notifyGrok } from "@/lib/notifyGrok";
import { webhookErrorFields } from "@/lib/webhookResponse";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items: { row: number; email: string; subject?: string; messageBody?: string }[] = Array.isArray(body?.items)
      ? body.items
      : [];

    const valid = items.filter((i) => i.row >= 2 && i.email?.trim());
    if (valid.length === 0) {
      return NextResponse.json({ error: "At least one row with an email is required." }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    const businessId = await resolveBusinessId(supabase);

    const queuedRows: number[] = [];
    for (const item of valid) {
      try {
        const id = await rowNumberToId(supabase, "past_due", businessId, item.row);
        if (!id) continue;
        const content: Record<string, string> = { email_status: "Queued" };
        if (item.subject !== undefined) content.email_subject = item.subject ?? "";
        if (item.messageBody !== undefined) content.email_body = item.messageBody;
        const { error } = await supabase.from("past_due").update(content).eq("id", id).eq("business_id", businessId);
        if (error) continue;
        queuedRows.push(item.row);
      } catch {
        // skip rows that failed to update; the rest still proceed
      }
    }

    if (queuedRows.length === 0) {
      return NextResponse.json({ error: "None of the selected rows could be queued." }, { status: 400 });
    }

    try {
      await notifyGrok({ tab: "Past Due", rows: queuedRows, kind: "past-due" });
    } catch (err) {
      const { error, status } = webhookErrorFields(err);
      return NextResponse.json({ error, queuedRows }, { status });
    }

    return NextResponse.json({ ok: true, queuedRows });
  } catch (err) {
    if (err instanceof SupabaseNotConfiguredError) {
      return NextResponse.json({ error: err.message, notConfigured: true }, { status: 503 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
