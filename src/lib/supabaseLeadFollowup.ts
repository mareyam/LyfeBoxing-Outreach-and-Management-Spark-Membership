import "server-only";
import { getSupabaseClient, resolveBusinessId } from "@/lib/supabaseServer";
import { generateLeadEmail } from "@/lib/generateDraft";
import {
  LEAD_TIME_ZONE,
  advanceSequence,
  decideLeadFollowup,
  isAppointmentNoShow,
  normalizeStep,
  todayInTimeZone,
} from "@/lib/leadSequence";

export type FollowupRun = {
  drafted: number;
  noShowDrafted: number;
  needsReply: number;
  skipped: number;
  errors: number;
  appointmentsFlaggedNoShow: number;
};

type LeadRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  stage: string | null;
  status: string | null;
  next_followup_date: string | null;
  sequence_step: string | null;
};

/**
 * Flags any booked appointment whose scheduled_at has passed and that was never
 * marked attended/cancelled as "no_show". This is a status update only — it never
 * deletes anything — and makes the lead eligible for the no-show follow-up draft
 * on this same run (decideLeadFollowup checks hasPastAppointmentUnattended).
 */
export async function flagNoShowAppointments(businessId: string): Promise<number> {
  const supabase = getSupabaseClient();
  const now = new Date();
  const { data, error } = await supabase
    .from("appointments")
    .select("id, scheduled_at, status")
    .eq("business_id", businessId)
    .eq("status", "booked");
  if (error || !data) return 0;

  let flagged = 0;
  for (const appt of data) {
    if (isAppointmentNoShow({ scheduledAt: appt.scheduled_at, status: appt.status, now })) {
      const { error: updateError } = await supabase
        .from("appointments")
        .update({ status: "no_show" })
        .eq("id", appt.id);
      if (!updateError) flagged += 1;
    }
  }
  return flagged;
}

/**
 * The daily cron job. For every lead without a booked appointment, decides whether a
 * follow-up draft is due (day 1/3/7/14, or a no-show follow-up), and — if no lead_drafts
 * row exists yet for that step — generates one and inserts it with status "draft".
 * HARD RULE: this never sends anything. Every row this writes is a draft; a human has
 * to click "Approve & Send" (see /api/leads/drafts/[id]/send) to send one email.
 */
export async function runLeadFollowups(): Promise<FollowupRun> {
  const supabase = getSupabaseClient();
  const businessId = await resolveBusinessId(supabase);
  const today = todayInTimeZone(LEAD_TIME_ZONE);

  const summary: FollowupRun = {
    drafted: 0,
    noShowDrafted: 0,
    needsReply: 0,
    skipped: 0,
    errors: 0,
    appointmentsFlaggedNoShow: 0,
  };

  summary.appointmentsFlaggedNoShow = await flagNoShowAppointments(businessId);

  const { data: leads, error: leadsError } = await supabase
    .from("leads")
    .select("id, full_name, email, stage, status, next_followup_date, sequence_step")
    .eq("business_id", businessId);
  if (leadsError || !leads) {
    summary.errors += 1;
    return summary;
  }

  const { data: unsubRows } = await supabase
    .from("email_unsubscribes")
    .select("email")
    .eq("business_id", businessId);
  const unsubscribed = new Set((unsubRows ?? []).map((r) => (r.email ?? "").toLowerCase()).filter(Boolean));

  const { data: apptRows } = await supabase
    .from("appointments")
    .select("lead_id, status")
    .eq("business_id", businessId)
    .in("status", ["booked", "no_show"]);
  const bookedLeadIds = new Set((apptRows ?? []).filter((a) => a.status === "booked").map((a) => a.lead_id));
  const noShowLeadIds = new Set((apptRows ?? []).filter((a) => a.status === "no_show").map((a) => a.lead_id));

  for (const lead of leads as LeadRow[]) {
    const decision = decideLeadFollowup(
      {
        stage: lead.stage ?? "",
        status: lead.status ?? "",
        nextFollowupDate: lead.next_followup_date,
        sequenceStep: lead.sequence_step ?? "1",
        emailUnsubscribed: unsubscribed.has((lead.email ?? "").toLowerCase()),
        hasBookedAppointment: bookedLeadIds.has(lead.id),
        hasPastAppointmentUnattended: noShowLeadIds.has(lead.id),
      },
      today
    );

    try {
      if (decision.action === "needs_reply") {
        await supabase.from("leads").update({ status: "needs_reply" }).eq("id", lead.id);
        summary.needsReply += 1;
        continue;
      }
      if (decision.action === "skip" || decision.action === "none") {
        summary.skipped += 1;
        continue;
      }

      const step = decision.action === "no_show_followup" ? "no-show" : String(decision.step);

      const { data: existingDraft } = await supabase
        .from("lead_drafts")
        .select("id")
        .eq("lead_id", lead.id)
        .eq("step", step)
        .maybeSingle();
      if (existingDraft) {
        summary.skipped += 1;
        continue;
      }

      const draft = await generateLeadEmail({
        fullName: lead.full_name ?? "",
        step: decision.action === "no_show_followup" ? "no-show" : decision.step,
      });

      const { error: insertError } = await supabase.from("lead_drafts").insert({
        business_id: businessId,
        lead_id: lead.id,
        step,
        subject: draft.subject,
        body: draft.body,
        ai_original: `${draft.subject}\n\n${draft.body}`,
        status: "draft",
      });
      if (insertError) {
        // A concurrent run may have inserted the same (lead_id, step) row first; that's fine.
        if (insertError.code !== "23505") summary.errors += 1;
        continue;
      }

      if (decision.action === "no_show_followup") {
        summary.noShowDrafted += 1;
      } else {
        summary.drafted += 1;
        const advanced = advanceSequence(normalizeStep(lead.sequence_step ?? "1"), today);
        await supabase
          .from("leads")
          .update({ sequence_step: String(advanced.step) })
          .eq("id", lead.id);
      }
    } catch {
      summary.errors += 1;
    }
  }

  return summary;
}
