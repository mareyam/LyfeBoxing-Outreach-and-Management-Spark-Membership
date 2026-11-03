import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient, resolveBusinessId, SupabaseNotConfiguredError } from "@/lib/supabaseServer";
import { rowNumberToId } from "@/lib/supabaseRowOrder";
import { notifyGrok } from "@/lib/notifyGrok";
import { webhookErrorResponse } from "@/lib/webhookResponse";

/** A row in one of these statuses is already in flight or finished — refuse to re-queue it. */
const BLOCKED_FOR_QUEUE = new Set(["Queued", "Running", "Sending", "Completed"]);

async function listSequences(supabase: ReturnType<typeof getSupabaseClient>, businessId: string) {
  const { data, error } = await supabase
    .from("campaign_sequences")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? [])
    .map((r, i) => ({
      row: i + 2,
      name: r.sequence_name ?? "",
      audience: r.audience ?? "",
      startDate: r.start_date ?? "",
      nodes: r.steps ? JSON.stringify(r.steps) : "",
      status: r.status ?? "Draft",
      currentStep: r.current_step ?? "",
      nextRunAt: r.next_run_at ?? "",
      lastSentAt: r.last_sent_at ?? "",
      notes: r.notes ?? "",
    }))
    .filter((s) => s.name.trim() !== "");
}

export async function GET() {
  try {
    const supabase = getSupabaseClient();
    const businessId = await resolveBusinessId(supabase);
    const sequences = await listSequences(supabase, businessId);
    return NextResponse.json({ sequences });
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
    const { name, audience, startDate, nodes, status } = body ?? {};
    if (!name || !nodes) {
      return NextResponse.json({ error: "name and nodes are required." }, { status: 400 });
    }
    const starting = status === "Queued";

    const supabase = getSupabaseClient();
    const businessId = await resolveBusinessId(supabase);
    const { data, error } = await supabase
      .from("campaign_sequences")
      .insert({
        business_id: businessId,
        sequence_name: name,
        audience: audience ?? "",
        start_date: startDate ?? "",
        steps: typeof nodes === "string" ? JSON.parse(nodes) : nodes,
        status: status ?? "Draft",
        current_step: starting ? "0" : "",
        next_run_at: starting ? new Date().toISOString() : "",
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const sequences = await listSequences(supabase, businessId);
    const row = sequences.find((s) => s.name === name)?.row;

    if (starting && row) {
      try {
        await notifyGrok({ tab: "Campaign Sequences", rows: [row], kind: "sequence", row, action: "send" });
      } catch (err) {
        return webhookErrorResponse(err);
      }
    }

    return NextResponse.json({ ok: true, row });
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
    const row = Number(body?.row);
    const { name, audience, startDate, nodes, status } = body ?? {};
    if (!row || row < 2) {
      return NextResponse.json({ error: "A valid row number is required." }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    const businessId = await resolveBusinessId(supabase);
    const id = await rowNumberToId(supabase, "campaign_sequences", businessId, row);
    if (!id) return NextResponse.json({ error: `Row ${row} not found.` }, { status: 404 });

    const starting = status === "Queued";
    if (starting) {
      const { data: current } = await supabase
        .from("campaign_sequences")
        .select("status")
        .eq("id", id)
        .eq("business_id", businessId)
        .single();
      const currentStatus = current?.status ?? "";
      if (BLOCKED_FOR_QUEUE.has(currentStatus)) {
        return NextResponse.json({ error: `Row ${row} can't be queued from status "${currentStatus}".` }, { status: 409 });
      }
    }

    const update: Record<string, unknown> = {};
    if (name !== undefined) update.sequence_name = name;
    if (audience !== undefined) update.audience = audience;
    if (startDate !== undefined) update.start_date = startDate;
    if (nodes !== undefined) update.steps = typeof nodes === "string" ? JSON.parse(nodes) : nodes;
    if (status !== undefined) update.status = status;
    if (starting) {
      update.current_step = "0";
      update.next_run_at = new Date().toISOString();
    }

    const { error } = await supabase.from("campaign_sequences").update(update).eq("id", id).eq("business_id", businessId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (starting) {
      try {
        await notifyGrok({ tab: "Campaign Sequences", rows: [row], kind: "sequence", row, action: "send" });
      } catch (err) {
        return webhookErrorResponse(err);
      }
    }

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
    const id = await rowNumberToId(supabase, "campaign_sequences", businessId, row);
    if (!id) return NextResponse.json({ ok: true });
    // Never delete rows — "remove" blanks the sequence out of the list instead.
    const { error } = await supabase
      .from("campaign_sequences")
      .update({ sequence_name: "" })
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
