import "server-only";

export class WebhookNotConfiguredError extends Error {
  constructor() {
    super("Webhook not configured");
    this.name = "WebhookNotConfiguredError";
  }
}

/** Campaign rows tag their Notes column so sends can be told apart: "winback:<name>", "trial:<name>", or untagged for an ordinary bulk campaign. */
export function kindFromCampaignNotes(notes: string): "winback" | "trial" | "campaign" {
  if (notes.startsWith("winback:")) return "winback";
  if (notes.startsWith("trial:")) return "trial";
  return "campaign";
}

export type NotifyGrokInput = {
  tab: string;
  rows: number[];
  kind: string;
  /** Campaigns only: so Grok knows whether/what to send over SMS without re-reading the row first. */
  channel?: string;
  smsBody?: string;
  /** Campaign Sequences: the single row and action Grok expects, alongside the usual rows/kind fields. */
  row?: number;
  action?: string;
};

function readEnv(name: string): string | undefined {
  // Bracket access so the bundler cannot inline a build-time value (or
  // `undefined` from a build that ran before the var existed).
  const value = process.env[name];
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function isRetryableStatus(status: number): boolean {
  return status >= 500 && status <= 599;
}

/**
 * Tells Grok which sheet rows were just set to Status "Queued".
 * Grok is the only thing that sends email/SMS. This POST is awaited
 * (it is not fired off and abandoned when the function returns), retried
 * once on a network error or a 5xx, and logs only the HTTP status.
 */
export async function notifyGrok({ tab, rows, kind, channel, smsBody, row, action }: NotifyGrokInput): Promise<void> {
  const url = readEnv("GROK_WEBHOOK_URL");
  const auth = readEnv("GROK_WEBHOOK_AUTH");
  if (!url || !auth) {
    console.error("[notifyGrok] Webhook not configured");
    throw new WebhookNotConfiguredError();
  }

  const body = JSON.stringify({
    tab,
    rows,
    kind,
    site: "lyfe-boxing",
    queuedAt: new Date().toISOString(),
    ...(channel !== undefined ? { channel } : {}),
    ...(smsBody !== undefined ? { smsBody } : {}),
    ...(row !== undefined ? { row } : {}),
    ...(action !== undefined ? { action } : {}),
  });

  async function post(): Promise<Response> {
    return fetch(url as string, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth}`,
      },
      body,
      cache: "no-store",
    });
  }

  let res: Response;
  try {
    res = await post();
  } catch {
    console.error(`[notifyGrok] network error tab=${tab} kind=${kind} rows=${rows.length}, retrying once`);
    try {
      res = await post();
    } catch {
      console.error(`[notifyGrok] network error on retry tab=${tab} kind=${kind} rows=${rows.length}`);
      throw new Error("Couldn't reach the webhook.");
    }
  }

  if (isRetryableStatus(res.status)) {
    console.error(`[notifyGrok] status ${res.status} tab=${tab} kind=${kind} rows=${rows.length}, retrying once`);
    try {
      res = await post();
    } catch {
      console.error(`[notifyGrok] network error on retry tab=${tab} kind=${kind} rows=${rows.length}`);
      throw new Error("Couldn't reach the webhook.");
    }
  }

  console.log(`[notifyGrok] status ${res.status} tab=${tab} kind=${kind} rows=${rows.length}`);
  if (!res.ok) {
    throw new Error(`Webhook responded ${res.status}`);
  }
}

/**
 * Posts an arbitrary JSON payload to the Grok webhook (bypassing the
 * sheet-row shape notifyGrok() expects), with the same
 * retry-once-on-network-error-or-5xx behavior. Used for nurture emails,
 * calendar links, appointment reminders, and the daily report — every
 * payload here must include business_id per the webhook contract.
 */
export async function notifyGrokPayload(payload: Record<string, unknown>, label: string): Promise<void> {
  const url = readEnv("GROK_WEBHOOK_URL");
  const auth = readEnv("GROK_WEBHOOK_AUTH");
  if (!url || !auth) {
    console.error(`[notifyGrok:${label}] Webhook not configured`);
    throw new WebhookNotConfiguredError();
  }

  const body = JSON.stringify({ ...payload, queuedAt: new Date().toISOString() });

  async function post(): Promise<Response> {
    return fetch(url as string, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth}`,
      },
      body,
      cache: "no-store",
    });
  }

  let res: Response;
  try {
    res = await post();
  } catch {
    console.error(`[notifyGrok:${label}] network error, retrying once`);
    try {
      res = await post();
    } catch {
      console.error(`[notifyGrok:${label}] network error on retry`);
      throw new Error("Couldn't reach the webhook.");
    }
  }

  if (isRetryableStatus(res.status)) {
    console.error(`[notifyGrok:${label}] status ${res.status}, retrying once`);
    try {
      res = await post();
    } catch {
      console.error(`[notifyGrok:${label}] network error on retry`);
      throw new Error("Couldn't reach the webhook.");
    }
  }

  console.log(`[notifyGrok:${label}] status ${res.status}`);
  if (!res.ok) {
    throw new Error(`Webhook responded ${res.status}`);
  }
}

export type NotifyGrokNurtureInput = {
  businessId: string;
  leadId: string;
  to: string;
  firstName: string;
  subject: string;
  body: string;
  stepNo: number;
};

/** Queues a nurture-sequence email through the Grok webhook. */
export async function notifyGrokNurture(input: NotifyGrokNurtureInput): Promise<void> {
  await notifyGrokPayload(
    {
      type: "nurture",
      business_id: input.businessId,
      lead_id: input.leadId,
      to: input.to,
      first_name: input.firstName,
      subject: input.subject,
      body: input.body,
      step_no: input.stepNo,
    },
    `nurture lead=${input.leadId} step=${input.stepNo}`
  );
}
