import "server-only";
import {
  findEmailByFullName,
  getCampaignDraft,
  markCampaignQueued,
  updateCampaignContent,
} from "@/lib/googleSheetsServer";
import { kindFromCampaignNotes } from "@/lib/notifyGrok";

export class MissingEmailError extends Error {
  constructor() {
    super("This contact has no email on file — can't send.");
    this.name = "MissingEmailError";
  }
}

/**
 * Saves the draft, then marks the Campaigns row Queued.
 * Win-back and trial rows are retargeted to a single contact first.
 * The caller notifies Grok only after this resolves.
 */
export async function prepareCampaignSend(input: {
  row: number;
  subject?: string;
  messageBody?: string;
}): Promise<{ notes: string; kind: "winback" | "trial" | "campaign" }> {
  const draft = await getCampaignDraft(input.row);
  if (!draft.campaignName.trim()) {
    throw new Error(`Row ${input.row} is empty.`);
  }

  const status = draft.status || "Draft";
  if (status === "Sent" || status === "Sending") {
    throw new Error(`Row ${input.row} can't be queued from status "${status}".`);
  }
  if (status !== "Draft" && status !== "Error" && status !== "Queued") {
    throw new Error(`Row ${input.row} can't be queued from status "${status}".`);
  }

  const kind = kindFromCampaignNotes(draft.notes);
  let audience: string | undefined;
  if (kind === "winback" || kind === "trial") {
    const prefix = kind === "winback" ? "winback:" : "trial:";
    const name = draft.notes.slice(prefix.length).trim();
    const email = await findEmailByFullName(name);
    if (!email) throw new MissingEmailError();
    audience = `Contact: ${name} <${email}>`;
  }

  const messageBody = input.messageBody ?? draft.messageBody;
  const subject = input.subject ?? draft.subject;
  if (!messageBody.trim()) {
    throw new Error("Message is required.");
  }

  // Already-queued rows are a re-notify: don't rewrite the draft, but do
  // fill in a missing single-contact audience before Grok looks again.
  if (status === "Draft" || status === "Error") {
    await updateCampaignContent(input.row, { subject, messageBody });
  }

  await markCampaignQueued(input.row, audience);
  return { notes: draft.notes, kind };
}
