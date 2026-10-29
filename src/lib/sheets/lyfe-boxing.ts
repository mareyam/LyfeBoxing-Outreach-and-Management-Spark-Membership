import { readTab, appendRow, updateRowCells, tabExists, type SheetRow } from "./client";

// Every reader returns the raw header-keyed rows plus `_rowNumber` so
// writers can target the exact sheet row. Column names come straight
// from row 1 of each tab, so this stays correct even if Alex's assistant
// reorders or renames a column later — nothing here hardcodes letters
// except where the task explicitly specified them (Campaigns A-J).

export const TABS = {
  memberships: "All Memberships",
  summary: "Summary",
  payments: "Payments (Oct 1-25)",
  cancelled: "Cancelled (Oct)",
  pastDue: "Past Due",
  sms: "SMS Conversations",
  reportsIndex: "Reports Index",
  contacts: "Contacts",
  campaigns: "Campaigns",
  attendance: "Attendance",
  appointments: "Appointments",
} as const;

export type Campaign = SheetRow & {
  "Campaign Name"?: string;
  Channel?: string;
  Audience?: string;
  Subject?: string;
  "Message Body"?: string;
  Send?: string;
  Status?: string;
  Recipients?: string;
  "Sent At (PKT)"?: string;
  Notes?: string;
};

export async function getCampaigns(): Promise<Campaign[]> {
  return readTab(TABS.campaigns) as Promise<Campaign[]>;
}

export async function getPastDue(): Promise<SheetRow[]> {
  return readTab(TABS.pastDue);
}

export async function getCancelled(): Promise<SheetRow[]> {
  return readTab(TABS.cancelled);
}

export async function getMemberships(): Promise<SheetRow[]> {
  return readTab(TABS.memberships);
}

export async function getPayments(): Promise<SheetRow[]> {
  return readTab(TABS.payments);
}

export async function getSummary(): Promise<SheetRow[]> {
  return readTab(TABS.summary);
}

export async function attendanceTabExists(): Promise<boolean> {
  return tabExists(TABS.attendance);
}

export async function getAttendance(): Promise<SheetRow[]> {
  return readTab(TABS.attendance);
}

export async function appointmentsTabExists(): Promise<boolean> {
  return tabExists(TABS.appointments);
}

export async function getAppointments(): Promise<SheetRow[]> {
  return readTab(TABS.appointments);
}

export async function appendCampaign(row: {
  "Campaign Name": string;
  Channel: "Email" | "SMS";
  Audience: string;
  Subject?: string;
  "Message Body": string;
  Notes?: string;
}): Promise<void> {
  await appendRow(TABS.campaigns, {
    "Campaign Name": row["Campaign Name"],
    Channel: row.Channel,
    Audience: row.Audience,
    Subject: row.Subject ?? "",
    "Message Body": row["Message Body"],
    Send: "FALSE",
    Status: "Draft",
    Recipients: "",
    "Sent At (PKT)": "",
    Notes: row.Notes ?? "",
  });
}

export async function queueCampaignSend(rowNumber: number): Promise<void> {
  await updateRowCells(TABS.campaigns, rowNumber, {
    Send: "TRUE",
    Status: "Queued",
  });
}

export async function appendAppointmentRequest(row: {
  Date: string;
  Time: string;
  Type: string;
  Member: string;
  Coach?: string;
}): Promise<void> {
  await appendRow(TABS.appointments, {
    Date: row.Date,
    Time: row.Time,
    Type: row.Type,
    Member: row.Member,
    Coach: row.Coach ?? "",
    Status: "Requested",
  });
}
