import "server-only";
import { getSupabaseClient, resolveBusinessId } from "@/lib/supabaseServer";
import { notifyGrokNurture } from "@/lib/notifyGrok";

export type NurtureStep = {
  id: string;
  businessId: string;
  stepNo: number;
  delayDays: number;
  subject: string;
  body: string;
  active: boolean;
};

export type NurtureEnrollment = {
  id: string;
  businessId: string;
  leadId: string;
  currentStep: number;
  nextSendAt: string | null;
  status: "active" | "paused" | "stopped_unsubscribed" | "stopped_interested" | "completed";
  enrolledAt: string;
  lead: { fullName: string | null; email: string | null; optedOut: boolean } | null;
};

function toStep(row: Record<string, unknown>): NurtureStep {
  return {
    id: row.id as string,
    businessId: row.business_id as string,
    stepNo: row.step_no as number,
    delayDays: row.delay_days as number,
    subject: (row.subject as string) ?? "",
    body: (row.body as string) ?? "",
    active: Boolean(row.active),
  };
}

export async function listNurtureSteps(): Promise<NurtureStep[]> {
  const supabase = getSupabaseClient();
  const businessId = await resolveBusinessId(supabase);
  const { data, error } = await supabase
    .from("nurture_steps")
    .select("*")
    .eq("business_id", businessId)
    .order("step_no", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(toStep);
}

export async function createNurtureStep(input: {
  stepNo: number;
  delayDays: number;
  subject: string;
  body: string;
}): Promise<NurtureStep> {
  const supabase = getSupabaseClient();
  const businessId = await resolveBusinessId(supabase);
  const { data, error } = await supabase
    .from("nurture_steps")
    .insert({
      business_id: businessId,
      step_no: input.stepNo,
      delay_days: input.delayDays,
      subject: input.subject,
      body: input.body,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return toStep(data);
}

export async function updateNurtureStep(
  id: string,
  input: Partial<{ stepNo: number; delayDays: number; subject: string; body: string; active: boolean }>
): Promise<NurtureStep> {
  const supabase = getSupabaseClient();
  const patch: Record<string, unknown> = {};
  if (input.stepNo !== undefined) patch.step_no = input.stepNo;
  if (input.delayDays !== undefined) patch.delay_days = input.delayDays;
  if (input.subject !== undefined) patch.subject = input.subject;
  if (input.body !== undefined) patch.body = input.body;
  if (input.active !== undefined) patch.active = input.active;
  const { data, error } = await supabase.from("nurture_steps").update(patch).eq("id", id).select("*").single();
  if (error) throw new Error(error.message);
  return toStep(data);
}

/** Reorders steps by assigning new step_no values. Never deletes a step. */
export async function reorderNurtureSteps(order: { id: string; stepNo: number }[]): Promise<void> {
  const supabase = getSupabaseClient();
  for (const { id, stepNo } of order) {
    const { error } = await supabase.from("nurture_steps").update({ step_no: stepNo }).eq("id", id);
    if (error) throw new Error(error.message);
  }
}

export async function listNurtureEnrollments(): Promise<NurtureEnrollment[]> {
  const supabase = getSupabaseClient();
  const businessId = await resolveBusinessId(supabase);
  const { data, error } = await supabase
    .from("nurture_enrollments")
    .select("*, leads(full_name, email, opted_out)")
    .eq("business_id", businessId)
    .order("enrolled_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    businessId: row.business_id as string,
    leadId: row.lead_id as string,
    currentStep: row.current_step as number,
    nextSendAt: (row.next_send_at as string) ?? null,
    status: row.status as NurtureEnrollment["status"],
    enrolledAt: row.enrolled_at as string,
    lead: row.leads
      ? {
          fullName: (row.leads as Record<string, unknown>).full_name as string | null,
          email: (row.leads as Record<string, unknown>).email as string | null,
          optedOut: Boolean((row.leads as Record<string, unknown>).opted_out),
        }
      : null,
  }));
}

export async function setEnrollmentStatus(
  id: string,
  status: "active" | "paused" | "completed"
): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("nurture_enrollments").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}

