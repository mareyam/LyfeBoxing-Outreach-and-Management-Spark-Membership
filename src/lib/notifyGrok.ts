import "server-only";

export class GrokNotConfiguredError extends Error {
  constructor() {
    super("Grok webhook isn't configured. Set GROK_WEBHOOK_URL and GROK_WEBHOOK_AUTH.");
    this.name = "GrokNotConfiguredError";
  }
}

/** Campaign rows tag their Notes column so sends can be told apart: "winback:<name>", "trial:<name>", or untagged for an ordinary bulk campaign. */
export function kindFromCampaignNotes(notes: string): "winback" | "trial" | "campaign" {
  if (notes.startsWith("winback:")) return "winback";
  if (notes.startsWith("trial:")) return "trial";
  return "campaign";
}

type NotifyGrokPayload =
  | { tab: string; row: number; kind: string }
  | { tab: string; rows: number[]; kind: string };

/**
 * Tells Grok a row (or rows) is ready to send. Grok is the only thing that
 * ever actually sends email/SMS — this just flips the sheet row to
 * "Queued" (done by the caller beforehand) and pings Grok to go look.
 * Retries once after 5s on a network/HTTP error; if that also fails, the
 * row stays "Queued" and the caller surfaces the error to the UI.
 */
export async function notifyGrok(payload: NotifyGrokPayload): Promise<void> {
  const url = process.env.GROK_WEBHOOK_URL;
  const auth = process.env.GROK_WEBHOOK_AUTH;
  if (!url || !auth) throw new GrokNotConfiguredError();

  const body = JSON.stringify({ ...payload, site: "lyfe-boxing", queuedAt: new Date().toISOString() });

  async function attempt(): Promise<void> {
    const res = await fetch(url as string, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: auth as string },
      body,
    });
    if (!res.ok) throw new Error(`Grok webhook responded ${res.status}`);
  }

  try {
    await attempt();
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    try {
      await attempt();
    } catch {
      throw new Error("Couldn't reach Grok — the row is still Queued, try sending again in a bit.");
    }
  }
}
