import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient, resolveBusinessId, SupabaseNotConfiguredError } from "@/lib/supabaseServer";
import {
  filterPastDueRows,
  missingAttendanceHeaders,
  PAST_DUE_SOURCE_LABEL,
  pastDueExcludeNames,
} from "@/lib/lyfeMetrics";

/**
 * Generic per-tab reader, now backed by Supabase instead of Google Sheets.
 * Each tab name below is the old sheet-tab label the UI already keys off of
 * (SheetGate / useSheetTab in src/components/lyfeBoxing/views.tsx) — kept
 * unchanged so no page code needed to change, only this route's data source.
 * Row values are returned as header-keyed records; the UI's `findField`
 * helper matches on header substrings, so these headers are chosen to match
 * what it already looks for (name, membership, signed, overdue, etc.).
 */

type Row = Record<string, string>;

const MONEY = (n: unknown) => (n === null || n === undefined ? "" : String(n));
const TXT = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const DATE = (v: unknown) => {
  if (!v) return "";
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return String(v);
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
};

async function loadMemberships(supabase: ReturnType<typeof getSupabaseClient>, businessId: string) {
  const { data, error } = await supabase.from("memberships").select("*").eq("business_id", businessId);
  if (error) throw error;
  const rows: Row[] = (data ?? []).map((r) => ({
    Name: TXT(r.name),
    Membership: TXT(r.membership),
    Signed: DATE(r.signed_date),
    Starts: DATE(r.starts_date),
    Expires: TXT(r.expires_date),
    "Installments Remaining": TXT(r.installments_remaining),
    Payment: TXT(r.payment),
    "Recurring/Tax Amount": MONEY(r.recurring_tax_amount),
    "Total Monthly Payment": MONEY(r.total_monthly_payment),
    "Balance Remaining": MONEY(r.balance_remaining),
    "CC Surcharge": TXT(r.cc_surcharge),
    Overdue: TXT(r.overdue),
    "Next Payment": DATE(r.next_payment),
    Method: TXT(r.method),
    Staff: TXT(r.staff),
    Email: TXT(r.email),
    Phone: TXT(r.phone),
  }));
  const headers = rows[0] ? Object.keys(rows[0]) : [];
  return { rows, headers };
}

async function loadContacts(supabase: ReturnType<typeof getSupabaseClient>, businessId: string) {
  const { data, error } = await supabase.from("contacts").select("*").eq("business_id", businessId);
  if (error) throw error;
  const rows: Row[] = (data ?? []).map((r) => ({
    Name: TXT(r.full_name),
    "First Name": TXT(r.first_name),
    "Last Name": TXT(r.last_name),
    Email: TXT(r.email),
    Phone: TXT(r.phone),
    "Contact Type": TXT(r.contact_type),
    Status: TXT(r.status),
    "Date Entered": DATE(r.date_entered),
    Birthday: DATE(r.birthday),
    Age: TXT(r.age),
    Gender: TXT(r.gender),
    Address: TXT(r.address),
    City: TXT(r.city),
    State: TXT(r.state),
    Zip: TXT(r.zip),
    Country: TXT(r.country),
    "Last Seen Days": TXT(r.last_seen_days),
    "Prospect Phase": TXT(r.prospect_phase),
    "Trial Status": TXT(r.trial_status),
    "Trial Phase": TXT(r.trial_phase),
    "Marketing Source": TXT(r.marketing_source),
    "Marketing Source Detail": TXT(r.marketing_source_detail),
    "Referred By": TXT(r.referred_by),
    Tags: Array.isArray(r.tags) ? r.tags.join(", ") : TXT(r.tags),
  }));
  const headers = rows[0] ? Object.keys(rows[0]) : [];
  return { rows, headers };
}

async function loadCancelled(supabase: ReturnType<typeof getSupabaseClient>, businessId: string) {
  const { data, error } = await supabase.from("cancelled_memberships").select("*").eq("business_id", businessId);
  if (error) throw error;
  const rows: Row[] = (data ?? []).map((r) => ({
    Name: TXT(r.name),
    Membership: TXT(r.membership),
    "Signed Date": DATE(r.signed_date),
    "Cancelled Date": DATE(r.cancelled_date),
    "Contact Type": TXT(r.contact_type),
    Reason: TXT(r.reason),
    "Quit Category": TXT(r.quit_category),
    Email: TXT(r.email),
    Phone: TXT(r.phone),
  }));
  const headers = rows[0] ? Object.keys(rows[0]) : [];
  return { rows, headers };
}

async function loadPastDue(supabase: ReturnType<typeof getSupabaseClient>, businessId: string) {
  const { data, error } = await supabase
    .from("past_due")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const rows = (data ?? []).map((r, i) => ({
    _row: i + 2,
    "Due Date": DATE(r.due_date),
    Method: TXT(r.method),
    Contact: TXT(r.contact),
    "Contact Details": TXT(r.contact_details),
    Description: TXT(r.description),
    Attempts: TXT(r.attempts),
    "Last Attempt": DATE(r.last_attempt),
    "Payment Amount": MONEY(r.payment_amount),
    "Total Overdue": MONEY(r.total_overdue),
    Email: TXT(r.email),
    Phone: TXT(r.phone),
    "Email Subject": TXT(r.email_subject),
    "Email Body": TXT(r.email_body),
    "Email Status": TXT(r.email_status),
    "Sent At": "",
    Notes: "",
  }));
  const headers = rows[0] ? Object.keys(rows[0]).filter((h) => h !== "_row") : [];
  return { rows: rows as unknown as Row[], headers };
}

