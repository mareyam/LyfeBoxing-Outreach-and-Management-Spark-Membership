/**
 * One-off reset for the two Spark test contacts. Run manually with:
 *   npx tsx scripts/reset-test-contacts.ts
 *
 * Deletes every row matching either test contact (by email or name) from
 * Cancelled (Oct), Past Due, Leads, All Memberships, and Campaigns, then
 * appends one fresh, clean row to each of the first four tabs (no drafts,
 * no Queued/Sent status). Idempotent: running it twice in a row leaves the
 * sheet in the same state. Prints every row it removes or adds. Never run
 * automatically — this is for manual use only.
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { google, sheets_v4 } from "googleapis";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvLocal();

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
const CLIENT_EMAIL = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!SPREADSHEET_ID || !CLIENT_EMAIL || !PRIVATE_KEY) {
  console.error(
    "Missing GOOGLE_SHEETS_SPREADSHEET_ID / GOOGLE_SHEETS_CLIENT_EMAIL / GOOGLE_SHEETS_PRIVATE_KEY (checked process.env and .env.local)."
  );
  process.exit(1);
}

const auth = new google.auth.JWT({
  email: CLIENT_EMAIL,
  key: PRIVATE_KEY,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const sheets = google.sheets({ version: "v4", auth });

const TEST_CONTACTS = [
  { name: "Maryam Test1", email: "maryamworkx@gmail.com", sparkId: "20055424" },
  { name: "Maryam Test2", email: "fa19bse069@gmail.com", sparkId: "20055427" },
];

function today(): string {
  return new Date().toLocaleDateString("en-US", { timeZone: "America/New_York" });
}

async function getSheetId(tabName: string): Promise<number | null> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID, fields: "sheets.properties" });
  const found = (meta.data.sheets ?? []).find((s) => s.properties?.title === tabName);
  return found?.properties?.sheetId ?? null;
}

async function readRows(tabName: string): Promise<{ headers: string[]; rows: (Record<string, string> & { _row: number })[] }> {
  let res;
  try {
    res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: `'${tabName}'!A1:ZZ` });
  } catch (err) {
    console.log(`  "${tabName}" tab not found or unreadable — skipping. (${(err as Error).message})`);
    return { headers: [], rows: [] };
  }
  const values = res.data.values ?? [];
  if (values.length === 0) return { headers: [], rows: [] };
  const headers = values[0].map((h) => (h ?? "").toString().trim());
  const rows = values.slice(1).map((row, i) => {
    const obj = { _row: i + 2 } as Record<string, string> & { _row: number };
    headers.forEach((h, idx) => {
      if (h) obj[h] = (row[idx] ?? "").toString();
    });
    return obj;
  });
  return { headers, rows };
}

function field(row: Record<string, string>, ...candidates: string[]): string {
  const keys = Object.keys(row);
  for (const candidate of candidates) {
    const exact = keys.find((k) => k.toLowerCase() === candidate.toLowerCase());
    if (exact) return row[exact] ?? "";
  }
  return "";
}

function matchesTestContact(row: Record<string, string>): boolean {
  const email = field(row, "email", "contact details", "contact").toLowerCase();
  const name = field(row, "name", "full name", "contact").toLowerCase();
  return TEST_CONTACTS.some(
    (c) => (email && email.includes(c.email.toLowerCase())) || (name && name === c.name.toLowerCase())
  );
}

/** Deletes rows (by 1-indexed sheet row number) from a tab, highest row first so indices don't shift. */
async function deleteRows(tabName: string, sheetId: number, rowNumbers: number[]): Promise<void> {
  if (rowNumbers.length === 0) return;
  const sorted = [...rowNumbers].sort((a, b) => b - a);
  const requests: sheets_v4.Schema$Request[] = sorted.map((rowNumber) => ({
    deleteDimension: {
      range: {
        sheetId,
        dimension: "ROWS",
        startIndex: rowNumber - 1,
        endIndex: rowNumber,
      },
    },
  }));
  await sheets.spreadsheets.batchUpdate({ spreadsheetId: SPREADSHEET_ID, requestBody: { requests } });
}

