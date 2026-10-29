import { google } from "googleapis";

export const LYFE_BOXING_SHEET_ID = "1luN1MBLROSXxb4UtBNPO4Z_vOhf64pl6meBnTF2BDr8";

export class SheetsNotConfiguredError extends Error {
  constructor() {
    super("Google service account credentials are not set up yet.");
    this.name = "SheetsNotConfiguredError";
  }
}

function getCredentials() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !key) return null;
  return { email, key: key.replace(/\\n/g, "\n") };
}

export function sheetsConfigured() {
  return getCredentials() !== null;
}

async function getClient() {
  const creds = getCredentials();
  if (!creds) throw new SheetsNotConfiguredError();

  const auth = new google.auth.JWT({
    email: creds.email,
    key: creds.key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

/** A tab's rows as plain objects keyed by its header row (row 1). */
export type SheetRow = Record<string, string> & { _rowNumber: number };

export async function readTab(tabName: string): Promise<SheetRow[]> {
  const sheets = await getClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: LYFE_BOXING_SHEET_ID,
    range: `${tabName}!A1:ZZ`,
  });
  const rows = res.data.values ?? [];
  if (rows.length === 0) return [];

  const headers = rows[0].map((h) => (h ?? "").toString().trim());
  return rows.slice(1).map((row, i) => {
    const obj: SheetRow = { _rowNumber: i + 2 } as SheetRow;
    headers.forEach((h, idx) => {
      if (h) obj[h] = (row[idx] ?? "").toString();
    });
    return obj;
  });
}

/** Appends a row given as {header: value}. Missing headers are left blank. */
export async function appendRow(tabName: string, values: Record<string, string>): Promise<void> {
  const sheets = await getClient();
  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId: LYFE_BOXING_SHEET_ID,
    range: `${tabName}!A1:ZZ1`,
  });
  const headers = (headerRes.data.values?.[0] ?? []).map((h) => (h ?? "").toString().trim());
  const row = headers.map((h) => values[h] ?? "");

  await sheets.spreadsheets.values.append({
    spreadsheetId: LYFE_BOXING_SHEET_ID,
    range: `${tabName}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });
}

/** Updates specific columns on an existing row (1-indexed sheet row number). */
export async function updateRowCells(
  tabName: string,
  rowNumber: number,
  values: Record<string, string>
): Promise<void> {
  const sheets = await getClient();
  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId: LYFE_BOXING_SHEET_ID,
    range: `${tabName}!A1:ZZ1`,
  });
  const headers = (headerRes.data.values?.[0] ?? []).map((h) => (h ?? "").toString().trim());

  const data = Object.entries(values).map(([header, value]) => {
    const colIndex = headers.indexOf(header);
    if (colIndex === -1) return null;
    const colLetter = columnLetter(colIndex);
    return { range: `${tabName}!${colLetter}${rowNumber}`, values: [[value]] };
  }).filter((d): d is { range: string; values: string[][] } => d !== null);

  if (data.length === 0) return;

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: LYFE_BOXING_SHEET_ID,
    requestBody: { valueInputOption: "USER_ENTERED", data },
  });
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

/** Checks whether a tab exists (used for Attendance/Appointments empty states). */
export async function tabExists(tabName: string): Promise<boolean> {
  try {
    const sheets = await getClient();
    const meta = await sheets.spreadsheets.get({ spreadsheetId: LYFE_BOXING_SHEET_ID });
    return (meta.data.sheets ?? []).some((s) => s.properties?.title === tabName);
  } catch {
    return false;
  }
}