/** Resuming recomputes next_send_at from now, so a paused lead doesn't get a flood of overdue sends. */
export async function resumeEnrollment(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { data: enrollment, error: fetchError } = await supabase
    .from("nurture_enrollments")
    .select("business_id, current_step")
    .eq("id", id)
    .single();
  if (fetchError || !enrollment) throw new Error(fetchError?.message ?? "Enrollment not found.");

  const { data: nextStep } = await supabase
    .from("nurture_steps")
    .select("delay_days")
    .eq("business_id", enrollment.business_id)
    .eq("step_no", enrollment.current_step + 1)
    .eq("active", true)
    .maybeSingle();

  const nextSendAt = nextStep
    ? new Date(Date.now() + (nextStep.delay_days as number) * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const { error } = await supabase
    .from("nurture_enrollments")
    .update({ status: "active", next_send_at: nextSendAt })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Enrolls every lead that doesn't already have a nurture_enrollments row.
 * Leads are unique by (name, email) already; deduping on lead_id here means
 * no lead is ever enrolled twice. Step 1 is scheduled after its delay_days,
 * since Spark already sends the welcome email itself.
 */
export async function autoEnrollNewLeads(): Promise<number> {
  const supabase = getSupabaseClient();
  const businessId = await resolveBusinessId(supabase);

  const { data: firstStep } = await supabase
    .from("nurture_steps")
    .select("delay_days")
    .eq("business_id", businessId)
    .eq("step_no", 1)
    .eq("active", true)
    .maybeSingle();
  if (!firstStep) return 0; // No active step 1 configured yet — nothing to enroll into.

  const { data: leads, error: leadsError } = await supabase
    .from("leads")
    .select("id, opted_out")
    .eq("business_id", businessId);
  if (leadsError || !leads) return 0;

  const { data: existing } = await supabase
    .from("nurture_enrollments")
    .select("lead_id")
    .eq("business_id", businessId);
  const enrolledLeadIds = new Set((existing ?? []).map((row) => row.lead_id as string));

  const toEnroll = leads.filter((lead) => !lead.opted_out && !enrolledLeadIds.has(lead.id as string));
  if (toEnroll.length === 0) return 0;

  const nextSendAt = new Date(Date.now() + (firstStep.delay_days as number) * 24 * 60 * 60 * 1000).toISOString();
  const rows = toEnroll.map((lead) => ({
    business_id: businessId,
    lead_id: lead.id,
    current_step: 0,
    next_send_at: nextSendAt,
    status: "active" as const,
  }));

  const { error } = await supabase.from("nurture_enrollments").upsert(rows, { onConflict: "lead_id", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
  return rows.length;
}

export type MarkSentInput = {
  leadId: string;
  stepNo: number;
  to: string;
  subject: string;
  body: string;
};

/**
 * Called from POST /api/grok/sent once Grok confirms a nurture email actually
 * went out. Logs it, advances current_step to stepNo, and schedules the next
 * active step (or marks the enrollment completed if there isn't one).
 */
export async function markNurtureStepSent(input: MarkSentInput): Promise<void> {
  const supabase = getSupabaseClient();
  const businessId = await resolveBusinessId(supabase);

  const { error: logError } = await supabase.from("email_log").insert({
    business_id: businessId,
    lead_id: input.leadId,
    source: "nurture",
    to_email: input.to,
    subject: input.subject,
    body: input.body,
  });
  if (logError) throw new Error(logError.message);

  const { data: nextStep } = await supabase
    .from("nurture_steps")
    .select("delay_days")
    .eq("business_id", businessId)
    .eq("step_no", input.stepNo + 1)
    .eq("active", true)
    .maybeSingle();

  if (nextStep) {
    const nextSendAt = new Date(Date.now() + (nextStep.delay_days as number) * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase
      .from("nurture_enrollments")
      .update({ current_step: input.stepNo, next_send_at: nextSendAt })
      .eq("lead_id", input.leadId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("nurture_enrollments")
      .update({ current_step: input.stepNo, status: "completed", next_send_at: null })
      .eq("lead_id", input.leadId);
    if (error) throw new Error(error.message);
  }
}

export type NurtureCronSummary = { enrolled: number; sent: number; skipped: number; errors: number };

/**
 * Finds active, due enrollments and queues their next step through the Grok
 * webhook. Never sends directly, never advances current_step itself — that
 * happens only once Grok confirms via POST /api/grok/sent.
 */
export async function runNurtureCron(): Promise<NurtureCronSummary> {
  const supabase = getSupabaseClient();
  const businessId = await resolveBusinessId(supabase);
  const summary: NurtureCronSummary = { enrolled: 0, sent: 0, skipped: 0, errors: 0 };

  summary.enrolled = await autoEnrollNewLeads();

  const { data: due, error } = await supabase
    .from("nurture_enrollments")
    .select("id, lead_id, current_step, leads(full_name, email, opted_out)")
    .eq("business_id", businessId)
    .eq("status", "active")
    .lte("next_send_at", new Date().toISOString());
  if (error || !due) {
    summary.errors += 1;
    return summary;
  }

  for (const enrollment of due) {
    const lead = enrollment.leads as unknown as { full_name: string | null; email: string | null; opted_out: boolean } | null;
    if (!lead?.email || lead.opted_out) {
      summary.skipped += 1;
      continue;
    }

    const stepNo = (enrollment.current_step as number) + 1;
    const { data: step } = await supabase
      .from("nurture_steps")
      .select("subject, body")
      .eq("business_id", businessId)
      .eq("step_no", stepNo)
      .eq("active", true)
      .maybeSingle();

    if (!step) {
      // No more active steps configured — the sequence is done for this lead.
      await supabase.from("nurture_enrollments").update({ status: "completed" }).eq("id", enrollment.id);
      summary.skipped += 1;
      continue;
    }

    const firstName = (lead.full_name ?? "").trim().split(/\s+/)[0] || "there";
    const subject = step.subject.replaceAll("{first_name}", firstName);
    const body = step.body.replaceAll("{first_name}", firstName);

    try {
      await notifyGrokNurture({
        businessId,
        leadId: enrollment.lead_id as string,
        to: lead.email,
        firstName,
        subject,
        body,
        stepNo,
      });
      summary.sent += 1;
    } catch {
      summary.errors += 1;
    }
  }

  return summary;
}
