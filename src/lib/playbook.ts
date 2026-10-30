import "server-only";
import { appendTabRow, ensureHeaders, ensureTab, readTabRows, updateTabRowCells } from "@/lib/googleSheetsServer";

export type Playbook = {
  tone: string;
  offers: string;
  prices: string;
  faqs: string;
  trialLink: string;
};

export type DraftExample = {
  lead: string;
  step: string;
  original: string;
  final: string;
  date: string;
};

const PLAYBOOK_TAB = "Playbook";
const EXAMPLES_TAB = "Examples";
const PLAYBOOK_HEADERS = ["Key", "Value"];
const EXAMPLE_HEADERS = ["Lead", "Step", "Original", "Final", "Date"];

const PLAYBOOK_KEYS: { field: keyof Playbook; key: string; fallback: string }[] = [
  { field: "tone", key: "Tone", fallback: "Warm, encouraging, and plain-spoken. Never pushy." },
  { field: "offers", key: "Offers", fallback: "" },
  { field: "prices", key: "Prices", fallback: "" },
  { field: "faqs", key: "FAQs", fallback: "" },
  { field: "trialLink", key: "Trial link", fallback: "" },
];

export function emptyPlaybook(): Playbook {
  return { tone: "", offers: "", prices: "", faqs: "", trialLink: "" };
}

export async function readPlaybook(): Promise<Playbook> {
  await ensureTab(PLAYBOOK_TAB, PLAYBOOK_HEADERS);
  const rows = await readTabRows(PLAYBOOK_TAB);
  if (rows.length === 0) {
    await seedPlaybook();
    return emptyPlaybookFromSeed();
  }
  const playbook = emptyPlaybook();
  for (const item of PLAYBOOK_KEYS) {
    const row = rows.find((entry) => (entry.Key ?? entry.key ?? "").trim().toLowerCase() === item.key.toLowerCase());
    playbook[item.field] = (row?.Value ?? row?.value ?? "").trim();
  }
  return playbook;
}

function emptyPlaybookFromSeed(): Playbook {
  const playbook = emptyPlaybook();
  for (const item of PLAYBOOK_KEYS) playbook[item.field] = item.fallback;
  return playbook;
}

async function seedPlaybook(): Promise<void> {
  for (const item of PLAYBOOK_KEYS) {
    await appendTabRow(PLAYBOOK_TAB, PLAYBOOK_HEADERS, { Key: item.key, Value: item.fallback });
  }
}

export async function writePlaybook(values: Playbook): Promise<void> {
  await ensureTab(PLAYBOOK_TAB, PLAYBOOK_HEADERS);
  const rows = await readTabRows(PLAYBOOK_TAB);
  for (const item of PLAYBOOK_KEYS) {
    const existing = rows.find((entry) => (entry.Key ?? "").trim().toLowerCase() === item.key.toLowerCase());
    if (existing) {
      await updateTabRowCells(PLAYBOOK_TAB, existing._row, { Value: values[item.field] ?? "" });
    } else {
      await appendTabRow(PLAYBOOK_TAB, PLAYBOOK_HEADERS, { Key: item.key, Value: values[item.field] ?? "" });
    }
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
    await ensureTab(EXAMPLES_TAB, EXAMPLE_HEADERS);
  } catch {
    return [];
  }
  const rows = await readTabRows(EXAMPLES_TAB);
  return rows
    .map((row) => ({
      lead: row.Lead ?? "",
      step: row.Step ?? "",
      original: row.Original ?? "",
      final: row.Final ?? "",
      date: row.Date ?? "",
    }))
    .filter((row) => row.original || row.final)
    .slice(-limit);
}

export async function appendExample(example: DraftExample): Promise<void> {
  await ensureTab(EXAMPLES_TAB, EXAMPLE_HEADERS);
  await appendTabRow(EXAMPLES_TAB, EXAMPLE_HEADERS, {
    Lead: example.lead,
    Step: example.step,
    Original: example.original,
    Final: example.final,
    Date: example.date,
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

const LEAD_EXTRA_HEADERS = ["AI Original", "Example Logged", "Draft Step"];

export async function ensureLeadDraftColumns(): Promise<void> {
  await ensureHeaders("Leads", LEAD_EXTRA_HEADERS);
}