async function loadPayments(supabase: ReturnType<typeof getSupabaseClient>, businessId: string) {
  const { data, error } = await supabase.from("payments").select("*").eq("business_id", businessId);
  if (error) throw error;
  const rows: Row[] = (data ?? []).map((r) => ({
    Date: DATE(r.payment_date),
    "Member Name": TXT(r.member_name),
    Status: TXT(r.status),
    Membership: TXT(r.membership_item),
    "Payment Type": TXT(r.payment_type),
    "Amount paid": MONEY(r.amount_paid),
    "CC Surcharge": MONEY(r.cc_surcharge),
    "Invoice Number": TXT(r.invoice_number),
    "Invoice Notes": TXT(r.invoice_notes),
  }));
  const headers = rows[0] ? Object.keys(rows[0]) : [];
  return { rows, headers };
}

async function loadSms(supabase: ReturnType<typeof getSupabaseClient>, businessId: string) {
  const { data, error } = await supabase.from("sms_conversations").select("*").eq("business_id", businessId);
  if (error) throw error;
  const rows: Row[] = (data ?? []).map((r) => ({
    "Last Message Date": TXT(r.last_message_date),
    "Contact Name": TXT(r.contact_name),
    Phone: TXT(r.phone),
    Direction: TXT(r.direction),
    "Last Message Text": TXT(r.last_message_text),
  }));
  const headers = rows[0] ? Object.keys(rows[0]) : [];
  return { rows, headers };
}

async function loadLeads(supabase: ReturnType<typeof getSupabaseClient>, businessId: string) {
  const { data, error } = await supabase.from("leads").select("full_name, email, phone").eq("business_id", businessId);
  if (error) throw error;
  const rows: Row[] = (data ?? []).map((r) => ({
    Name: TXT(r.full_name),
    Email: TXT(r.email),
    Phone: TXT(r.phone),
  }));
  const headers = rows[0] ? Object.keys(rows[0]) : [];
  return { rows, headers };
}

/** The sheet's Attendance tab was one row per member with rollup columns; the
 * Supabase table is one row per visit, so roll it up here to match. */
async function loadAttendance(supabase: ReturnType<typeof getSupabaseClient>, businessId: string) {
  const { data, error } = await supabase
    .from("attendance")
    .select("student, membership, attendance_date")
    .eq("business_id", businessId);
  if (error) throw error;

  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  type Agg = { membership: string; last: Date | null; count30: number };
  const byStudent = new Map<string, Agg>();
  for (const r of data ?? []) {
    const name = TXT(r.student).trim();
    if (!name) continue;
    const agg = byStudent.get(name) ?? { membership: TXT(r.membership), last: null, count30: 0 };
    const d = r.attendance_date ? new Date(String(r.attendance_date)) : null;
    if (d && !Number.isNaN(d.getTime())) {
      if (!agg.last || d > agg.last) agg.last = d;
      if (d.getTime() >= thirtyDaysAgo) agg.count30 += 1;
    }
    if (r.membership) agg.membership = TXT(r.membership);
    byStudent.set(name, agg);
  }

  const rows: Row[] = Array.from(byStudent.entries()).map(([name, agg]) => ({
    Name: name,
    Membership: agg.membership,
    "Last Attended": agg.last ? DATE(agg.last.toISOString()) : "",
    "Classes Last 30 Days": String(agg.count30),
  }));
  const headers = rows[0] ? Object.keys(rows[0]) : ["Name", "Membership", "Last Attended", "Classes Last 30 Days"];
  return { rows, headers };
}

const LOADERS: Record<
  string,
  (supabase: ReturnType<typeof getSupabaseClient>, businessId: string) => Promise<{ rows: Row[]; headers: string[] }>
> = {
  "All Memberships": loadMemberships,
  Contacts: loadContacts,
  "Cancelled (Oct)": loadCancelled,
  "Past Due": loadPastDue,
  "Payments (Oct 1-25)": loadPayments,
  "SMS Conversations": loadSms,
  Leads: loadLeads,
  Attendance: loadAttendance,
};

export async function GET(req: NextRequest) {
  const tab = req.nextUrl.searchParams.get("tab");
  if (!tab || !LOADERS[tab]) {
    return NextResponse.json({ error: "Unknown or missing tab." }, { status: 400 });
  }

  try {
    const supabase = getSupabaseClient();
    const businessId = await resolveBusinessId(supabase);
    const { rows, headers } = await LOADERS[tab](supabase, businessId);

    if (tab === "Past Due") {
      const filtered = filterPastDueRows(rows, pastDueExcludeNames(process.env.PAST_DUE_EXCLUDE_NAMES));
      return NextResponse.json({
        rows: filtered.rows,
        headers,
        resolvedTab: tab,
        source: PAST_DUE_SOURCE_LABEL,
        hiddenZeroBalance: filtered.hiddenZeroBalance,
        hiddenTestContacts: filtered.hiddenTestContacts,
      });
    }

    const missingHeaders = tab === "Attendance" ? missingAttendanceHeaders(headers) : [];
    return NextResponse.json({ rows, headers, resolvedTab: tab, missingHeaders });
  } catch (err) {
    if (err instanceof SupabaseNotConfiguredError) {
      return NextResponse.json({ error: err.message, notConfigured: true }, { status: 503 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