async function appendRow(tabName: string, headers: string[], values: Record<string, string>): Promise<void> {
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${tabName}'!A1`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [headers.map((h) => values[h] ?? "")] },
  });
}

async function resetTab(
  tabName: string,
  buildFreshRow: (contact: (typeof TEST_CONTACTS)[number], headers: string[]) => Record<string, string>
) {
  console.log(`\n${tabName}:`);
  const { headers, rows } = await readRows(tabName);
  if (headers.length === 0) return;

  const toDelete = rows.filter(matchesTestContact);
  if (toDelete.length > 0) {
    const sheetId = await getSheetId(tabName);
    if (sheetId == null) {
      console.log(`  Couldn't resolve sheetId for "${tabName}" — skipping delete.`);
    } else {
      await deleteRows(
        tabName,
        sheetId,
        toDelete.map((r) => r._row)
      );
      toDelete.forEach((r) => console.log(`  Deleted row ${r._row}: ${field(r, "name", "full name", "contact")}`));
    }
  } else {
    console.log("  No existing test rows found.");
  }

  for (const contact of TEST_CONTACTS) {
    const fresh = buildFreshRow(contact, headers);
    await appendRow(tabName, headers, fresh);
    console.log(`  Appended fresh row for ${contact.name}`);
  }
}

async function main() {
  console.log(`Resetting test contacts (${TEST_CONTACTS.map((c) => c.name).join(", ")})...`);

  await resetTab("Cancelled (Oct)", (contact) => ({
    Name: contact.name,
    Membership: "Test",
    "Signed Date": "",
    "Cancelled Date": today(),
    "Contact Type": "Former Member",
    Reason: "",
    "Quit Category": "",
    Email: contact.email,
  }));

  await resetTab("Past Due", (contact) => ({
    Due: "",
    Method: "",
    Contact: contact.name,
    "Contact Details": "",
    Description: "",
    Attempts: "",
    "Last Attempt": "",
    "Payment Amount": "1.00",
    "Total Overdue": "1.00",
    Email: contact.email,
    "Email Subject": "",
    "Email Body": "",
    "Email Status": "",
  }));

  await resetTab("Leads", (contact) => ({
    "Full Name": contact.name,
    Email: contact.email,
    Phone: "",
    Stage: "New",
    Source: "Test",
    "Created At": today(),
    "Next Follow-up Date": today(),
    "Sequence Step": "0",
    Status: "New",
    "Email Draft": "",
    "Email Status": "",
    "Last Contacted": "",
    "AI Original": "",
    "Example Logged": "",
    "Draft Step": "",
    Notes: `Spark ID ${contact.sparkId}`,
  }));

  await resetTab("All Memberships", (contact) => ({
    Name: contact.name,
    Membership: "Ignite Pro | Adult Boxing | 3-Class Trial for $19.95",
  }));

  // Campaigns: only delete any leftover personal test rows (Audience mentions a
  // test contact) — this tab doesn't get a fresh row appended.
  console.log("\nCampaigns:");
  const { headers: campaignHeaders, rows: campaignRows } = await readRows("Campaigns");
  if (campaignHeaders.length > 0) {
    const toDelete = campaignRows.filter((r) => {
      const audience = field(r, "audience").toLowerCase();
      const notes = field(r, "notes").toLowerCase();
      return TEST_CONTACTS.some(
        (c) => audience.includes(c.email.toLowerCase()) || audience.includes(c.name.toLowerCase()) || notes.includes(c.name.toLowerCase())
      );
    });
    if (toDelete.length > 0) {
      const sheetId = await getSheetId("Campaigns");
      if (sheetId != null) {
        await deleteRows(
          "Campaigns",
          sheetId,
          toDelete.map((r) => r._row)
        );
        toDelete.forEach((r) => console.log(`  Deleted row ${r._row}: ${field(r, "campaign name")}`));
      }
    } else {
      console.log("  No leftover personal test rows found.");
    }
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
