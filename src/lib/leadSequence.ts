/** Day 1 / 3 / 7 / 14 of a lead follow-up, stored as sequence steps 1–4. */
export const SEQUENCE_STEPS = [
  { step: 1, day: 1 },
  { step: 2, day: 3 },
  { step: 3, day: 7 },
  { step: 4, day: 14 },
] as const;

export const LEAD_TIME_ZONE = "America/New_York";

const SKIPPED_STAGES = new Set(["replied", "trial booked", "joined", "lost", "no-show", "no show"]);

export function normStage(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function parseSheetDate(value: string): Date | null {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return null;
  const slash = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (slash) {
    let year = Number(slash[3]);
    if (year < 100) year += 2000;
    return new Date(year, Number(slash[1]) - 1, Number(slash[2]));
  }
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  return null;
}

export function formatSheetDate(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + days);
  return next;
}

export function todayInTimeZone(timeZone: string, now = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  return new Date(year, month - 1, day);
}

/** Blank or non-numeric steps start at 1. Steps above 4 mean the sequence is finished. */
export function normalizeStep(raw: string): number {
  const match = (raw ?? "").match(/\d+/);
  const step = match ? Number(match[0]) : 1;
  if (!Number.isFinite(step) || step < 1) return 1;
  return step;
}

export function isSequenceStage(stage: string): boolean {
  const key = normStage(stage);
  return key === "new" || key === "contacted";
}

export function isSkippedStage(stage: string): boolean {
  return SKIPPED_STAGES.has(normStage(stage));
}

export function isDueForSequence(input: {
  stage: string;
  nextFollowUp: string;
  sequenceStep: string;
  today: Date;
}): boolean {
  if (!isSequenceStage(input.stage)) return false;
  if (normalizeStep(input.sequenceStep) > 4) return false;
  const due = parseSheetDate(input.nextFollowUp);
  if (!due) return false;
  return due.getTime() <= input.today.getTime();
}

/** Trial Booked, class already happened, and they have not joined. */
export function isNoShow(input: { stage: string; classDate: string; status: string; today: Date }): boolean {
  if (normStage(input.stage) !== "trial booked") return false;
  if (normStage(input.status) === "joined" || normStage(input.stage) === "joined") return false;
  const classDate = parseSheetDate(input.classDate);
  if (!classDate) return false;
  return classDate.getTime() < input.today.getTime();
}

/** After the draft for `currentStep` is written, move to the next step date. */
export function advanceSequence(currentStep: number, today: Date): { step: number; nextDate: string } {
  const step = Math.min(Math.max(currentStep, 1), 4);
  if (step >= 4) return { step: 5, nextDate: "" };
  const current = SEQUENCE_STEPS.find((item) => item.step === step)!;
  const next = SEQUENCE_STEPS.find((item) => item.step === step + 1)!;
  return { step: next.step, nextDate: formatSheetDate(addDays(today, next.day - current.day)) };
}

export function encodeEmailDraft(subject: string, body: string): string {
  return `Subject: ${subject.trim()}\n\n${body.trim()}`;
}

export function decodeEmailDraft(raw: string): { subject: string; body: string } {
  const text = raw ?? "";
  const match = text.match(/^Subject:\s*(.*)\r?\n\r?\n([\s\S]*)$/);
  if (!match) return { subject: "", body: text.trim() };
  return { subject: match[1].trim(), body: match[2].trim() };
}

export function draftsDiffer(original: string, finalText: string): boolean {
  const left = original.replace(/\s+/g, " ").trim();
  const right = finalText.replace(/\s+/g, " ").trim();
  return left.length > 0 && left !== right;
}

/** What the Supabase-backed cron needs to know about a lead to decide its next action. */
export type LeadFollowupInput = {
  stage: string;
  status: string;
  nextFollowupDate: string | null; // ISO date (date column), e.g. "2026-11-05"
  sequenceStep: string;
  emailUnsubscribed: boolean;
  hasBookedAppointment: boolean;
  hasPastAppointmentUnattended: boolean; // an appointment whose scheduled_at has passed and is not "attended"
};

export type LeadFollowupDecision =
  | { action: "none"; reason: string }
  | { action: "skip"; reason: string }
  | { action: "needs_reply" }
  | { action: "no_show_followup" }
  | { action: "sequence_step"; step: number };

/** Pure decision logic for the daily lead-followup cron. Never sends anything by itself. */
export function decideLeadFollowup(input: LeadFollowupInput, today: Date): LeadFollowupDecision {
  if (input.emailUnsubscribed) return { action: "skip", reason: "unsubscribed" };
  if (normStage(input.stage) === "replied") return { action: "needs_reply" };
  if (normStage(input.stage) === "joined" || normStage(input.status) === "joined") {
    return { action: "skip", reason: "joined" };
  }
  if (input.hasBookedAppointment) return { action: "skip", reason: "appointment booked" };

  if (input.hasPastAppointmentUnattended) return { action: "no_show_followup" };

  const step = normalizeStep(input.sequenceStep);
  if (step > 4) return { action: "skip", reason: "sequence finished" };
  if (!isSequenceStage(input.stage)) return { action: "skip", reason: `stage "${input.stage}" is not sequenced` };

  const due = input.nextFollowupDate ? parseSheetDate(input.nextFollowupDate) : null;
  if (!due) return { action: "none", reason: "no next follow-up date set" };
  if (due.getTime() > today.getTime()) return { action: "none", reason: "not due yet" };
  return { action: "sequence_step", step };
}

/** An appointment is a no-show once its scheduled time has passed and it was never marked attended/cancelled. */
export function isAppointmentNoShow(input: { scheduledAt: string | Date; status: string; now: Date }): boolean {
  const status = input.status.trim().toLowerCase();
  if (status === "attended" || status === "cancelled" || status === "no_show") return false;
  const scheduled = input.scheduledAt instanceof Date ? input.scheduledAt : new Date(input.scheduledAt);
  if (Number.isNaN(scheduled.getTime())) return false;
  return scheduled.getTime() < input.now.getTime();
}
