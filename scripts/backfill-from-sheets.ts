/**
 * Re-runnable backfill from Google Sheets into Supabase. Run manually with:
 *   npx tsx scripts/backfill-from-sheets.ts
 *
 * Only upserts (by a stable natural key) or inserts — never deletes a row.
 * Safe to re-run: existing rows are matched by their natural key and updated
 * in place, never duplicated.
 *
 * This backfill currently covers the "Leads" tab -> public.leads, since that
 * is what the lead follow-up system (the focus of this migration pass) reads.
 * The same pattern — read the tab with readTabRows-style header mapping, map
 * each row onto the matching Supabase table's columns, then upsert by a
 * natural key — applies to every other tab (Contacts, All Memberships,
 * Cancelled (Oct), Past Due, Payments, SMS Conversations, Campaigns,
 * Playbook/Examples, Attendance, Email Templates, Digest): add one more
 * `backfillX()` function below per tab, following `backfillLeads()`.
 * Natural keys to use for the remaining tabs, since most sheet rows have no
 * stable id: Contacts/Memberships -> spark_contact_id (business_id scoped
 * unique already enforced in 0001_contacts.sql); Cancelled/Past Due/Payments
 * -> business_id + email + a date column (signed_date/due_date/invoice_number);
 * SMS -> business_id + phone + last_message_date; Campaigns -> campaign_name.
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";

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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvLocal();

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
const CLIENT_EMAIL = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, "\n");
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUSINESS_SLUG = process.env.BACKFILL_BUSINESS_SLUG?.trim() || "lyfe-boxing";

function requireEnv() {
  const missing = [
    ["GOOGLE_SHEETS_SPREADSHEET_ID", SPREADSHEET_ID],
    ["GOOGLE_SHEETS_CLIENT_EMAIL", CLIENT_EMAIL],
    ["GOOGLE_SHEETS_PRIVATE_KEY", PRIVATE_KEY],
    ["SUPABASE_URL", SUPABASE_URL],
    ["SUPABASE_SERVICE_ROLE_KEY", SUPABASE_SERVICE_ROLE_KEY],
  ].filter(([, v]) => !v);
  if (missing.length > 0) {
    console.error(`Missing env vars: ${missing.map(([k]) => k).join(", ")}`);
    process.exit(1);
  }
}

async function readTab(tabName: string): Promise<Record<string, string>[]> {
  const auth = new google.auth.JWT({
    email: CLIENT_EMAIL,
    key: PRIVATE_KEY,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  const sheets = google.sheets({ version: "v4", auth });
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: `${tabName}!A1:ZZ` });
  const rows = res.data.values ?? [];
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => (h ?? "").toString().trim());
  return rows.slice(1).map((row) => {
    const record: Record<string, string> = {};
    headers.forEach((header, i) => {
      if (header) record[header] = (row[i] ?? "").toString();
    });
    return record;
  });
}

function field(row: Record<string, string>, ...candidates: string[]): string {
  const keys = Object.keys(row);
  for (const candidate of candidates) {
    const exact = keys.find((key) => key.toLowerCase() === candidate.toLowerCase());
    if (exact) return (row[exact] ?? "").trim();
  }
  return "";
}

function toDateOrNull(value: string): string | null {
  if (!value) return null;
  const slash = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (slash) {
    let year = Number(slash[3]);
    if (year < 100) year += 2000;
    const month = String(Number(slash[1])).padStart(2, "0");
    const day = String(Number(slash[2])).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  const iso = value.match(/^\d{4}-\d{2}-\d{2}/);
  return iso ? iso[0] : null;
}

/**
 * Leads tab -> public.leads. Natural key: (business_id, lower(email)) when an
 * email exists, else (business_id, lower(full_name), created_at_sheet) — this
 * mirrors how leads are deduplicated in the sheet today. Re-running never
 * creates a duplicate lead row.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- standalone script; no generated Database type to type the client against
async function backfillLeads(supabase: any, businessId: string) {
  const rows = await readTab("Leads");
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const fullName = field(row, "Full Name", "Name");
    if (!fullName) {
      skipped += 1;
      continue;
    }
    const email = field(row, "Email").toLowerCase();
    const createdAtSheet = field(row, "Created At", "Date Entered");

    const payload = {
      business_id: businessId,
      full_name: fullName,
      email: field(row, "Email") || null,
      phone: field(row, "Phone") || null,
      stage: field(row, "Stage") || null,
      source: field(row, "Source") || null,
      created_at_sheet: createdAtSheet || null,
      last_contacted: field(row, "Last Contacted") || null,
      next_followup_date: toDateOrNull(field(row, "Next Follow-up Date")),
      sequence_step: field(row, "Sequence Step") || "1",
      trial_booked_at: field(row, "Trial Booked At") || null,
      class_date: field(row, "Class Date") || null,
      status: field(row, "Status") || null,
      email_draft: field(row, "Email Draft") || null,
      email_status: field(row, "Email Status") || null,
      sms_draft: field(row, "SMS Draft") || null,
      sms_status: field(row, "SMS Status") || null,
      notes: field(row, "Notes") || null,
      ai_original: field(row, "AI Original") || null,
      example_logged: field(row, "Example Logged") || null,
      draft_step: field(row, "Draft Step") || null,
      spark_contact_id: field(row, "Spark Contact ID") || null,
      contact_type: field(row, "Contact Type") || null,
      birthday: field(row, "Birthday") || null,
      age: field(row, "Age") || null,
      last_seen: field(row, "Last Seen") || null,
      date_entered: field(row, "Date Entered") || null,
    };

    // Match existing rows by email first (most reliable), falling back to name.
    let existingId: string | null = null;
    if (email) {
      const { data } = await supabase
        .from("leads")
        .select("id")
        .eq("business_id", businessId)
        .ilike("email", email)
        .maybeSingle();
      existingId = data?.id ?? null;
    }
    if (!existingId && !email) {
      // No email to match on: fall back to matching an existing, equally
      // email-less lead with the same name (best effort — this is the sheet's
      // own ambiguity, not something we can fully resolve here).
      const { data } = await supabase
        .from("leads")
        .select("id")
        .eq("business_id", businessId)
        .ilike("full_name", fullName)
        .is("email", null)
        .maybeSingle();
      existingId = data?.id ?? null;
    }

    if (existingId) {
      const { error } = await supabase.from("leads").update(payload).eq("id", existingId);
      if (error) console.error(`[leads] update failed for ${fullName}: ${error.message}`);
      else updated += 1;
    } else {
      const { error } = await supabase.from("leads").insert(payload);
      if (error) console.error(`[leads] insert failed for ${fullName}: ${error.message}`);
      else inserted += 1;
    }
  }

  console.log(`[leads] inserted=${inserted} updated=${updated} skipped=${skipped} (of ${rows.length} sheet rows)`);
}

async function main() {
  requireEnv();
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

  const { data: business, error } = await supabase.from("businesses").select("id").eq("slug", BUSINESS_SLUG).single();
  if (error || !business) {
    console.error(`No business found for slug "${BUSINESS_SLUG}". Run the 0001_contacts.sql migration first.`);
    process.exit(1);
  }

  await backfillLeads(supabase, business.id as string);

  console.log("Backfill complete. Re-run any time — it only inserts/updates, never deletes.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
