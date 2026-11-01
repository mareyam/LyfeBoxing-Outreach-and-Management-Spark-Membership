/**
 * Pure sheet metrics for the Lyfe Boxing dashboard.
 * Column matches are exact (or a listed alias), so "Signed" cannot be
 * confused with "Cancelled Date" and "Unsigned" cannot satisfy "Signed".
 */

export const DEFAULT_PAST_DUE_EXCLUDE_NAMES = ["maryam naveed"];

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

export function parseMoney(value: string): number {
  const n = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** $1,714.50 — always two decimals and thousands separators. */
export function formatMoney(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Format a sheet cell when it contains a number; leave other text alone. */
export function formatMoneyCell(raw: string): string {
  const text = String(raw ?? "").trim();
  if (!/[0-9]/.test(text)) return text || "—";
  return formatMoney(parseMoney(text));
}

export function parseSlashDate(dateStr: string): Date | null {
  const match = String(dateStr ?? "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (!match) return null;
  const [, mm, dd, yyyy] = match;
  let year = Number(yyyy);
  if (year < 100) year += 2000;
  const date = new Date(year, Number(mm) - 1, Number(dd));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function fieldByHeaders(row: object, candidates: string[]): string {
  const record = row as Record<string, unknown>;
  const keys = Object.keys(record);
  for (const candidate of candidates) {
    const exact = keys.find((key) => key.toLowerCase() === candidate.toLowerCase());
    if (!exact) continue;
    const value = record[exact];
    return value == null ? "" : String(value);
  }
  return "";
}

/** Signed date, falling back to the membership start date when Signed is blank. */
export function membershipJoinDate(row: object): Date | null {
  const signed = fieldByHeaders(row, ["Signed", "Signed Date", "Date Signed", "Membership Signed"]);
  const parsedSigned = parseSlashDate(signed);
  if (parsedSigned) return parsedSigned;
  const starts = fieldByHeaders(row, ["Starts", "Start Date", "Start", "Membership Start"]);
  return parseSlashDate(starts);
}

/** Cancellation date only — never the signed/start date on the same row. */
export function cancellationDate(row: object): Date | null {
  const raw = fieldByHeaders(row, ["Cancelled Date", "Cancellation Date", "Date Cancelled", "Cancel Date", "Cancelled"]);
  return parseSlashDate(raw);
}

export function paymentDate(row: object): Date | null {
  const raw = fieldByHeaders(row, ["Date", "Payment Date", "Date Paid", "Paid On"]);
  return parseSlashDate(raw);
}

export function paymentAmount(row: object): number {
  return parseMoney(fieldByHeaders(row, ["Amount paid", "Amount", "Amount Paid"]));
}

export function monthKeyFromDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/** Months present on cancellation dates, always including the current month, newest first. */
export function cancellationMonthKeys(dates: (Date | null)[], now: Date): string[] {
  const keys = new Set<string>([monthKeyFromDate(now)]);
  for (const date of dates) {
    if (date) keys.add(monthKeyFromDate(date));
  }
  return [...keys].sort().reverse();
}

export function dateInMonth(date: Date | null, monthKey: string): boolean {
  return date !== null && monthKeyFromDate(date) === monthKey;
}

export type MonthRevenue = number | null;

/**
 * Revenue for a month. Null means the payments sheet has no rows in that
 * month ("No data"), which is different from a real $0.00 total.
 */
export function monthRevenue(paymentDatesInMonth: number[]): MonthRevenue {
  if (paymentDatesInMonth.length === 0) return null;
  return paymentDatesInMonth.reduce((sum, amount) => sum + amount, 0);
}

export function pastDueExcludeNames(envList?: string): string[] {
  const fromEnv = String(envList ?? "")
    .split(",")
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set([...DEFAULT_PAST_DUE_EXCLUDE_NAMES, ...fromEnv])];
}

export function isExcludedPastDueName(name: string, exclude: string[]): boolean {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return false;
  return exclude.some((entry) => entry === normalized);
}

export function pastDueAmount(row: object): number {
  return parseMoney(fieldByHeaders(row, ["Total Overdue", "Overdue", "Amount Overdue"]));
}

export function pastDueContactName(row: object): string {
  return fieldByHeaders(row, ["Contact", "Name", "Member", "Member Name"]);
}

export type PastDueFilterResult<T> = {
  rows: T[];
  hiddenZeroBalance: number;
  hiddenTestContacts: number;
};

/**
 * Spark Past Due report rows that actually owe money, minus the exclude list.
 * Rows stay in the sheet — this only filters what the dashboard counts.
 */
export function filterPastDueRows<T extends object>(rows: T[], exclude: string[]): PastDueFilterResult<T> {
  let hiddenZeroBalance = 0;
  let hiddenTestContacts = 0;
  const kept: T[] = [];
  for (const row of rows) {
    const name = pastDueContactName(row);
    if (isExcludedPastDueName(name, exclude)) {
      hiddenTestContacts += 1;
      continue;
    }
    if (pastDueAmount(row) <= 0) {
      hiddenZeroBalance += 1;
      continue;
    }
    kept.push(row);
  }
  return { rows: kept, hiddenZeroBalance, hiddenTestContacts };
}

export type TrialTiming = "undated" | "expired" | "expiring" | "active";

/** End of the calendar day on a date-only sheet cell, so "today" is not already expired. */
export function trialEndMoment(expires: string): Date | null {
  const date = parseSlashDate(expires);
  if (!date) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

/**
 * "expiring" is an end date from now through the next 48 hours.
 * Earlier end dates are "expired". Blank / "Open Ended" is "undated" (still active).
 */
export function trialTiming(expires: string, now: Date): TrialTiming {
  const end = trialEndMoment(expires);
  if (!end) return "undated";
  if (end.getTime() < now.getTime()) return "expired";
  if (end.getTime() - now.getTime() <= FORTY_EIGHT_HOURS_MS) return "expiring";
  return "active";
}

export function isActiveTrial(expires: string, now: Date): boolean {
  const timing = trialTiming(expires, now);
  return timing === "undated" || timing === "expiring" || timing === "active";
}

export type AttendanceHeaderGroup = { label: string; candidates: string[] };

/** Headers the At Risk and Upgrade pages read. Multi-word aliases may match a longer header. */
export const ATTENDANCE_HEADER_GROUPS: AttendanceHeaderGroup[] = [
  { label: "Name", candidates: ["name", "member", "member name"] },
  { label: "Membership", candidates: ["membership", "membership plan", "plan"] },
  { label: "Last Attended", candidates: ["last attended", "last visit", "last class"] },
  { label: "Classes Last 30 Days", candidates: ["classes last 30 days", "classes last 30", "visits last 30 days"] },
];

function headerMatchesCandidate(header: string, candidate: string): boolean {
  const normalizedHeader = header.toLowerCase().trim();
  const normalizedCandidate = candidate.toLowerCase().trim();
  if (normalizedHeader === normalizedCandidate) return true;
  return normalizedCandidate.includes(" ") && normalizedHeader.includes(normalizedCandidate);
}

export function missingAttendanceHeaders(headers: string[]): string[] {
  return ATTENDANCE_HEADER_GROUPS.filter(
    (group) => !group.candidates.some((candidate) => headers.some((header) => headerMatchesCandidate(header, candidate)))
  ).map((group) => group.label);
}

export const ATTENDANCE_TAB_CANDIDATES = ["Attendance", "Attendance (6 mo)"] as const;

export const PAST_DUE_SOURCE_LABEL = "Spark Past Due report";
