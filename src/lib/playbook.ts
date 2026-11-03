import "server-only";
import { getSupabaseClient, resolveBusinessId } from "@/lib/supabaseServer";

export type Playbook = {
  tone: string;
  offers: string;
  prices: string;
  faqs: string;
  trialLink: string;
  bookingLink: string;
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
  return { tone: "", offers: "", prices: "", faqs: "", trialLink: "", bookingLink: "" };
}

/** Reads the business's playbook from Supabase, seeding a default row if none exists yet. */
export async function readPlaybook(): Promise<Playbook> {
  const supabase = getSupabaseClient();
  const businessId = await resolveBusinessId(supabase);

  const { data, error } = await supabase
    .from("playbook")
    .select("tone, offers, prices, faqs, trial_link, booking_link")
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
    },
    { onConflict: "business_id" }
  );
  if (error) throw error;
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
