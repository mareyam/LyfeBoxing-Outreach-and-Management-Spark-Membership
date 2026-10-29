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

export async function queueCampaignSend(row: number): Promise<void> {
  const sheets = getSheetsClient();

  const current = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `Campaigns!F${row}:G${row}`,
  });
  const [sendVal, statusVal] = current.data.values?.[0] ?? ["FALSE", "Draft"];
  if ((sendVal ?? "").toString().toUpperCase() === "TRUE" || !["Draft", "Error"].includes(statusVal ?? "Draft")) {
    throw new Error(`Row ${row} can't be queued from status "${statusVal}".`);
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `Campaigns!F${row}:G${row}`,
    valueInputOption: "RAW",
    requestBody: { values: [["TRUE", "Queued"]] },
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
