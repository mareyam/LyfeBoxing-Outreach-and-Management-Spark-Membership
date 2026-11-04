import "server-only";
import { getSupabaseClient, resolveBusinessId } from "@/lib/supabaseServer";
// NOTE: the row-by-row Sheets-based Leads UI (src/app/api/leads/{draft,generate,send,send-bulk})
// and the old /api/cron/lead-sequence route have not been migrated in this pass — see the PR
// description for the full inventory. They still touch the "Leads" Google Sheet tab directly,
// not through this file, via src/lib/leadFollowup.ts + googleSheetsServer.ts.
import { ensureHeaders } from "@/lib/googleSheetsServer";

export type Playbook = {
  tone: string;
  offers: string;
  prices: string;
  faqs: string;
  trialLink: string;
  bookingLink: string;
  bookingCalendarUrl: string;
};

export type DraftExample = {
  lead: string;
  step: string;
  original: string;
  final: string;
  date: string;
};

const FALLBACK_TONE = "Warm, encouraging, and plain-spoken. Never pushy.";

export function emptyPlaybook(): Playbook {
  return { tone: "", offers: "", prices: "", faqs: "", trialLink: "", bookingLink: "", bookingCalendarUrl: "" };
}

/** Reads the business's playbook from Supabase, seeding a default row if none exists yet. */
export async function readPlaybook(): Promise<Playbook> {
  const supabase = getSupabaseClient();
  const businessId = await resolveBusinessId(supabase);

  const { data, error } = await supabase
    .from("playbook")
    .select("tone, offers, prices, faqs, trial_link, booking_link, booking_calendar_url")
    .eq("business_id", businessId)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    const seeded = { ...emptyPlaybook(), tone: FALLBACK_TONE };
    await supabase.from("playbook").insert({
      business_id: businessId,
      tone: seeded.tone,
      offers: seeded.offers,
      prices: seeded.prices,
      faqs: seeded.faqs,
      trial_link: seeded.trialLink,
      booking_link: seeded.bookingLink,
      booking_calendar_url: seeded.bookingCalendarUrl,
    });
    return seeded;
  }

  return {
    tone: data.tone ?? "",
    offers: data.offers ?? "",
    prices: data.prices ?? "",
    faqs: data.faqs ?? "",
    trialLink: data.trial_link ?? "",
    bookingLink: data.booking_link ?? "",
    bookingCalendarUrl: data.booking_calendar_url ?? "",
  };
}

export async function writePlaybook(values: Playbook): Promise<void> {
  const supabase = getSupabaseClient();
  const businessId = await resolveBusinessId(supabase);
  const { error } = await supabase.from("playbook").upsert(
    {
      business_id: businessId,
      tone: values.tone,
      offers: values.offers,
      prices: values.prices,
      faqs: values.faqs,
      trial_link: values.trialLink,
      booking_link: values.bookingLink,
      booking_calendar_url: values.bookingCalendarUrl,
    },
    { onConflict: "business_id" }
  );
  if (error) throw error;
}

/** Used by "Send calendar link" buttons on Replies and interested leads. */
export async function resolveBookingCalendarUrl(): Promise<string> {
  try {
    const playbook = await readPlaybook();
    return playbook.bookingCalendarUrl.trim();
  } catch {
    return "";
  }
}

export async function resolveTrialBookingUrl(): Promise<string> {
  const fromEnv = process.env.TRIAL_BOOKING_URL?.trim();
  if (fromEnv) return fromEnv;
  try {
    const playbook = await readPlaybook();
    return playbook.trialLink.trim();
  } catch {
    return "";
  }
}

export async function readRecentExamples(limit = 5): Promise<DraftExample[]> {
  try {
    const supabase = getSupabaseClient();
    const businessId = await resolveBusinessId(supabase);
    const { data, error } = await supabase
      .from("examples")
      .select("lead, step, original, final, example_date")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data
      .map((row) => ({
        lead: row.lead ?? "",
        step: row.step ?? "",
        original: row.original ?? "",
        final: row.final ?? "",
        date: row.example_date ?? "",
      }))
      .filter((row) => row.original || row.final)
      .reverse();
  } catch {
    return [];
  }
}

export async function appendExample(example: DraftExample): Promise<void> {
  const supabase = getSupabaseClient();
  const businessId = await resolveBusinessId(supabase);
  await supabase.from("examples").insert({
    business_id: businessId,
    lead: example.lead,
    step: example.step,
    original: example.original,
    final: example.final,
    example_date: example.date,
  });
}

const LEAD_EXTRA_HEADERS = ["AI Original", "Example Logged", "Draft Step"];

/** Used only by the legacy Sheets-backed lead routes (see note above). */
export async function ensureLeadDraftColumns(): Promise<void> {
  await ensureHeaders("Leads", LEAD_EXTRA_HEADERS);
}

export function playbookPromptBlock(playbook: Playbook, examples: DraftExample[], trialUrl: string): string {
  const lines = [
    "Gym playbook (follow this voice and these facts):",
    playbook.tone ? `Tone: ${playbook.tone}` : "",
    playbook.offers ? `Offers: ${playbook.offers}` : "",
    playbook.prices ? `Prices: ${playbook.prices}` : "",
    playbook.faqs ? `FAQs: ${playbook.faqs}` : "",
    trialUrl ? `Trial booking link (include this exact URL in every email): ${trialUrl}` : "",
    playbook.bookingLink ? `Booking link — include this as a clear call to action in every email: ${playbook.bookingLink}` : "",
  ].filter(Boolean);

  if (examples.length > 0) {
    lines.push("", "Recent edits by the team. Prefer the final version's voice over the original:");
    for (const example of examples) {
      lines.push(
        `Example (step ${example.step || "?"}, ${example.lead || "a lead"}):`,
        `Original:\n${example.original}`,
        `Final:\n${example.final}`
      );
    }
  }
  return lines.join("\n");
}
