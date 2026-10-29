import "server-only";
import { google } from "googleapis";

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
const CLIENT_EMAIL = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, "\n");

export class SheetsNotConfiguredError extends Error {
  constructor() {
    super(
      "Google Sheets credentials aren't configured. Set GOOGLE_SHEETS_SPREADSHEET_ID, GOOGLE_SHEETS_CLIENT_EMAIL, and GOOGLE_SHEETS_PRIVATE_KEY."
    );
    this.name = "SheetsNotConfiguredError";
  }
}

function getSheetsClient() {
  if (!SPREADSHEET_ID || !CLIENT_EMAIL || !PRIVATE_KEY) {
    throw new SheetsNotConfiguredError();
  }
  const auth = new google.auth.JWT({
    email: CLIENT_EMAIL,
    key: PRIVATE_KEY,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

export type CampaignRow = {
  row: number;
  campaignName: string;
  channel: string;
  audience: string;
  subject: string;
  messageBody: string;
  send: boolean;
  status: string;
  recipients: string;
  sentAt: string;
  notes: string;
};

const CAMPAIGNS_RANGE = "Campaigns!A2:J1000";

export async function listCampaigns(): Promise<CampaignRow[]> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: CAMPAIGNS_RANGE,
  });
  const rows = res.data.values ?? [];
  return rows
    .map((r, i) => ({
      row: i + 2,
      campaignName: r[0] ?? "",
      channel: r[1] ?? "",
      audience: r[2] ?? "",
      subject: r[3] ?? "",
      messageBody: r[4] ?? "",
      send: (r[5] ?? "").toString().toUpperCase() === "TRUE",
      status: r[6] ?? "Draft",
      recipients: r[7] ?? "",
      sentAt: r[8] ?? "",
      notes: r[9] ?? "",
    }))
    .filter((c) => c.campaignName.trim() !== "");
}

export async function appendCampaign(input: {
  campaignName: string;
  channel: string;
  audience: string;
  subject: string;
  messageBody: string;
  notes?: string;
}): Promise<void> {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: "Campaigns!A:J",
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [
        [
          input.campaignName,
          input.channel,
          input.audience,
          input.subject,
          input.messageBody,
          "FALSE",
          "Draft",
          "",
          "",
          input.notes ?? "",
        ],
      ],
    },
  });
}

export type CampaignDraft = {
  campaignName: string;
  audience: string;
  subject: string;
  messageBody: string;
  status: string;
  notes: string;
};

/** Reads one Campaigns row (columns A–J). Does not change column order. */
export async function getCampaignDraft(row: number): Promise<CampaignDraft> {
  const sheets = getSheetsClient();
  const current = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `Campaigns!A${row}:J${row}`,
  });
  const r = current.data.values?.[0] ?? [];
  return {
    campaignName: (r[0] ?? "").toString(),
    audience: (r[2] ?? "").toString(),
    subject: (r[3] ?? "").toString(),
    messageBody: (r[4] ?? "").toString(),
    status: (r[6] ?? "").toString() || "Draft",
    notes: (r[9] ?? "").toString(),
  };
}

/**
 * Marks a campaign ready for Grok: Send (col F) TRUE, Status (col G) Queued.
 * When `audience` is set, also writes Audience (col C) so a win-back or trial
 * draft targets one person. Safe to call again on a row that is already Queued.
 */
export async function markCampaignQueued(row: number, audience?: string): Promise<void> {
  const sheets = getSheetsClient();
  const data: { range: string; values: string[][] }[] = [
    { range: `Campaigns!F${row}:G${row}`, values: [["TRUE", "Queued"]] },
  ];
  if (audience !== undefined) {
    data.push({ range: `Campaigns!C${row}`, values: [[audience]] });
  }
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { valueInputOption: "RAW", data },
  });
}

function cell(row: Record<string, string>, header: string): string {
  const key = Object.keys(row).find((k) => k.toLowerCase() === header.toLowerCase());
  return key ? (row[key] ?? "").trim() : "";
}

/**
 * Email for one person. Cancelled "Email" (column H on that tab) wins;
 * otherwise the Contacts tab. Blank when neither sheet has an address.
 */
export async function findEmailByFullName(fullName: string): Promise<string> {
  const target = fullName.trim().toLowerCase();
  if (!target) return "";

  let cancelledEmail = "";
  try {
    const cancelled = await readTabRows("Cancelled (Oct)");
    for (const row of cancelled) {
      if (cell(row, "Name").toLowerCase() !== target) continue;
      cancelledEmail = cell(row, "Email");
      if (cancelledEmail) return cancelledEmail;
    }
  } catch (err) {
    if (!(err instanceof SheetTabMissingError)) throw err;
  }

  try {
    const contacts = await readTabRows("Contacts");
    for (const row of contacts) {
      if (cell(row, "Name").toLowerCase() !== target) continue;
      const email = cell(row, "Email");
      if (email) return email;
    }
  } catch (err) {
    if (!(err instanceof SheetTabMissingError)) throw err;
  }

  return "";
}

