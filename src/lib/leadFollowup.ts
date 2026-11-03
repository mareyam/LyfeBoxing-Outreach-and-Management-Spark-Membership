import "server-only";
import { appendExample, ensureLeadDraftColumns, readPlaybook } from "@/lib/playbook";
import { readTabRows, updateTabRowCells } from "@/lib/googleSheetsServer";
import { notifyGrok } from "@/lib/notifyGrok";
import { generateLeadEmail } from "@/lib/generateDraft";
import {
  LEAD_TIME_ZONE,
  advanceSequence,
  decodeEmailDraft,
  draftsDiffer,
  encodeEmailDraft,
  formatSheetDate,
  isDueForSequence,
  isNoShow,
  normalizeStep,
  todayInTimeZone,
} from "@/lib/leadSequence";

const TAB = "Leads";
const AI_BATCH = 20;

type LeadRow = Record<string, string> & { _row: number };

export type SequenceRun = {
  drafted: number;
  noShows: number;
  queued: number;
  skipped: number;
  errors: number;
};

function cell(row: LeadRow, header: string): string {
  const key = Object.keys(row).find((item) => item.toLowerCase() === header.toLowerCase());
  return key ? (row[key] ?? "").trim() : "";
}

function autoSendStep1(): boolean {
  const flag = process.env.AUTO_SEND_STEP1?.trim().toLowerCase();
  return flag === "true" || flag === "1";
}

export async function recordExampleIfEdited(input: {
  row: number;
  lead: string;
  step: string;
  original: string;
  finalText: string;
  alreadyLogged: string;
}): Promise<void> {
  if (!draftsDiffer(input.original, input.finalText)) return;
  if (input.alreadyLogged.toLowerCase() === "yes") return;
  await appendExample({
    lead: input.lead,
    step: input.step || "?",
    original: input.original,
    final: input.finalText,
    date: formatSheetDate(todayInTimeZone(LEAD_TIME_ZONE)),
  });
  await updateTabRowCells(TAB, input.row, { "Example Logged": "yes" });
}

async function writeGeneratedDraft(row: LeadRow, draft: { subject: string; body: string }, stepLabel: string, status: "Draft" | "Queued"): Promise<void> {
  const encoded = encodeEmailDraft(draft.subject, draft.body);
  await updateTabRowCells(TAB, row._row, {
    "Email Draft": encoded,
    "Email Status": status,
    "AI Original": encoded,
    "Example Logged": "",
    "Draft Step": stepLabel,
  });
}

export async function runLeadSequence(): Promise<SequenceRun> {
  await ensureLeadDraftColumns();
  const rows = (await readTabRows(TAB)) as LeadRow[];
  const today = todayInTimeZone(LEAD_TIME_ZONE);
  const summary: SequenceRun = { drafted: 0, noShows: 0, queued: 0, skipped: 0, errors: 0 };
  const queuedRows: number[] = [];
  let aiCalls = 0;

  // Touch the playbook so a missing tab is created before the first draft.
  await readPlaybook().catch(() => undefined);

  for (const row of rows) {
    const stage = cell(row, "Stage");
    const classDate = cell(row, "Class Date");
    const status = cell(row, "Status");
    if (!isNoShow({ stage, classDate, status, today })) continue;
    if (aiCalls >= AI_BATCH) {
      summary.skipped += 1;
      continue;
    }
    try {
      const draft = await generateLeadEmail({ fullName: cell(row, "Full Name"), step: "no-show" });
      await writeGeneratedDraft(row, draft, "no-show", "Draft");
      await updateTabRowCells(TAB, row._row, { Stage: "No-show" });
      aiCalls += 1;
      summary.noShows += 1;
    } catch {
      console.error(`[lead-sequence] no-show row ${row._row} failed`);
      summary.errors += 1;
    }
  }

  for (const row of rows) {
    const stage = cell(row, "Stage");
    const nextFollowUp = cell(row, "Next Follow-up Date");
    const sequenceStep = cell(row, "Sequence Step");
    if (!isDueForSequence({ stage, nextFollowUp, sequenceStep, today })) continue;
    if (aiCalls >= AI_BATCH) {
      summary.skipped += 1;
      continue;
    }
    const step = normalizeStep(sequenceStep);
    const queueStep1 = step === 1 && autoSendStep1();
    try {
      const draft = await generateLeadEmail({ fullName: cell(row, "Full Name"), step });
      await writeGeneratedDraft(row, draft, String(step), queueStep1 ? "Queued" : "Draft");
      const advanced = advanceSequence(step, today);
      await updateTabRowCells(TAB, row._row, {
        "Sequence Step": String(advanced.step),
        "Next Follow-up Date": advanced.nextDate,
      });
      aiCalls += 1;
      summary.drafted += 1;
      if (queueStep1) {
        queuedRows.push(row._row);
        summary.queued += 1;
      }
    } catch {
      console.error(`[lead-sequence] step row ${row._row} failed`);
      summary.errors += 1;
    }
  }

  if (queuedRows.length > 0) {
    try {
      await notifyGrok({ tab: TAB, rows: queuedRows, kind: "lead" });
    } catch {
      console.error(`[lead-sequence] queued ${queuedRows.length} step-1 drafts but Grok was not notified`);
      summary.errors += 1;
    }
  }

  console.log(
    `[lead-sequence] drafted=${summary.drafted} noShows=${summary.noShows} queued=${summary.queued} skipped=${summary.skipped} errors=${summary.errors}`
  );
  return summary;
}

