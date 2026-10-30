import "server-only";
import { playbookPromptBlock, readPlaybook, readRecentExamples, type Playbook, type DraftExample } from "@/lib/playbook";

export const DRAFT_MODEL = "gpt-6-luna";

export class AiNotConfiguredError extends Error {
  constructor() {
    super("AI drafting isn't configured yet — set OPENAI_API_KEY on Vercel.");
    this.name = "AiNotConfiguredError";
  }
}

export async function loadGenerationContext(): Promise<{ playbook: Playbook; examples: DraftExample[]; trialUrl: string; block: string }> {
  let playbook: Playbook = { tone: "", offers: "", prices: "", faqs: "", trialLink: "" };
  let examples: DraftExample[] = [];
  try {
    playbook = await readPlaybook();
    examples = await readRecentExamples(5);
  } catch {
    // Sheets can be unset in local dev; generation still runs on the campaign brief alone.
  }
  const trialUrl = process.env.TRIAL_BOOKING_URL?.trim() || playbook.trialLink.trim();
  return { playbook, examples, trialUrl, block: playbookPromptBlock(playbook, examples, trialUrl) };
}

export async function draftWithClaude(input: { system: string; user: string; maxTokens?: number }): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new AiNotConfiguredError();
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model: DRAFT_MODEL,
    max_completion_tokens: input.maxTokens ?? 700,
    messages: [
      { role: "system", content: input.system },
      { role: "user", content: input.user },
    ],
  });
  return (completion.choices[0]?.message?.content ?? "").trim();
}

export function parseSubjectBody(text: string): { subject: string; body: string } {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text) as { subject?: string; body?: string };
    return { subject: (parsed.subject ?? "").trim(), body: (parsed.body ?? "").trim() };
  } catch {
    return { subject: "", body: text.trim() };
  }
}

export function ensureTrialLink(body: string, trialUrl: string): string {
  if (!trialUrl || body.includes(trialUrl)) return body.trim();
  return `${body.trim()}\n\nBook a trial: ${trialUrl}`;
}

const STEP_BRIEF: Record<number, string> = {
  1: "Day 1 welcome. Introduce the gym and invite them to book a trial.",
  2: "Day 3 nudge. They have not replied. Mention the current offer.",
  3: "Day 7. Gently answer a likely hesitation using the FAQs.",
  4: "Day 14 last check-in. Short, no pressure, one clear next step.",
};

export async function generateLeadEmail(input: { fullName: string; step: number | "no-show" }): Promise<{ subject: string; body: string }> {
  const context = await loadGenerationContext();
  const first = input.fullName.trim().split(/\s+/)[0] || "there";
  const brief =
    input.step === "no-show"
      ? "They booked a trial class and did not show up. Be kind, invite them to rebook, and do not scold them."
      : STEP_BRIEF[input.step] ?? STEP_BRIEF[1];

  const text = await draftWithClaude({
    system: [
      "You write short follow-up emails for Lyfe Boxing, a boxing gym.",
      "Use the literal placeholder {First name} for the recipient. Never invent a different name.",
      "3-5 short sentences. Warm, not salesy.",
      context.trialUrl ? `Include this exact trial booking link in the body: ${context.trialUrl}` : "If you do not have a booking link, do not invent one.",
      'Respond with strict JSON only: {"subject": "...", "body": "..."}. No markdown.',
      context.block,
    ]
      .filter(Boolean)
      .join("\n"),
    user: `Write the email for ${first}.\n\n${brief}`,
  });
  const parsed = parseSubjectBody(text);
  return { subject: parsed.subject, body: ensureTrialLink(parsed.body, context.trialUrl) };
}
