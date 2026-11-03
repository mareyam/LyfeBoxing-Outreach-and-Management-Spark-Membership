import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient, resolveBusinessId, SupabaseNotConfiguredError } from "@/lib/supabaseServer";
import { rowNumberToId } from "@/lib/supabaseRowOrder";

async function listCampaigns(supabase: ReturnType<typeof getSupabaseClient>, businessId: string) {
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? [])
    .map((r, i) => ({
      row: i + 2,
      campaignName: r.campaign_name ?? "",
      channel: r.channel ?? "",
      audience: r.audience ?? "",
      subject: r.subject ?? "",
      messageBody: r.message_body ?? "",
      send: Boolean(r.send),
      status: r.status ?? "Draft",
      recipients: r.recipients ?? "",
      sentAt: r.sent_at ?? "",
      notes: r.notes ?? "",
      smsBody: r.sms_body ?? "",
    }))
    .filter((c) => c.campaignName.trim() !== "");
}

export async function GET() {
  try {
    const supabase = getSupabaseClient();
    const businessId = await resolveBusinessId(supabase);
    const campaigns = await listCampaigns(supabase, businessId);
    return NextResponse.json({ campaigns });
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
    const { campaignName, channel, audience, subject, messageBody, notes, smsBody } = body ?? {};

    // audience may be legitimately blank — per-contact drafts (e.g. win-back)
    // target one named person who isn't in the audience dropdown.
    if (!campaignName || !channel) {
      return NextResponse.json({ error: "campaignName and channel are required." }, { status: 400 });
    }
    const needsEmail = channel === "Email" || channel === "Both";
    const needsSms = channel === "SMS" || channel === "Both";
    if (needsEmail && !messageBody) {
      return NextResponse.json({ error: "Message body is required for email campaigns." }, { status: 400 });
    }
    if (needsEmail && !subject) {
      return NextResponse.json({ error: "Subject is required for email campaigns." }, { status: 400 });
    }
    if (needsSms && !smsBody) {
      return NextResponse.json({ error: "SMS message is required for SMS campaigns." }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    const businessId = await resolveBusinessId(supabase);
    const { error } = await supabase.from("campaigns").insert({
      business_id: businessId,
      campaign_name: campaignName,
      channel,
      audience: audience ?? "",
      subject: subject ?? "",
      message_body: messageBody ?? "",
      send: false,
      status: "Draft",
      recipients: "",
      sent_at: "",
      notes: notes ?? "",
      sms_body: smsBody ?? "",
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
    const row = Number(body?.row);
    const { subject, messageBody, smsBody, audience } = body ?? {};

    if (!row || row < 2) {
      return NextResponse.json({ error: "A valid row number is required." }, { status: 400 });
    }
    if (!messageBody && !smsBody) {
      return NextResponse.json({ error: "messageBody or smsBody is required." }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    const businessId = await resolveBusinessId(supabase);
    const id = await rowNumberToId(supabase, "campaigns", businessId, row);
    if (!id) return NextResponse.json({ error: `Row ${row} not found.` }, { status: 404 });

    const { data: current, error: readError } = await supabase
      .from("campaigns")
      .select("status")
      .eq("id", id)
      .eq("business_id", businessId)
      .single();
    if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });
    const status = current?.status ?? "Draft";
    if (!["Draft", "Error"].includes(status)) {
      return NextResponse.json({ error: `Row ${row} can't be edited from status "${status}".` }, { status: 400 });
    }

    const update: Record<string, unknown> = { subject: subject ?? "", message_body: messageBody ?? "" };
    if (smsBody !== undefined) update.sms_body = smsBody;
    if (audience !== undefined) update.audience = audience;
    const { error } = await supabase.from("campaigns").update(update).eq("id", id).eq("business_id", businessId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof SupabaseNotConfiguredError) {
      return NextResponse.json({ error: err.message, notConfigured: true }, { status: 503 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 400 });
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
    const id = await rowNumberToId(supabase, "campaigns", businessId, row);
    if (!id) return NextResponse.json({ ok: true });
    // Never delete rows — "remove" blanks the campaign out of the list instead.
    const { error } = await supabase
      .from("campaigns")
      .update({ campaign_name: "" })
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