export async function updateCampaignContent(row: number, input: { subject: string; messageBody: string }): Promise<void> {
  const sheets = getSheetsClient();

  const current = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `Campaigns!G${row}`,
  });
  const status = current.data.values?.[0]?.[0] ?? "Draft";
  if (!["Draft", "Error"].includes(status)) {
    throw new Error(`Row ${row} can't be edited from status "${status}".`);
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `Campaigns!D${row}:E${row}`,
    valueInputOption: "RAW",
    requestBody: { values: [[input.subject, input.messageBody]] },
  });
}

/** Thrown when a tab genuinely doesn't exist yet (vs. a general API error). */
export class SheetTabMissingError extends Error {
  constructor(public tabName: string) {
    super(`The "${tabName}" tab doesn't exist in the sheet yet.`);
    this.name = "SheetTabMissingError";
  }
}

function isMissingTabError(err: unknown, tabName: string): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return message.includes("Unable to parse range") || message.includes(`${tabName}'!`) || message.includes(tabName);
}

/**
 * Generic header-based tab reader: row 1 is treated as column names, and
 * each data row comes back as {header: value}. Used for the read-only
 * reference pages (Memberships, Summary, Cancelled, Past Due, Payments,
 * SMS Conversations, Contacts) so this app never bakes real member data
 * into source files — it's always read live from the sheet.
 */
export async function readTabRows(tabName: string): Promise<(Record<string, string> & { _row: number })[]> {
  const sheets = getSheetsClient();
  let res;
  try {
    res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${tabName}!A1:ZZ`,
    });
  } catch (err) {
    if (isMissingTabError(err, tabName)) throw new SheetTabMissingError(tabName);
    throw err;
  }

  const rows = res.data.values ?? [];
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => (h ?? "").toString().trim());
  return rows.slice(1).map((row, i) => {
    const obj = { _row: i + 2 } as Record<string, string> & { _row: number };
    headers.forEach((h, idx) => {
      if (h) obj[h] = (row[idx] ?? "").toString();
    });
    return obj;
  });
}

/** Raw rows, no header assumption — used for the Summary tab (key/value pairs, not a table). */
export async function readRawRows(tabName: string): Promise<string[][]> {
  const sheets = getSheetsClient();
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${tabName}!A1:ZZ`,
    });
    return (res.data.values ?? []).map((r) => r.map((c) => (c ?? "").toString()));
  } catch (err) {
    if (isMissingTabError(err, tabName)) throw new SheetTabMissingError(tabName);
    throw err;
  }
}

function columnLetter(index: number): string {
  let n = index;
  let letter = "";
  do {
    letter = String.fromCharCode(65 + (n % 26)) + letter;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return letter;
}

/**
 * Writes specific columns (matched by header name) on an existing row of
 * any tab. Used for editable per-contact drafts that live directly on a
 * reference tab (e.g. Past Due's Email Subject / Email Body / Email Status
 * columns) rather than in the Campaigns tab.
 */
export async function updateTabRowCells(
  tabName: string,
  rowNumber: number,
  values: Record<string, string>
): Promise<void> {
  const sheets = getSheetsClient();
  let headerRes;
  try {
    headerRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${tabName}!A1:ZZ1`,
    });
  } catch (err) {
    if (isMissingTabError(err, tabName)) throw new SheetTabMissingError(tabName);
    throw err;
  }
  const headers = (headerRes.data.values?.[0] ?? []).map((h) => (h ?? "").toString().trim());

  const data = Object.entries(values)
    .map(([header, value]) => {
      const colIndex = headers.findIndex((h) => h.toLowerCase() === header.toLowerCase());
      if (colIndex === -1) return null;
      return { range: `${tabName}!${columnLetter(colIndex)}${rowNumber}`, values: [[value]] };
    })
    .filter((d): d is { range: string; values: string[][] } => d !== null);

  if (data.length === 0) return;

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { valueInputOption: "RAW", data },
  });
}

export async function appendAppointmentRequest(input: {
  date: string;
  time: string;
  type: string;
  member: string;
  coach?: string;
}): Promise<void> {
  const sheets = getSheetsClient();
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "Appointments!A:F",
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [[input.date, input.time, input.type, input.member, input.coach ?? "", "Requested"]],
      },
    });
  } catch (err) {
    if (isMissingTabError(err, "Appointments")) throw new SheetTabMissingError("Appointments");
    throw err;
  }
}
