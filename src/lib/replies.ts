import "server-only";
import { getSupabaseClient, resolveBusinessId } from "@/lib/supabaseServer";

export type ReplyCategory = "interested" | "positive" | "not_interested" | "unsubscribe" | "question" | "other";

export type LeadReply = {
  id: string;
  leadId: string;
  receivedAt: string;
  fromEmail: string | null;
  subject: string;
  snippet: string;
  fullText: string;
  category: ReplyCategory;
  handled: boolean;
  lead: { fullName: string | null; email: string | null; optedOut: boolean; interested: boolean } | null;
};

function toReply(row: Record<string, unknown>): LeadReply {
  return {
    id: row.id as string,
    leadId: row.lead_id as string,
    receivedAt: row.received_at as string,
    fromEmail: (row.from_email as string) ?? null,
    subject: (row.subject as string) ?? "",
    snippet: (row.snippet as string) ?? "",
    fullText: (row.full_text as string) ?? "",
    category: row.category as ReplyCategory,
    handled: Boolean(row.handled),
    lead: row.leads
      ? {
          fullName: (row.leads as Record<string, unknown>).full_name as string | null,
          email: (row.leads as Record<string, unknown>).email as string | null,
          optedOut: Boolean((row.leads as Record<string, unknown>).opted_out),
          interested: Boolean((row.leads as Record<string, unknown>).interested),
        }
      : null,
  };
}

export async function listReplies(): Promise<LeadReply[]> {
  const supabase = getSupabaseClient();
  const businessId = await resolveBusinessId(supabase);
  const { data, error } = await supabase
    .from("lead_replies")
    .select("*, leads(full_name, email, opted_out, interested)")
    .eq("business_id", businessId)
    .order("received_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(toReply);
}

/**
 * Applies the category rules a reply triggers. unsubscribe stops the
 * sequence and flags the lead opted out (the lead stays visible everywhere,
 * never deleted). interested/positive stops the sequence and flags the lead
 * interested so it surfaces for a "Send calendar link".
 */
async function applyCategoryRules(leadId: string, category: ReplyCategory): Promise<void> {
  const supabase = getSupabaseClient();

  if (category === "unsubscribe") {
    await supabase.from("leads").update({ opted_out: true }).eq("id", leadId);
    await supabase.from("nurture_enrollments").update({ status: "stopped_unsubscribed" }).eq("lead_id", leadId);
  } else if (category === "interested" || category === "positive") {
    await supabase.from("leads").update({ interested: true }).eq("id", leadId);
    await supabase.from("nurture_enrollments").update({ status: "stopped_interested" }).eq("lead_id", leadId);
  }
}

export type CreateReplyInput = {
  leadId: string;
  fromEmail: string;
  subject: string;
  snippet: string;
  fullText: string;
  category: ReplyCategory;
};

/** Called from POST /api/grok/reply when Grok reports an inbound reply. */
export async function createReply(input: CreateReplyInput): Promise<LeadReply> {
  const supabase = getSupabaseClient();
  const businessId = await resolveBusinessId(supabase);

  const { data, error } = await supabase
    .from("lead_replies")
    .insert({
      business_id: businessId,
      lead_id: input.leadId,
      from_email: input.fromEmail,
      subject: input.subject,
      snippet: input.snippet,
      full_text: input.fullText,
      category: input.category,
    })
    .select("*, leads(full_name, email, opted_out, interested)")
    .single();
  if (error) throw new Error(error.message);

  await applyCategoryRules(input.leadId, input.category);
  return toReply(data);
}

/** Manual re-categorize from the Replies page. Re-applies the new category's rules. */
export async function recategorizeReply(id: string, category: ReplyCategory): Promise<LeadReply> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("lead_replies")
    .update({ category })
    .eq("id", id)
    .select("*, leads(full_name, email, opted_out, interested)")
    .single();
  if (error) throw new Error(error.message);

  await applyCategoryRules(data.lead_id as string, category);
  return toReply(data);
}

export async function setReplyHandled(id: string, handled: boolean): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("lead_replies").update({ handled }).eq("id", id);
  if (error) throw new Error(error.message);
}
