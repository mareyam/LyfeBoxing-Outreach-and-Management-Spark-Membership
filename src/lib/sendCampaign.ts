import "server-only";
import { getSupabaseClient, resolveBusinessId } from "@/lib/supabaseServer";
import { rowNumberToId } from "@/lib/supabaseRowOrder";
import { kindFromCampaignNotes } from "@/lib/notifyGrok";

export class MissingEmailError extends Error {
  constructor() {
    super("This contact has no email on file — can't send.");
    this.name = "MissingEmailError";
  }
}

/** Email for one person: Cancelled wins, otherwise Contacts. Blank when neither has an address. */
async function findEmailByFullName(supabase: ReturnType<typeof getSupabaseClient>, businessId: string, fullName: string): Promise<string> {
  const target = fullName.trim();
  if (!target) return "";

  const { data: cancelled } = await supabase
    .from("cancelled_memberships")
    .select("email")
    .eq("business_id", businessId)
    .ilike("name", target)
    .limit(1);
  const cancelledEmail = cancelled?.[0]?.email?.trim();
  if (cancelledEmail) return cancelledEmail;

  const { data: contacts } = await supabase
    .from("contacts")
    .select("email")
    .eq("business_id", businessId)
    .ilike("full_name", target)
    .limit(1);
  return contacts?.[0]?.email?.trim() ?? "";
}

/**
 * Saves the draft, then marks the Campaigns row Queued.
 * Win-back and trial rows are retargeted to a single contact first.
 * The caller notifies Grok only after this resolves.
 */
export async function prepareCampaignSend(input: {
  row: number;
  subject?: string;
  messageBody?: string;
  smsBody?: string;
  audience?: string;
}): Promise<{ notes: string; kind: "winback" | "trial" | "campaign"; channel: string; smsBody: string }> {
  const supabase = getSupabaseClient();
  const businessId = await resolveBusinessId(supabase);
  const id = await rowNumberToId(supabase, "campaigns", businessId, input.row);
  if (!id) throw new Error(`Row ${input.row} is empty.`);

  const { data: campaign, error } = await supabase
    .from("campaigns")
    .select("campaign_name, channel, subject, message_body, sms_body, status, notes")
    .eq("id", id)
    .eq("business_id", businessId)
    .single();
  if (error || !campaign) throw new Error(`Row ${input.row} is empty.`);
  if (!campaign.campaign_name?.trim()) {
    throw new Error(`Row ${input.row} is empty.`);
  }

  const status = campaign.status || "Draft";
  if (status === "Sent" || status === "Sending") {
    throw new Error(`Row ${input.row} can't be queued from status "${status}".`);
  }
  if (status !== "Draft" && status !== "Error" && status !== "Queued") {
    throw new Error(`Row ${input.row} can't be queued from status "${status}".`);
  }

  const notes = campaign.notes ?? "";
  const kind = kindFromCampaignNotes(notes);
  let audience: string | undefined = input.audience;
  if (kind === "winback" || kind === "trial") {
    const prefix = kind === "winback" ? "winback:" : "trial:";
    const name = notes.slice(prefix.length).trim();
    const email = await findEmailByFullName(supabase, businessId, name);
    if (!email) throw new MissingEmailError();
    audience = `Contact: ${name} <${email}>`;
  }

  const messageBody = input.messageBody ?? campaign.message_body ?? "";
  const subject = input.subject ?? campaign.subject ?? "";
  const smsBody = input.smsBody ?? campaign.sms_body ?? "";
  const channel = campaign.channel ?? "";
  const needsEmail = channel !== "SMS";
  const needsSms = channel === "SMS" || channel === "Both";
  if (needsEmail && !messageBody.trim()) {
    throw new Error("Message is required.");
  }
  if (needsSms && !smsBody.trim()) {
    throw new Error("SMS text is required.");
  }

  const update: Record<string, unknown> = { send: true, status: "Queued" };
  if (audience !== undefined) update.audience = audience;
  // Already-queued rows are a re-notify: don't rewrite the draft, but do
  // fill in a missing single-contact audience before Grok looks again.
  if (status === "Draft" || status === "Error") {
    update.subject = subject;
    update.message_body = messageBody;
    update.sms_body = smsBody;
    if (input.audience !== undefined) update.audience = input.audience;
  }

  const { error: updateError } = await supabase.from("campaigns").update(update).eq("id", id).eq("business_id", businessId);
  if (updateError) throw new Error(updateError.message);

  return { notes, kind, channel, smsBody };
}