export function leadEmail(row: LeadRow): string {
  return cell(row, "Email");
}

export async function getLeadRow(rowNumber: number): Promise<LeadRow | null> {
  const rows = (await readTabRows(TAB)) as LeadRow[];
  return rows.find((row) => row._row === rowNumber) ?? null;
}

export async function saveLeadDraft(input: {
  row: number;
  subject: string;
  messageBody: string;
  status: "Draft" | "Queued";
}): Promise<{ name: string; step: string; original: string; logged: string; email: string; emailStatus: string }> {
  await ensureLeadDraftColumns();
  const lead = await getLeadRow(input.row);
  if (!lead || !cell(lead, "Full Name")) {
    throw new Error(`Row ${input.row} is not a lead.`);
  }
  const encoded = encodeEmailDraft(input.subject, input.messageBody);
  const currentStatus = cell(lead, "Email Status");
  if (input.status === "Queued" && (currentStatus === "Sent" || currentStatus === "Sending")) {
    throw new Error(`Row ${input.row} can't be queued from status "${currentStatus}".`);
  }
  await updateTabRowCells(TAB, input.row, {
    "Email Draft": encoded,
    "Email Status": input.status,
  });
  const fields = leadDraftFields(lead);
  await recordExampleIfEdited({
    row: input.row,
    lead: fields.name,
    step: fields.step,
    original: fields.original,
    finalText: encoded,
    alreadyLogged: fields.logged,
  });
  return { ...fields, email: cell(lead, "Email"), emailStatus: currentStatus };
}

export async function generateAndStoreLeadDraft(rowNumber: number): Promise<{ subject: string; body: string }> {
  await ensureLeadDraftColumns();
  const lead = await getLeadRow(rowNumber);
  if (!lead) throw new Error(`Row ${rowNumber} is not a lead.`);
  const currentStatus = cell(lead, "Email Status");
  if (currentStatus === "Queued" || currentStatus === "Sent" || currentStatus === "Sending") {
    throw new Error(`This lead is ${currentStatus}, so it can't be regenerated right now.`);
  }
  const stage = cell(lead, "Stage");
  const step = stage.trim().toLowerCase() === "no-show" ? "no-show" : Math.min(normalizeStep(cell(lead, "Sequence Step")), 4);
  const draft = await generateLeadEmail({ fullName: cell(lead, "Full Name"), step });
  await writeGeneratedDraft(lead, draft, step === "no-show" ? "no-show" : String(step), "Draft");
  return draft;
}

export function leadDraftFields(row: LeadRow): { subject: string; body: string; original: string; step: string; logged: string; name: string } {
  const decoded = decodeEmailDraft(cell(row, "Email Draft"));
  return {
    subject: decoded.subject,
    body: decoded.body,
    original: cell(row, "AI Original"),
    step: cell(row, "Draft Step"),
    logged: cell(row, "Example Logged"),
    name: cell(row, "Full Name"),
  };
}
