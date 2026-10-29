"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, AlertTriangle, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Mail, MessageSquare, Plus, Send, Sparkles, X } from "lucide-react";
import { reportsIndex } from "@/lib/lyfeBoxingReports";
import { Badge, Card, PageHeader, Stat } from "@/components/ui";

const PAGE_SIZE = 20;

/** Paginates any array client-side; resets to page 1 whenever the input list changes length (e.g. a new search). */
function usePagination<T>(items: T[], pageSize: number = PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize]
  );
  return { pageItems, page: safePage, setPage, totalPages, totalItems: items.length };
}

/** Reloads while a draft is Queued so Grok's Sent / Error update shows up. */
function usePollWhileQueued(active: boolean, reload: () => void) {
  useEffect(() => {
    if (!active) return;
    const interval = setInterval(reload, 15_000);
    return () => clearInterval(interval);
  }, [active, reload]);
}

async function apiError(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    return data?.error || fallback;
  } catch {
    return fallback;
  }
}

function PaginationControls({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-4">
      <p className="text-xs text-neutral-400">
        Page {page} of {totalPages}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className="inline-flex items-center gap-1 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
          Previous
        </button>
        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          className="inline-flex items-center gap-1 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

/**
 * Full-draft editor used by both Cancelled (win-back) and Past Due.
 * Shows the subject/body, lets them be edited and saved back to the
 * sheet, and a separate Send action that only marks the row ready —
 * nothing in this app sends email/SMS directly.
 */
function DraftModal({
  title,
  subtitle,
  to,
  subject,
  body,
  showSubject,
  locked,
  statusLabel,
  sentAt,
  notes,
  sendDisabledReason,
  onClose,
  onSave,
  onSend,
  onPoll,
}: {
  title: string;
  subtitle: string;
  /** Recipient address. Omit for drafts that are not addressed to one person. */
  to?: string;
  subject: string;
  body: string;
  showSubject: boolean;
  locked: boolean;
  statusLabel?: string;
  sentAt?: string;
  notes?: string;
  sendDisabledReason?: string;
  onClose: () => void;
  onSave: (subject: string, body: string) => Promise<void>;
  onSend: (subject: string, body: string) => Promise<void>;
  /** Called every 15s while statusLabel === "Queued" so the modal picks up Grok's Sent/Error update. */
  onPoll?: () => Promise<void>;
}) {
  const [editSubject, setEditSubject] = useState(subject);
  const [editBody, setEditBody] = useState(body);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirmingSend, setConfirmingSend] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dirty = editSubject !== subject || editBody !== body;

  useEffect(() => {
    if (statusLabel !== "Queued" || !onPoll) return;
    const interval = setInterval(() => {
      onPoll();
    }, 15_000);
    return () => clearInterval(interval);
  }, [statusLabel, onPoll]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await onSave(editSubject, editBody);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSend() {
    setSending(true);
    setError(null);
    try {
      await onSend(editSubject, editBody);
      setConfirmingSend(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl max-w-xl w-full p-6 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm text-neutral-400">{subtitle}</p>
            <p className="text-base font-semibold text-neutral-900 mt-0.5">{title}</p>
          </div>
          <div className="flex items-center gap-2">
            {statusLabel && <Badge>{statusLabel}</Badge>}
            <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {to !== undefined && (
          <div className="mb-3">
            <p className="text-xs text-neutral-400 mb-1">To</p>
            <p className="text-sm text-neutral-800">{to || "No email on file"}</p>
          </div>
        )}

        {locked ? (
          <>
            {showSubject && (
              <div className="mb-3">
                <p className="text-xs text-neutral-400 mb-1">Subject</p>
                <p className="text-sm text-neutral-800">{subject || "(no subject)"}</p>
              </div>
            )}
            <p className="text-xs text-neutral-400 mb-1">Message</p>
            <p className="text-sm text-neutral-700 whitespace-pre-line leading-relaxed">{body}</p>
            {sentAt && <p className="text-xs text-neutral-500 mt-4">Sent at {sentAt}</p>}
            {(statusLabel === "Sent" || statusLabel === "Error") && notes && (
              <p className="text-sm text-neutral-600 mt-2 whitespace-pre-line">Notes: {notes}</p>
            )}
            {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
            <div className="flex items-center justify-between mt-4 gap-3">
              <p className="text-xs text-neutral-400">This draft is locked — it&apos;s already been queued or sent.</p>
              {statusLabel === "Queued" && (
                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="shrink-0 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                >
                  {sending ? "Notifying…" : "Notify again"}
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-3">
            {showSubject && (
              <div>
                <label className="text-xs font-medium text-neutral-500 block mb-1">Subject</label>
                <input
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-neutral-500 block mb-1">Message</label>
              <textarea
                rows={8}
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {!dirty && sendDisabledReason && <p className="text-sm text-amber-700">{sendDisabledReason}</p>}

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={handleSave}
                disabled={saving || !dirty}
                className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-40"
              >
                {saving ? "Saving…" : saved ? "Saved" : "Save"}
              </button>

              {!confirmingSend ? (
                <button
                  onClick={() => setConfirmingSend(true)}
                  disabled={!!sendDisabledReason}
                  title={sendDisabledReason}
                  className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 text-white px-4 py-2 text-sm font-medium hover:bg-neutral-800 disabled:opacity-40"
                >
                  <Send className="h-3.5 w-3.5" strokeWidth={2} />
                  Send
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setConfirmingSend(false)}
                    className="text-sm text-neutral-400 hover:text-neutral-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={sending}
                    className="rounded-full bg-neutral-900 text-white px-4 py-2 text-sm font-medium hover:bg-neutral-800 disabled:opacity-50"
                  >
                    {sending ? "Sending…" : "Confirm send"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared live-data fetching. Every page here reads straight from the Google
// Sheet at request time via /api/lyfe-data — nothing in this file holds
// real member data. Column names are matched fuzzily (see findField) since
// the exact header text in the live sheet may not match these guesses
// exactly; unmatched fields just render blank instead of crashing.
// ---------------------------------------------------------------------------

type SheetRow = Record<string, string> & { _row: number };

type FetchState =
  | { status: "loading" }
  | { status: "ok"; rows: SheetRow[] }
  | { status: "not-configured" }
  | { status: "tab-missing"; tabName: string }
  | { status: "error"; message: string };

function useSheetTab(tab: string) {
  const [state, setState] = useState<FetchState>({ status: "loading" });

  const reload = useCallback(() => {
    setState({ status: "loading" });
    fetch(`/api/lyfe-data?tab=${encodeURIComponent(tab)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          if (data.notConfigured) return setState({ status: "not-configured" });
          if (data.tabMissing) return setState({ status: "tab-missing", tabName: tab });
          return setState({ status: "error", message: data.error ?? "Failed to load." });
        }
        setState({ status: "ok", rows: data.rows ?? [] });
      })
      .catch(() => setState({ status: "error", message: "Failed to load." }));
  }, [tab]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount, the standard pattern for client-rendered pages with no server-fetched data
    reload();
  }, [reload]);

  return { state, reload };
}

type SummaryState =
  | { status: "loading" }
  | { status: "ok"; raw: string[][] }
  | { status: "not-configured" }
  | { status: "tab-missing" }
  | { status: "error"; message: string };

function useSummaryTab() {
  const [state, setState] = useState<SummaryState>({ status: "loading" });
  useEffect(() => {
    fetch(`/api/lyfe-data?tab=${encodeURIComponent("Summary")}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          if (data.notConfigured) return setState({ status: "not-configured" });
          if (data.tabMissing) return setState({ status: "tab-missing" });
          return setState({ status: "error", message: data.error ?? "Failed to load." });
        }
        setState({ status: "ok", raw: data.raw ?? [] });
      })
      .catch(() => setState({ status: "error", message: "Failed to load." }));
  }, []);
  return state;
}

function findField(row: SheetRow, ...candidates: string[]): string {
  const keys = Object.keys(row);
  for (const c of candidates) {
    const exact = keys.find((k) => k.toLowerCase() === c.toLowerCase());
    if (exact) return row[exact] ?? "";
  }
  for (const c of candidates) {
    const partial = keys.find((k) => k.toLowerCase().includes(c.toLowerCase()));
    if (partial) return row[partial] ?? "";
  }
  return "";
}

function parseMoney(v: string): number {
  return Number((v ?? "").replace(/[^0-9.-]/g, "")) || 0;
}

function parseSlashDate(dateStr: string): Date | null {
  const m = (dateStr ?? "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{1,4})/);
  if (!m) return null;
  const [, mm, dd, yyyy] = m;
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
}

/** First word of a full name, e.g. "Cheyenne Randall" -> "Cheyenne". */
function firstNameOf(fullName: string): string {
  const trimmed = (fullName ?? "").trim();
  return trimmed ? trimmed.split(/\s+/)[0] : "there";
}

/** Fills {First name} with the contact's actual first name — drafts should never go out with the literal token still in them. */
function personalize(template: string, fullName: string): string {
  return template.replaceAll("{First name}", firstNameOf(fullName));
}

/**
 * Email for a person: the row's own address, then the Cancelled tab's Email
 * column (header "Email", column H), then the Contacts tab.
 */
function useContactEmails() {
  const [byName, setByName] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    Promise.all([
      fetch(`/api/lyfe-data?tab=${encodeURIComponent("Contacts")}`).then((r) => r.json()).catch(() => ({})),
      fetch(`/api/lyfe-data?tab=${encodeURIComponent("Cancelled (Oct)")}`).then((r) => r.json()).catch(() => ({})),
    ]).then(([contacts, cancelled]: { rows?: SheetRow[] }[]) => {
      const map = new Map<string, string>();
      for (const r of contacts.rows ?? []) {
        const name = findField(r, "name").trim().toLowerCase();
        const email = findField(r, "email").trim();
        if (name && email) map.set(name, email);
      }
      for (const r of cancelled.rows ?? []) {
        const name = findField(r, "name").trim().toLowerCase();
        const email = (r["Email"] ?? findField(r, "email")).trim();
        if (name && email) map.set(name, email);
      }
      setByName(map);
    });
  }, []);

  return useCallback((name: string, rowEmail?: string) => rowEmail?.trim() || byName.get(name.trim().toLowerCase()) || "", [byName]);
}

function SetupNeeded() {
  return (
    <Card className="border-amber-200 bg-amber-50">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-neutral-900">Google Sheets isn&apos;t connected yet</p>
          <p className="text-sm text-neutral-600 mt-1 max-w-xl">
            Set <code className="bg-white px-1.5 py-0.5 rounded border border-amber-200 text-xs">GOOGLE_SHEETS_SPREADSHEET_ID</code>,{" "}
            <code className="bg-white px-1.5 py-0.5 rounded border border-amber-200 text-xs">GOOGLE_SHEETS_CLIENT_EMAIL</code>, and{" "}
            <code className="bg-white px-1.5 py-0.5 rounded border border-amber-200 text-xs">GOOGLE_SHEETS_PRIVATE_KEY</code> as
            environment variables, and share the sheet with that service account&apos;s email.
          </p>
        </div>
      </div>
    </Card>
  );
}

function SheetErrorCard({ message }: { message: string }) {
  return (
    <Card className="border-red-200 bg-red-50">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-neutral-900">Couldn&apos;t load this sheet</p>
          <p className="text-sm text-neutral-600 mt-1">{message}</p>
        </div>
      </div>
    </Card>
  );
}

function TabMissingCard({ tabName }: { tabName: string }) {
  return (
    <Card className="text-center py-12">
      <AlertCircle className="h-8 w-8 text-neutral-300 mx-auto" strokeWidth={1.5} />
      <p className="font-semibold text-neutral-900 mt-3">Waiting on the &quot;{tabName}&quot; tab</p>
      <p className="text-sm text-neutral-500 mt-1 max-w-sm mx-auto">
        Once this tab is added to the Spark Memberships sheet with the right columns, this page will start showing data automatically.
      </p>
    </Card>
  );
}

function LoadingCard() {
  return <div className="h-40 rounded-2xl bg-neutral-100 animate-pulse" />;
}

/** Renders the right state card and calls children(rows) only once data is ok. */
function SheetGate({
  tab,
  children,
}: {
  tab: string;
  children: (rows: SheetRow[], reload: () => void) => React.ReactNode;
}) {
  const { state, reload } = useSheetTab(tab);
  if (state.status === "loading") return <LoadingCard />;
  if (state.status === "not-configured") return <SetupNeeded />;
  if (state.status === "tab-missing") return <TabMissingCard tabName={state.tabName} />;
  if (state.status === "error") return <SheetErrorCard message={state.message} />;
  return <>{children(state.rows, reload)}</>;
}

// ---------------------------------------------------------------------------
// Memberships
// ---------------------------------------------------------------------------

export function MembershipsView() {
  return (
    <div className="max-w-6xl">
      <PageHeader title="All Memberships" subtitle="Live roster from the Spark Memberships sheet." tool="Google Sheets (All Memberships)" />
      <SheetGate tab="All Memberships">{(rows) => <MembershipsTable rows={rows} />}</SheetGate>
    </div>
  );
}

function MembershipsTable({ rows }: { rows: SheetRow[] }) {
  const [query, setQuery] = useState("");

  const mapped = rows.map((r) => ({
    name: findField(r, "name", "member", "member name"),
    membership: findField(r, "membership"),
    expires: findField(r, "expires"),
    overdue: findField(r, "overdue"),
    nextPayment: findField(r, "next payment"),
    method: findField(r, "method"),
    staff: findField(r, "staff"),
  }));

  const q = query.trim().toLowerCase();
  const filtered = q ? mapped.filter((m) => m.name.toLowerCase().includes(q) || m.membership.toLowerCase().includes(q)) : mapped;

  const activeCount = mapped.filter((m) => m.expires.toLowerCase().includes("open")).length;
  const overdueCount = mapped.filter((m) => parseMoney(m.overdue) > 0).length;

  const { pageItems, page, setPage, totalPages } = usePagination(filtered);

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <Stat label="Total members" value={mapped.length} />
        <Stat label="Open-ended" value={activeCount} />
        <Stat label="Overdue" value={overdueCount} />
      </div>
      <input
        type="text"
        placeholder="Search by name or plan..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full sm:w-80 mb-4 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
      />
      <p className="text-sm text-neutral-400 mb-3">
        Showing {filtered.length} of {mapped.length} members
      </p>
      {filtered.length === 0 ? (
        <Card className="text-center py-10 text-sm text-neutral-500">No members found.</Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-400 border-b border-neutral-100">
                <th className="py-2 pr-4 font-medium">Name</th>
                <th className="py-2 pr-4 font-medium">Membership</th>
                <th className="py-2 pr-4 font-medium">Expires</th>
                <th className="py-2 pr-4 font-medium">Overdue</th>
                <th className="py-2 pr-4 font-medium">Next Payment</th>
                <th className="py-2 pr-4 font-medium">Staff</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((m, i) => (
                <tr key={`${m.name}-${i}`} className="border-b border-neutral-50 last:border-0 align-top">
                  <td className="py-2.5 pr-4 text-neutral-900 font-medium whitespace-nowrap">{m.name || "—"}</td>
                  <td className="py-2.5 pr-4 text-neutral-600 whitespace-nowrap">{m.membership || "—"}</td>
                  <td className="py-2.5 pr-4 text-neutral-500 whitespace-nowrap">{m.expires || "—"}</td>
                  <td className="py-2.5 pr-4 text-neutral-500 whitespace-nowrap">{m.overdue || "—"}</td>
                  <td className="py-2.5 pr-4 text-neutral-500 whitespace-nowrap">{m.nextPayment || "—"}</td>
                  <td className="py-2.5 pr-4 text-neutral-500 whitespace-nowrap">{m.staff || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <PaginationControls page={page} totalPages={totalPages} onChange={setPage} />
        </Card>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

export function SummaryView() {
  const state = useSummaryTab();
  return (
    <div className="max-w-3xl">
      <PageHeader title="Summary" subtitle="Key numbers from the Spark Memberships sheet." tool="Google Sheets (Summary)" />
      {state.status === "loading" && <LoadingCard />}
      {state.status === "not-configured" && <SetupNeeded />}
      {state.status === "tab-missing" && <TabMissingCard tabName="Summary" />}
      {state.status === "error" && <SheetErrorCard message={state.message} />}
      {state.status === "ok" && (
        <Card>
          <dl className="divide-y divide-neutral-100">
            {state.raw.length === 0 ? (
              <p className="text-sm text-neutral-500 py-2">No rows in the Summary tab yet.</p>
            ) : (
              state.raw.map(([label, value], i) => (
                <div key={i} className="flex items-center justify-between py-2.5">
                  <dt className="text-sm text-neutral-500">{label}</dt>
                  <dd className="text-sm font-medium text-neutral-900">{value}</dd>
                </div>
              ))
            )}
          </dl>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cancelled + Win-back
// ---------------------------------------------------------------------------

const WINBACK_EMAIL_TEMPLATE = {
  subject: "We miss you at Lyfe Boxing, {First name}",
  messageBody:
    "Hey {First name},\n\nIt's been a minute since we've seen you in the gym — and honestly, it's not the same without you.\n\nWe'd love to have you back for a free class, on us: [OFFER]\n\nNo pressure, no sales pitch. Just come throw some punches and remember why you started.\n\nLyfe Boxing",
};

function winbackTag(name: string): string {
  return `winback:${name}`;
}

export function CancelledView() {
  return (
    <div className="max-w-6xl">
      <PageHeader title="Cancelled (October)" subtitle="Members who cancelled this month, with reason and category." tool="Google Sheets (Cancelled Oct)" />
      <SheetGate tab="Cancelled (Oct)">{(rows) => <CancelledTable rows={rows} />}</SheetGate>
    </div>
  );
}

function CancelledTable({ rows }: { rows: SheetRow[] }) {
  const [query, setQuery] = useState("");
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [openDraftFor, setOpenDraftFor] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const emailFor = useContactEmails();

  const loadCampaigns = useCallback(async () => {
    try {
      const res = await fetch("/api/campaigns");
      const data = await res.json();
      if (res.ok) setCampaigns(data.campaigns);
    } catch {
      // campaigns panel just won't show draft state; the rest of the page still works
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount, the standard pattern for client-rendered pages with no server-fetched data
    loadCampaigns();
  }, [loadCampaigns]);

  const mapped = rows.map((r) => ({
    name: findField(r, "name"),
    email: findField(r, "email"),
    membership: findField(r, "membership"),
    signedDate: findField(r, "signed"),
    cancelledDate: findField(r, "cancelled date", "cancelled"),
    quitCategory: findField(r, "quit category", "category"),
    reason: findField(r, "reason"),
  }));

  // eslint-disable-next-line react-hooks/purity -- intentionally evaluated fresh each render: a point-in-time "days since cancellation" check, not cached state
  const winbackNow = Date.now();
  function isWinbackEligible(cancelledDate: string): boolean {
    const d = parseSlashDate(cancelledDate);
    return d !== null && winbackNow - d.getTime() >= 14 * 86_400_000;
  }
  const winbackEligible = mapped.filter((c) => isWinbackEligible(c.cancelledDate)).length;

  const byCategory = new Map<string, number>();
  for (const c of mapped) {
    const key = c.quitCategory || "Not Assigned";
    byCategory.set(key, (byCategory.get(key) ?? 0) + 1);
  }
  const categoryList = Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? mapped.filter((c) => {
        const email = emailFor(c.name, c.email).toLowerCase();
        return c.name.toLowerCase().includes(q) || email.includes(q) || c.membership.toLowerCase().includes(q) || c.quitCategory.toLowerCase().includes(q);
      })
    : mapped;

  const { pageItems, page, setPage, totalPages } = usePagination(filtered);

  const openContact = pageItems.find((c) => c.name === openDraftFor);
  const openCampaign = openDraftFor ? campaigns?.find((c) => c.notes === winbackTag(openDraftFor)) : undefined;
  const openEmail = openContact ? emailFor(openContact.name, openContact.email) : "";

  const eligibleNames = mapped.filter((c) => isWinbackEligible(c.cancelledDate)).map((c) => c.name);
  const winbackQueued = !!campaigns?.some((c) => c.notes.startsWith("winback:") && c.status === "Queued");
  usePollWhileQueued(winbackQueued, loadCampaigns);
  const missingDraftCount = campaigns
    ? eligibleNames.filter((name) => !campaigns.find((camp) => camp.notes === winbackTag(name))).length
    : eligibleNames.length;

  // Selectable = has a Draft-status campaign ready to queue
  const selectableNames = pageItems
    .filter((c) => {
      const camp = campaigns?.find((camp) => camp.notes === winbackTag(c.name));
      return camp && (camp.status === "Draft" || camp.status === "Error") && emailFor(c.name, c.email);
    })
    .map((c) => c.name);

  function toggleSelected(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  return (
    <>
      <Card className="mb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-semibold text-neutral-900">
              Win-back: {winbackEligible} member{winbackEligible === 1 ? "" : "s"} cancelled 14+ days ago
            </p>
            <p className="text-sm text-neutral-500 mt-1">
              Generate a draft per contact below, edit it if you like, then send it whenever you&apos;re ready.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selected.size > 0 && (
              <SendSelectedButton
                campaigns={campaigns ?? []}
                selectedNames={selected}
                emailFor={emailFor}
                tagFn={winbackTag}
                onDone={async () => {
                  setSelected(new Set());
                  await loadCampaigns();
                }}
              />
            )}
            <GenerateAllWinbackButton names={eligibleNames} missingCount={missingDraftCount} onDone={loadCampaigns} />
          </div>
        </div>
      </Card>
      <Card className="mb-6">
        <p className="text-base text-neutral-500 mb-3">Cancellations by category</p>
        <div className="flex flex-wrap gap-2">
          {categoryList.map(([name, count]) => (
            <span key={name} className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-sm text-neutral-700">
              {name} <span className="text-neutral-400">· {count}</span>
            </span>
          ))}
        </div>
      </Card>
      <input
        type="text"
        placeholder="Search by name, email, plan, or reason category..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full sm:w-80 mb-4 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
      />
      <p className="text-sm text-neutral-400 mb-3">
        Showing {filtered.length} of {mapped.length} cancellations
      </p>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-neutral-400 border-b border-neutral-100">
              <th className="py-2 pr-2 font-medium w-6"></th>
              <th className="py-2 pr-4 font-medium">Name</th>
              <th className="py-2 pr-4 font-medium">Email</th>
              <th className="py-2 pr-4 font-medium">Membership</th>
              <th className="py-2 pr-4 font-medium">Signed</th>
              <th className="py-2 pr-4 font-medium">Cancelled</th>
              <th className="py-2 pr-4 font-medium">Category</th>
              <th className="py-2 pr-4 font-medium">Reason</th>
              <th className="py-2 pr-4 font-medium">Win-back draft</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((c, i) => {
              const canSelect = selectableNames.includes(c.name);
              return (
                <tr
                  key={`${c.name}-${i}`}
                  className={`border-b border-neutral-50 last:border-0 align-top ${
                    campaigns?.find((camp) => camp.notes === winbackTag(c.name))?.status === "Draft" ? "bg-amber-50/60" : ""
                  }`}
                >
                  <td className="py-2.5 pr-2">
                    {canSelect && (
                      <input
                        type="checkbox"
                        checked={selected.has(c.name)}
                        onChange={() => toggleSelected(c.name)}
                        className="rounded border-neutral-300"
                      />
                    )}
                  </td>
                  <td className="py-2.5 pr-4 text-neutral-900 font-medium whitespace-nowrap">{c.name || "—"}</td>
                  <td className="py-2.5 pr-4 text-neutral-600 whitespace-nowrap">{emailFor(c.name, c.email) || "—"}</td>
                  <td className="py-2.5 pr-4 text-neutral-600 whitespace-nowrap">{c.membership || "—"}</td>
                  <td className="py-2.5 pr-4 text-neutral-500 whitespace-nowrap">{c.signedDate || "—"}</td>
                  <td className="py-2.5 pr-4 text-neutral-500 whitespace-nowrap">{c.cancelledDate || "—"}</td>
                  <td className="py-2.5 pr-4 text-neutral-600 whitespace-nowrap">{c.quitCategory || "—"}</td>
                  <td className="py-2.5 pr-4 text-neutral-500 max-w-xs break-words">{c.reason || "—"}</td>
                  <td className="py-2.5 pr-4 whitespace-nowrap">
                    {isWinbackEligible(c.cancelledDate) ? (
                      <WinbackDraftCell
                        name={c.name}
                        hasEmail={!!emailFor(c.name, c.email)}
                        campaign={campaigns?.find((camp) => camp.notes === winbackTag(c.name))}
                        onGenerated={loadCampaigns}
                        onOpen={() => setOpenDraftFor(c.name)}
                      />
                    ) : (
                      <span className="text-xs text-neutral-300">Not eligible yet</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <PaginationControls page={page} totalPages={totalPages} onChange={setPage} />
      </Card>

      {openDraftFor && openContact && openCampaign && (
        <DraftModal
          title={`Win-back email for ${openContact.name}`}
          subtitle="Cancelled / Win-back"
          to={openEmail}
          subject={openCampaign.subject}
          body={openCampaign.messageBody}
          showSubject
          statusLabel={openCampaign.status}
          sentAt={openCampaign.sentAt}
          notes={openCampaign.notes}
          sendDisabledReason={openEmail ? undefined : "This contact has no email on file — can't send."}
          locked={openCampaign.status === "Sending" || openCampaign.status === "Sent" || openCampaign.status === "Queued"}
          onClose={() => setOpenDraftFor(null)}
          onPoll={loadCampaigns}
          onSave={async (subject, messageBody) => {
            const res = await fetch("/api/campaigns", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ row: openCampaign.row, subject, messageBody }),
            });
            if (!res.ok) throw new Error(await apiError(res, "Failed to save."));
            await loadCampaigns();
          }}
          onSend={async (subject, messageBody) => {
            const res = await fetch("/api/campaigns/send", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ row: openCampaign.row, subject, messageBody }),
            });
            const message = res.ok ? null : await apiError(res, "Failed to send.");
            await loadCampaigns();
            if (message) throw new Error(message);
          }}
        />
      )}
    </>
  );
}

/** Queues every selected Draft row and tells Grok once for the whole batch. Generic enough to share between Win-back and Trial Conversion. */
function SendSelectedButton({
  campaigns,
  selectedNames,
  emailFor,
  tagFn,
  onDone,
}: {
  campaigns: Campaign[];
  selectedNames: Set<string>;
  emailFor: (name: string, rowEmail?: string) => string;
  tagFn: (name: string) => string;
  onDone: () => Promise<void>;
}) {
  const [state, setState] = useState<"idle" | "sending" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function sendSelected() {
    setState("sending");
    setError(null);
    try {
      const items = [...selectedNames]
        .map((name) => {
          const camp = campaigns.find((c) => c.notes === tagFn(name));
          const email = emailFor(name);
          if (!camp || !email) return null;
          return { row: camp.row, subject: camp.subject, messageBody: camp.messageBody };
        })
        .filter((x): x is { row: number; subject: string; messageBody: string } => x !== null);

      if (items.length === 0) throw new Error("Nothing to send — check that each person has an email.");

      const res = await fetch("/api/campaigns/send-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const failed = res.ok ? null : await apiError(res, "Something went wrong — try again.");
      await onDone();
      if (failed) throw new Error(failed);
      setState("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong — try again.");
      setState("error");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={sendSelected}
        disabled={state === "sending"}
        className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
      >
        <Send className="h-3.5 w-3.5" strokeWidth={2} />
        {state === "sending" ? "Sending…" : `Send selected (${selectedNames.size})`}
      </button>
      {state === "error" && error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

function GenerateAllWinbackButton({
  names,
  missingCount,
  onDone,
}: {
  names: string[];
  missingCount: number;
  onDone: () => Promise<void>;
}) {
  const [state, setState] = useState<"idle" | "sending" | "error">("idle");

  if (names.length === 0) return null;

  async function generateAll() {
    setState("sending");
    try {
      // Refetch right before so we don't re-draft anyone another tab/person just created.
      const res = await fetch("/api/campaigns");
      const data = await res.json();
      const existing: Campaign[] = res.ok ? data.campaigns ?? [] : [];
      const toDraft = names.filter((name) => !existing.find((c) => c.notes === winbackTag(name)));

      for (const name of toDraft) {
        const r = await fetch("/api/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campaignName: `Win-back: ${name}`,
            channel: "Email",
            audience: "",
            subject: personalize(WINBACK_EMAIL_TEMPLATE.subject, name),
            messageBody: personalize(WINBACK_EMAIL_TEMPLATE.messageBody, name),
            notes: winbackTag(name),
          }),
        });
        if (!r.ok) throw new Error();
      }
      await onDone();
      setState("idle");
    } catch {
      setState("error");
    }
  }

  if (missingCount === 0) {
    return <span className="text-sm font-medium text-neutral-500">All drafts generated</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={generateAll}
        disabled={state === "sending"}
        className="inline-flex items-center gap-2 rounded-full bg-neutral-900 text-white px-4 py-2 text-sm font-medium hover:bg-neutral-800 disabled:opacity-50"
      >
        <Sparkles className="h-4 w-4" strokeWidth={2} />
        {state === "sending" ? "Drafting…" : `Generate all (${missingCount})`}
      </button>
      {state === "error" && <p className="text-sm text-red-600">Something went wrong — try again.</p>}
    </div>
  );
}

function WinbackDraftCell({
  name,
  hasEmail,
  campaign,
  onGenerated,
  onOpen,
}: {
  name: string;
  hasEmail: boolean;
  campaign: Campaign | undefined;
  onGenerated: () => Promise<void>;
  onOpen: () => void;
}) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(false);

  if (!campaign) {
    return (
      <button
        onClick={async () => {
          setGenerating(true);
          setError(false);
          try {
            const res = await fetch("/api/campaigns", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                campaignName: `Win-back: ${name}`,
                channel: "Email",
                audience: "",
                subject: personalize(WINBACK_EMAIL_TEMPLATE.subject, name),
                messageBody: personalize(WINBACK_EMAIL_TEMPLATE.messageBody, name),
                notes: winbackTag(name),
              }),
            });
            if (!res.ok) throw new Error();
            await onGenerated();
          } catch {
            setError(true);
          } finally {
            setGenerating(false);
          }
        }}
        disabled={generating}
        className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
      >
        <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
        {generating ? "Drafting…" : error ? "Retry" : "Generate draft"}
      </button>
    );
  }

  const isNew = campaign.status === "Draft";

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={onOpen}
        className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
      >
        {isNew && <span className="h-1.5 w-1.5 rounded-full bg-neutral-900" />}
        {isNew ? "New draft" : campaign.status}
      </button>
      {isNew && !hasEmail && <span className="text-xs text-amber-600" title="No email on file">no email</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Past Due
// ---------------------------------------------------------------------------

type PastDueMember = {
  row: number;
  name: string;
  email: string;
  totalOverdue: string;
  paymentAmount: string;
  lastAttempt: string;
  emailSubject: string;
  emailBody: string;
  emailStatus: string;
  sentAt: string;
  notes: string;
};

const PAST_DUE_EMAIL_TEMPLATE = {
  subject: "A quick reminder about your Lyfe Boxing account, {First name}",
  messageBody:
    "Hey {First name},\n\nJust a friendly reminder that your account has an outstanding balance. If you've already taken care of this, thank you — please disregard.\n\nIf not, you can update your payment method or settle the balance whenever works for you. Let us know if anything's off or you'd like to talk it through.\n\nLyfe Boxing",
};

function rowToPastDueMember(r: SheetRow): PastDueMember {
  return {
    row: r._row,
    name: findField(r, "contact", "name", "member"),
    email: findField(r, "email"),
    totalOverdue: findField(r, "total overdue"),
    paymentAmount: findField(r, "payment amount"),
    lastAttempt: findField(r, "last attempt"),
    emailSubject: findField(r, "email subject"),
    emailBody: findField(r, "email body"),
    emailStatus: findField(r, "email status"),
    sentAt: findField(r, "sent at"),
    notes: findField(r, "notes"),
  };
}

export function PastDueView() {
  return (
    <div className="max-w-5xl">
      <PageHeader title="Past Due" subtitle="Members behind on payment, with the draft collections email for each." tool="Google Sheets (Past Due)" />
      <SheetGate tab="Past Due">{(rows) => <PastDueList rows={rows} />}</SheetGate>
    </div>
  );
}

function PastDueList({ rows }: { rows: SheetRow[] }) {
  const [openRow, setOpenRow] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [members, setMembers] = useState<PastDueMember[]>(() => rows.map(rowToPastDueMember));
  const emailFor = useContactEmails();

  const refetch = useCallback(async () => {
    try {
      const res = await fetch(`/api/lyfe-data?tab=${encodeURIComponent("Past Due")}`);
      const data = await res.json();
      if (res.ok) setMembers((data.rows ?? []).map(rowToPastDueMember));
    } catch {
      // keep showing what we have
    }
  }, []);

  const totalOwed = members.reduce((sum, m) => sum + parseMoney(m.totalOverdue), 0);
  usePollWhileQueued(members.some((m) => m.emailStatus === "Queued"), refetch);
  const { pageItems, page, setPage, totalPages } = usePagination(members);
  const open = openRow !== null ? members.find((m) => m.row === openRow) : undefined;
  const openEmail = open ? emailFor(open.name, open.email) : "";

  function patchMember(row: number, changes: Partial<PastDueMember>) {
    setMembers((prev) => prev.map((m) => (m.row === row ? { ...m, ...changes } : m)));
  }

  const missingDraftCount = members.filter((m) => !m.emailBody).length;
  const selectableRows = pageItems
    .filter((m) => (m.emailStatus === "Draft" || m.emailStatus === "Error" || !m.emailStatus) && m.emailBody && emailFor(m.name, m.email))
    .map((m) => m.row);

  function toggleSelected(row: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(row)) next.delete(row);
      else next.add(row);
      return next;
    });
  }

  async function generateAllDrafts() {
    const missing = members.filter((m) => !m.emailBody);
    for (const m of missing) {
      const res = await fetch("/api/past-due/draft", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          row: m.row,
          subject: personalize(PAST_DUE_EMAIL_TEMPLATE.subject, m.name),
          messageBody: personalize(PAST_DUE_EMAIL_TEMPLATE.messageBody, m.name),
        }),
      });
      if (res.ok) {
        patchMember(m.row, {
          emailSubject: personalize(PAST_DUE_EMAIL_TEMPLATE.subject, m.name),
          emailBody: personalize(PAST_DUE_EMAIL_TEMPLATE.messageBody, m.name),
          emailStatus: "Draft",
        });
      }
    }
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <Stat label="Members past due" value={members.length} />
        <Stat label="Total overdue amount" value={`$${totalOwed.toLocaleString()}`} />
      </div>

      {members.length > 0 && (
        <div className="flex items-center justify-end gap-2 mb-4">
          {selected.size > 0 && (
            <PastDueSendSelectedButton
              members={members}
              selectedRows={selected}
              emailFor={emailFor}
              onDone={async () => {
                setSelected(new Set());
                await refetch();
              }}
            />
          )}
          <GenerateAllButton missingCount={missingDraftCount} onGenerate={generateAllDrafts} />
        </div>
      )}

      {members.length === 0 ? (
        <Card className="text-center py-10 text-sm text-neutral-500">No one is past due.</Card>
      ) : (
        <>
          <div className="space-y-3">
            {pageItems.map((m) => (
              <Card key={m.row} className={m.emailBody && (!m.emailStatus || m.emailStatus === "Draft") ? "bg-amber-50/40" : ""}>
                <div className="flex items-center gap-3">
                  {selectableRows.includes(m.row) && (
                    <input
                      type="checkbox"
                      checked={selected.has(m.row)}
                      onChange={() => toggleSelected(m.row)}
                      className="rounded border-neutral-300"
                    />
                  )}
                  <div className="flex-1 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-neutral-900">{m.name || "Unnamed member"}</p>
                      <p className="text-sm text-neutral-600 mt-0.5">{emailFor(m.name, m.email) || "No email"}</p>
                      <p className="text-sm text-neutral-500 mt-0.5">
                        {m.totalOverdue ? `$${parseMoney(m.totalOverdue).toLocaleString()}` : "Amount not set"} overdue
                        {m.lastAttempt ? ` · last attempt ${m.lastAttempt}` : ""}
                      </p>
                    </div>
                    <PastDueDraftCell
                      member={m}
                      hasEmail={!!emailFor(m.name, m.email)}
                      onGenerated={(c) => patchMember(m.row, c)}
                      onOpen={() => setOpenRow(m.row)}
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <PaginationControls page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}

      {open && (
        <DraftModal
          title={`Collections email for ${open.name}`}
          subtitle="Past Due"
          to={openEmail}
          subject={open.emailSubject}
          body={open.emailBody}
          showSubject
          statusLabel={open.emailStatus || "Draft"}
          sentAt={open.sentAt}
          notes={open.notes}
          sendDisabledReason={openEmail ? undefined : "This contact has no email on file — can't send."}
          locked={open.emailStatus === "Queued" || open.emailStatus === "Sent"}
          onClose={() => setOpenRow(null)}
          onPoll={refetch}
          onSave={async (subject, messageBody) => {
            const res = await fetch("/api/past-due/draft", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ row: open.row, subject, messageBody }),
            });
            if (!res.ok) throw new Error(await apiError(res, "Failed to save."));
            patchMember(open.row, { emailSubject: subject, emailBody: messageBody, emailStatus: "Draft" });
          }}
          onSend={async (subject, messageBody) => {
            const res = await fetch("/api/past-due/draft", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ row: open.row, email: openEmail, subject, messageBody }),
            });
            const message = res.ok ? null : await apiError(res, "Failed to send.");
            if (res.ok || res.status === 502 || res.status === 503) {
              patchMember(open.row, { emailSubject: subject, emailBody: messageBody, emailStatus: "Queued" });
            }
            await refetch();
            if (message) throw new Error(message);
          }}
        />
      )}
    </>
  );
}

function PastDueSendSelectedButton({
  members,
  selectedRows,
  emailFor,
  onDone,
}: {
  members: PastDueMember[];
  selectedRows: Set<number>;
  emailFor: (name: string, rowEmail?: string) => string;
  onDone: () => Promise<void>;
}) {
  const [state, setState] = useState<"idle" | "sending" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function sendSelected() {
    setState("sending");
    setError(null);
    try {
      const items = [...selectedRows]
        .map((row) => members.find((m) => m.row === row))
        .filter((m): m is PastDueMember => !!m && !!emailFor(m.name, m.email))
        .map((m) => ({ row: m.row, email: emailFor(m.name, m.email), subject: m.emailSubject, messageBody: m.emailBody }));

      if (items.length === 0) throw new Error("Nothing to send — check that each person has an email.");

      const res = await fetch("/api/past-due/send-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const failed = res.ok ? null : await apiError(res, "Something went wrong — try again.");
      await onDone();
      if (failed) throw new Error(failed);
      setState("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong — try again.");
      setState("error");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={sendSelected}
        disabled={state === "sending"}
        className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
      >
        <Send className="h-3.5 w-3.5" strokeWidth={2} />
        {state === "sending" ? "Sending…" : `Send selected (${selectedRows.size})`}
      </button>
      {state === "error" && error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

function GenerateAllButton({ missingCount, onGenerate }: { missingCount: number; onGenerate: () => Promise<void> }) {
  const [state, setState] = useState<"idle" | "sending" | "error">("idle");

  if (missingCount === 0) {
    return <span className="text-sm font-medium text-neutral-500">All drafts generated</span>;
  }

  return (
    <div className="flex items-center gap-2">
      {state === "error" && <p className="text-sm text-red-600">Something went wrong — try again.</p>}
      <button
        onClick={async () => {
          setState("sending");
          try {
            await onGenerate();
            setState("idle");
          } catch {
            setState("error");
          }
        }}
        disabled={state === "sending"}
        className="inline-flex items-center gap-2 rounded-full bg-neutral-900 text-white px-4 py-2 text-sm font-medium hover:bg-neutral-800 disabled:opacity-50"
      >
        <Sparkles className="h-4 w-4" strokeWidth={2} />
        {state === "sending" ? "Drafting…" : `Generate all (${missingCount})`}
      </button>
    </div>
  );
}

function PastDueDraftCell({
  member,
  hasEmail,
  onGenerated,
  onOpen,
}: {
  member: PastDueMember;
  hasEmail: boolean;
  onGenerated: (changes: Partial<PastDueMember>) => void;
  onOpen: () => void;
}) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(false);

  if (!member.emailBody) {
    return (
      <button
        onClick={async () => {
          setGenerating(true);
          setError(false);
          try {
            const subject = personalize(PAST_DUE_EMAIL_TEMPLATE.subject, member.name);
            const messageBody = personalize(PAST_DUE_EMAIL_TEMPLATE.messageBody, member.name);
            const res = await fetch("/api/past-due/draft", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ row: member.row, subject, messageBody }),
            });
            if (!res.ok) throw new Error();
            onGenerated({ emailSubject: subject, emailBody: messageBody, emailStatus: "Draft" });
          } catch {
            setError(true);
          } finally {
            setGenerating(false);
          }
        }}
        disabled={generating}
        className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
      >
        <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
        {generating ? "Drafting…" : error ? "Retry" : "Generate draft"}
      </button>
    );
  }

  const isNew = !member.emailStatus || member.emailStatus === "Draft";

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={onOpen}
        className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
      >
        {isNew && <span className="h-1.5 w-1.5 rounded-full bg-neutral-900" />}
        {isNew ? "New draft" : member.emailStatus}
      </button>
      {isNew && !hasEmail && <span className="text-xs text-amber-600" title="No email on file">no email</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export function PaymentsView() {
  return (
    <div className="max-w-6xl">
      <PageHeader title="Payments (Oct 1-25)" subtitle="All payment activity in the period." tool="Google Sheets (Payments)" />
      <SheetGate tab="Payments (Oct 1-25)">{(rows) => <PaymentsTable rows={rows} />}</SheetGate>
    </div>
  );
}

function PaymentsTable({ rows }: { rows: SheetRow[] }) {
  const mapped = rows.map((r) => ({
    date: findField(r, "date"),
    memberName: findField(r, "member name", "name"),
    status: findField(r, "status"),
    item: findField(r, "item"),
    paymentType: findField(r, "payment type"),
    amountPaid: findField(r, "amount paid", "amount"),
  }));
  const total = mapped.reduce((sum, p) => sum + parseMoney(p.amountPaid), 0);
  const { pageItems, page, setPage, totalPages } = usePagination(mapped);

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <Stat label="Payments" value={mapped.length} />
        <Stat label="Total collected" value={`$${total.toLocaleString()}`} />
      </div>
      {mapped.length === 0 ? (
        <Card className="text-center py-10 text-sm text-neutral-500">No payments in this period yet.</Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-400 border-b border-neutral-100">
                <th className="py-2 pr-4 font-medium">Date</th>
                <th className="py-2 pr-4 font-medium">Member</th>
                <th className="py-2 pr-4 font-medium">Item</th>
                <th className="py-2 pr-4 font-medium">Type</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((p, i) => (
                <tr key={i} className="border-b border-neutral-50 last:border-0 align-top">
                  <td className="py-2.5 pr-4 text-neutral-500 whitespace-nowrap">{p.date || "—"}</td>
                  <td className="py-2.5 pr-4 text-neutral-900 font-medium whitespace-nowrap">{p.memberName || "—"}</td>
                  <td className="py-2.5 pr-4 text-neutral-500 max-w-xs break-words">{p.item || "—"}</td>
                  <td className="py-2.5 pr-4 text-neutral-500 whitespace-nowrap">{p.paymentType || "—"}</td>
                  <td className="py-2.5 pr-4 whitespace-nowrap">
                    <Badge>{p.status || "—"}</Badge>
                  </td>
                  <td className="py-2.5 pr-4 text-neutral-900 font-medium whitespace-nowrap">{p.amountPaid || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <PaginationControls page={page} totalPages={totalPages} onChange={setPage} />
        </Card>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// SMS Conversations
// ---------------------------------------------------------------------------

export function SmsView() {
  return (
    <div className="max-w-5xl">
      <PageHeader title="SMS Conversations" subtitle="Recent text message activity." tool="Google Sheets (SMS Conversations)" />
      <SheetGate tab="SMS Conversations">{(rows) => <SmsList rows={rows} />}</SheetGate>
    </div>
  );
}

function SmsList({ rows }: { rows: SheetRow[] }) {
  const [query, setQuery] = useState("");

  const mapped = rows.map((r) => ({
    date: findField(r, "date"),
    contactName: findField(r, "contact name", "name"),
    text: findField(r, "text", "message"),
  }));
  const q = query.trim().toLowerCase();
  const filtered = q ? mapped.filter((s) => s.contactName.toLowerCase().includes(q) || s.text.toLowerCase().includes(q)) : mapped;
  const { pageItems, page, setPage, totalPages } = usePagination(filtered);

  return (
    <>
      <input
        type="text"
        placeholder="Search by name or message..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full sm:w-80 mb-4 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
      />
      <p className="text-sm text-neutral-400 mb-3">
        Showing {filtered.length} of {mapped.length} conversations
      </p>
      {filtered.length === 0 ? (
        <Card className="text-center py-10 text-sm text-neutral-500">No conversations found.</Card>
      ) : (
        <>
          <div className="space-y-2">
            {pageItems.map((s, i) => (
              <Card key={i}>
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium text-neutral-900 text-sm">{s.contactName || "Unknown"}</p>
                  <p className="text-xs text-neutral-400">{s.date}</p>
                </div>
                <p className="text-sm text-neutral-600">{s.text}</p>
              </Card>
            ))}
          </div>
          <PaginationControls page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------

export function ContactsView() {
  return (
    <div className="max-w-4xl">
      <PageHeader title="Contacts" subtitle="Everyone in the Spark contacts list." tool="Google Sheets (Contacts)" />
      <SheetGate tab="Contacts">{(rows) => <ContactsList rows={rows} />}</SheetGate>
    </div>
  );
}

function ContactsList({ rows }: { rows: SheetRow[] }) {
  const [query, setQuery] = useState("");

  const mapped = rows.map((r) => ({
    name: findField(r, "name"),
    email: findField(r, "email"),
    phone: findField(r, "phone"),
    contactType: findField(r, "contact type", "type"),
  }));
  const q = query.trim().toLowerCase();
  const filtered = q ? mapped.filter((c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)) : mapped;
  const { pageItems, page, setPage, totalPages } = usePagination(filtered);

  return (
    <>
      <input
        type="text"
        placeholder="Search by name or email..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full sm:w-80 mb-4 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
      />
      <p className="text-sm text-neutral-400 mb-3">
        Showing {filtered.length} of {mapped.length} contacts
      </p>
      {filtered.length === 0 ? (
        <Card className="text-center py-10 text-sm text-neutral-500">No contacts found.</Card>
      ) : (
        <>
          <div className="space-y-2">
            {pageItems.map((c, i) => (
              <Card key={i} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-neutral-900 text-sm">{c.name || "Unnamed"}</p>
                  <p className="text-sm text-neutral-500 mt-0.5">
                    {c.email || "No email"} {c.phone ? `· ${c.phone}` : ""}
                  </p>
                </div>
                {c.contactType && <Badge>{c.contactType}</Badge>}
              </Card>
            ))}
          </div>
          <PaginationControls page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Reports Index (static — just links into Spark's own reports, no member data)
// ---------------------------------------------------------------------------

export function ReportsView() {
  const sections = useMemo(() => {
    const bySection = new Map<string, typeof reportsIndex>();
    for (const r of reportsIndex) {
      if (!bySection.has(r.section)) bySection.set(r.section, []);
      bySection.get(r.section)!.push(r);
    }
    return Array.from(bySection.entries());
  }, []);

  return (
    <div className="max-w-4xl">
      <PageHeader title="Reports Index" subtitle="Links into Spark's own report pages." />
      <div className="space-y-6">
        {sections.map(([section, items]) => (
          <div key={section}>
            <p className="text-sm font-semibold text-neutral-900 mb-2">{section}</p>
            <Card className="divide-y divide-neutral-100">
              {items.map((r) => (
                <div key={r.urlPath} className="py-2 text-sm text-neutral-600">
                  {r.name}
                </div>
              ))}
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Campaigns
// ---------------------------------------------------------------------------

type Campaign = {
  row: number;
  campaignName: string;
  channel: string;
  audience: string;
  subject: string;
  messageBody: string;
  status: string;
  recipients: string;
  sentAt: string;
  notes: string;
};

const audienceOptions = [
  "All active members",
  "Past due members",
  "Basic Boxer 2x",
  "Knock Out Boxer Unlimited",
  "Light Boxer 1x",
  "Knock Out Boxer 3x",
  "1 Day Boxing Program",
  "Ignite Pro | Adult Boxing | 3-Class Trial for $19.95",
];

function personalCampaignName(notes: string): string {
  if (notes.startsWith("winback:")) return notes.slice("winback:".length);
  if (notes.startsWith("trial:") && !notes.startsWith("trial-sms:")) return notes.slice("trial:".length);
  return "";
}

export function CampaignsView() {
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [sendingRow, setSendingRow] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [openRow, setOpenRow] = useState<number | null>(null);
  const emailFor = useContactEmails();

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/campaigns");
      const data = await res.json();
      if (!res.ok) {
        setNotConfigured(!!data.notConfigured);
        setError(data.error ?? "Failed to load campaigns.");
        return;
      }
      setCampaigns(data.campaigns);
      setError(null);
      setNotConfigured(false);
    } catch {
      setError("Failed to load campaigns.");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount, the standard pattern for client-rendered pages with no server-fetched data
    load();
  }, [load]);

  const { pageItems: pagedCampaigns, page, setPage, totalPages } = usePagination(campaigns ?? []);
  usePollWhileQueued(!!campaigns?.some((c) => c.status === "Queued"), load);

  function emailForCampaign(c: Campaign): string {
    const name = personalCampaignName(c.notes);
    if (!name) return "n/a";
    return emailFor(name);
  }

  function canQueue(c: Campaign): boolean {
    if (c.status !== "Draft" && c.status !== "Error") return false;
    const name = personalCampaignName(c.notes);
    if (!name) return true;
    return !!emailFor(name);
  }

  async function handleSend(c: Campaign) {
    setSendingRow(c.row);
    setSendError(null);
    try {
      const res = await fetch("/api/campaigns/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ row: c.row, subject: c.subject, messageBody: c.messageBody }),
      });
      if (!res.ok) {
        setSendError(await apiError(res, "Failed to queue campaign."));
      }
      await load();
    } finally {
      setSendingRow(null);
    }
  }

  function toggleSelected(row: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(row)) next.delete(row);
      else next.add(row);
      return next;
    });
  }

  const openCampaign = campaigns?.find((c) => c.row === openRow);

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Campaigns"
        subtitle="Edit a draft, then send it. Send saves the message, marks the row Queued, and tells Grok to deliver it."
        tool="Google Sheets (Campaigns)"
      />

      <div className="flex items-center justify-end gap-2 mb-6">
        {selected.size > 0 && (
          <button
            onClick={async () => {
              const items = (campaigns ?? [])
                .filter((c) => selected.has(c.row) && canQueue(c))
                .map((c) => ({ row: c.row, subject: c.subject, messageBody: c.messageBody }));
              if (items.length === 0) {
                setSendError("Nothing to send — win-back and trial drafts need an email on file.");
                return;
              }
              setSendingRow(-1);
              setSendError(null);
              try {
                const res = await fetch("/api/campaigns/send-bulk", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ items }),
                });
                if (!res.ok) setSendError(await apiError(res, "Failed to queue the selected campaigns."));
                setSelected(new Set());
                await load();
              } finally {
                setSendingRow(null);
              }
            }}
            disabled={sendingRow !== null}
            className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" strokeWidth={2} />
            {sendingRow === -1 ? "Sending…" : `Send selected (${selected.size})`}
          </button>
        )}
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-full bg-neutral-900 text-white px-4 py-2 text-sm font-medium hover:bg-neutral-800"
        >
          {showForm ? "Cancel" : "New campaign"}
        </button>
      </div>

      {showForm && (
        <NewCampaignForm
          onCreated={async () => {
            setShowForm(false);
            await load();
          }}
        />
      )}

      {notConfigured && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-800">
            Campaigns aren&apos;t wired up yet — the Google service account needs edit access to the sheet, and its credentials
            need to be set as environment variables on this deployment.
          </p>
        </Card>
      )}
      {error && !notConfigured && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <p className="text-sm text-red-700">{error}</p>
        </Card>
      )}
      {sendError && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <p className="text-sm text-red-700">{sendError}</p>
        </Card>
      )}

      {campaigns && campaigns.length === 0 && !error && <p className="text-sm text-neutral-400">No campaigns yet. Create one above.</p>}

      <div className="space-y-3">
        {pagedCampaigns.map((c) => {
          const locked = c.status === "Sending" || c.status === "Sent" || c.status === "Queued";
          const queueable = canQueue(c);
          const personalName = personalCampaignName(c.notes);
          const missingEmail = !!personalName && !emailForCampaign(c);
          const isNew = c.status === "Draft";
          return (
            <Card key={c.row} className={isNew ? "bg-amber-50/40" : ""}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  {queueable && (
                    <input
                      type="checkbox"
                      checked={selected.has(c.row)}
                      onChange={() => toggleSelected(c.row)}
                      className="mt-3 rounded border-neutral-300"
                    />
                  )}
                  <div className="h-9 w-9 rounded-full bg-neutral-50 border border-neutral-200 flex items-center justify-center shrink-0">
                    {c.channel === "SMS" ? (
                      <MessageSquare className="h-4 w-4 text-neutral-500" strokeWidth={1.75} />
                    ) : (
                      <Mail className="h-4 w-4 text-neutral-500" strokeWidth={1.75} />
                    )}
                  </div>
                  <div>
                    <p className="text-base font-semibold text-neutral-900">
                      {isNew && <span className="inline-block h-1.5 w-1.5 rounded-full bg-neutral-900 mr-2 align-middle" />}
                      {c.campaignName}
                    </p>
                    <p className="text-sm text-neutral-500 mt-0.5">
                      {c.channel} · {c.audience || "No audience yet"}
                      {c.recipients && ` · ${c.recipients} recipients`}
                    </p>
                    {c.channel === "Email" && c.subject && <p className="text-sm text-neutral-400 mt-1">Subject: {c.subject}</p>}
                    <p className="text-sm text-neutral-600 mt-2 max-w-xl break-words">{c.messageBody}</p>
                    {c.sentAt && <p className="text-xs text-neutral-400 mt-2">Sent at {c.sentAt}</p>}
                    {(c.status === "Sent" || c.status === "Error") && c.notes && (
                      <p className="text-xs text-neutral-500 mt-1">Notes: {c.notes}</p>
                    )}
                    {missingEmail && <p className="text-xs text-amber-700 mt-1">No email on file — Send is disabled.</p>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <Badge>{c.status || "Draft"}</Badge>
                  <button
                    onClick={() => setOpenRow(c.row)}
                    className="rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                  >
                    {isNew ? "New draft" : "Open"}
                  </button>
                  {queueable && (
                    <button
                      onClick={() => handleSend(c)}
                      disabled={sendingRow === c.row}
                      className="rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                    >
                      {sendingRow === c.row ? "Queuing…" : "Send"}
                    </button>
                  )}
                  {c.status === "Queued" && (
                    <button
                      onClick={() => handleSend(c)}
                      disabled={sendingRow === c.row}
                      className="rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                    >
                      {sendingRow === c.row ? "Notifying…" : "Notify again"}
                    </button>
                  )}
                  {locked && <p className="text-xs text-neutral-400">Locked</p>}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      <PaginationControls page={page} totalPages={totalPages} onChange={setPage} />

      {openCampaign && (
        <DraftModal
          title={openCampaign.campaignName}
          subtitle="Campaigns"
          to={personalCampaignName(openCampaign.notes) ? emailForCampaign(openCampaign) : undefined}
          subject={openCampaign.subject}
          body={openCampaign.messageBody}
          showSubject={openCampaign.channel !== "SMS"}
          statusLabel={openCampaign.status || "Draft"}
          sentAt={openCampaign.sentAt}
          notes={openCampaign.notes}
          sendDisabledReason={
            personalCampaignName(openCampaign.notes) && !emailForCampaign(openCampaign)
              ? "This contact has no email on file — can't send."
              : undefined
          }
          locked={openCampaign.status === "Sending" || openCampaign.status === "Sent" || openCampaign.status === "Queued"}
          onClose={() => setOpenRow(null)}
          onPoll={load}
          onSave={async (subject, messageBody) => {
            const res = await fetch("/api/campaigns", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ row: openCampaign.row, subject, messageBody }),
            });
            if (!res.ok) throw new Error(await apiError(res, "Failed to save."));
            await load();
          }}
          onSend={async (subject, messageBody) => {
            const res = await fetch("/api/campaigns/send", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ row: openCampaign.row, subject, messageBody }),
            });
            const message = res.ok ? null : await apiError(res, "Failed to send.");
            await load();
            if (message) throw new Error(message);
          }}
        />
      )}
    </div>
  );
}

function NewCampaignForm({ onCreated }: { onCreated: () => void }) {
  const [campaignName, setCampaignName] = useState("");
  const [channel, setChannel] = useState<"Email" | "SMS">("Email");
  const [audience, setAudience] = useState(audienceOptions[0]);
  const [subject, setSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const smsLength = messageBody.length;
  const overSmsLimit = channel === "SMS" && smsLength > 145;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (channel === "Email" && !subject.trim()) {
      setError("Subject is required for email campaigns.");
      return;
    }
    if (overSmsLimit) {
      setError(`SMS message is ${smsLength} characters — keep it under 145.`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignName, channel, audience, subject, messageBody }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create campaign.");
        return;
      }
      onCreated();
    } catch {
      setError("Failed to create campaign.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="mb-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-neutral-700 block mb-1">Campaign name</label>
          <input
            required
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
            placeholder="e.g. October upgrade push"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-neutral-700 block mb-1">Channel</label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as "Email" | "SMS")}
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
            >
              <option value="Email">Email</option>
              <option value="SMS">SMS</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700 block mb-1">Audience</label>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
            >
              {audienceOptions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>

        {channel === "Email" && (
          <div>
            <label className="text-sm font-medium text-neutral-700 block mb-1">Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
              placeholder="Use {First name} for personalization"
            />
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-neutral-700">Message body</label>
            <span className="text-xs text-neutral-400">Use {"{First name}"} for personalization</span>
            {channel === "SMS" && (
              <span className={`text-xs ${overSmsLimit ? "text-red-600 font-medium" : "text-neutral-400"}`}>{smsLength} / 145</span>
            )}
          </div>
          <textarea
            required
            rows={5}
            value={messageBody}
            onChange={(e) => setMessageBody(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
          />
          {overSmsLimit && <p className="text-xs text-red-600 mt-1">This will send as more than one SMS segment.</p>}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-neutral-900 text-white px-5 py-2.5 text-sm font-medium hover:bg-neutral-800 disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Save as draft"}
        </button>
      </form>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Trial Conversion
// ---------------------------------------------------------------------------

const TRIAL_MEMBERSHIP_NAMES = ["1 Day Boxing Program", "Ignite Pro | Adult Boxing | 3-Class Trial for $19.95"];

const TRIAL_UPGRADE_EMAIL_TEMPLATE = {
  subject: "Ready to make it official, {First name}?",
  messageBody:
    "Hey {First name},\n\nYou're a few days into training with us and we love having you in the gym.\n\nIf you're feeling it, now's a great time to lock in a membership — Basic Boxer 2x or Knock Out Boxer Unlimited both give you room to keep building momentum. [OFFER]\n\nLet us know and we'll get you set up.\n\nLyfe Boxing",
};

const TRIAL_SMS_TEMPLATE =
  "Great first class, {First name}! How are you feeling? We're pumped to have you training with us at Lyfe Boxing.";

function trialTag(name: string): string {
  return `trial:${name}`;
}

export function TrialConversionView() {
  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Trial Conversion"
        subtitle="Trial and 1-Day Boxing Program members to follow up with and convert to a full membership."
        tool="Google Sheets (All Memberships) + Campaigns"
      />
      <SheetGate tab="All Memberships">
        {(rows) => {
          const trialMembers = rows
            .map((r) => ({ name: findField(r, "name"), email: findField(r, "email"), membership: findField(r, "membership") }))
            .filter((m) => TRIAL_MEMBERSHIP_NAMES.includes(m.membership));
          return <TrialTable trialMembers={trialMembers} />;
        }}
      </SheetGate>
    </div>
  );
}

function TrialTable({ trialMembers }: { trialMembers: { name: string; email: string; membership: string }[] }) {
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [openDraftFor, setOpenDraftFor] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const emailFor = useContactEmails();

  const loadCampaigns = useCallback(async () => {
    try {
      const res = await fetch("/api/campaigns");
      const data = await res.json();
      if (res.ok) setCampaigns(data.campaigns);
    } catch {
      // the rest of the page still works without this
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount, the standard pattern for client-rendered pages with no server-fetched data
    loadCampaigns();
  }, [loadCampaigns]);

  const missingDraftCount = campaigns
    ? trialMembers.filter((m) => !campaigns.find((c) => c.notes === trialTag(m.name))).length
    : trialMembers.length;
  const trialQueued = !!campaigns?.some((c) => c.notes.startsWith("trial:") && !c.notes.startsWith("trial-sms:") && c.status === "Queued");
  usePollWhileQueued(trialQueued, loadCampaigns);

  const openMember = trialMembers.find((m) => m.name === openDraftFor);
  const openCampaign = openDraftFor ? campaigns?.find((c) => c.notes === trialTag(openDraftFor)) : undefined;
  const openEmail = openMember ? emailFor(openMember.name, openMember.email) : "";

  const selectableNames = trialMembers
    .filter((m) => {
      const camp = campaigns?.find((c) => c.notes === trialTag(m.name));
      return camp && (camp.status === "Draft" || camp.status === "Error") && emailFor(m.name, m.email);
    })
    .map((m) => m.name);

  function toggleSelected(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  if (trialMembers.length === 0) {
    return <Card className="text-center py-10 text-sm text-neutral-500">No trial members right now.</Card>;
  }

  return (
    <>
      <Card className="mb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-semibold text-neutral-900">
              {trialMembers.length} trial member{trialMembers.length === 1 ? "" : "s"}
            </p>
            <p className="text-sm text-neutral-500 mt-1">
              Generate an upgrade-offer email per contact below (plus a first-class SMS), edit, then send.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selected.size > 0 && (
              <SendSelectedButton
                campaigns={campaigns ?? []}
                selectedNames={selected}
                emailFor={emailFor}
                tagFn={trialTag}
                onDone={async () => {
                  setSelected(new Set());
                  await loadCampaigns();
                }}
              />
            )}
            <GenerateAllTrialButton members={trialMembers} missingCount={missingDraftCount} onDone={loadCampaigns} />
          </div>
        </div>
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-neutral-400 border-b border-neutral-100">
              <th className="py-2 pr-2 font-medium w-6"></th>
              <th className="py-2 pr-4 font-medium">Name</th>
              <th className="py-2 pr-4 font-medium">Membership</th>
              <th className="py-2 pr-4 font-medium">Conversion draft</th>
            </tr>
          </thead>
          <tbody>
            {trialMembers.map((m, i) => {
              const canSelect = selectableNames.includes(m.name);
              const draftStatus = campaigns?.find((c) => c.notes === trialTag(m.name))?.status;
              return (
                <tr
                  key={`${m.name}-${i}`}
                  className={`border-b border-neutral-50 last:border-0 align-top ${draftStatus === "Draft" ? "bg-amber-50/60" : ""}`}
                >
                  <td className="py-2.5 pr-2">
                    {canSelect && (
                      <input
                        type="checkbox"
                        checked={selected.has(m.name)}
                        onChange={() => toggleSelected(m.name)}
                        className="rounded border-neutral-300"
                      />
                    )}
                  </td>
                  <td className="py-2.5 pr-4 text-neutral-900 font-medium whitespace-nowrap">{m.name}</td>
                  <td className="py-2.5 pr-4 text-neutral-500 whitespace-nowrap">{m.membership}</td>
                  <td className="py-2.5 pr-4 whitespace-nowrap">
                    <TrialDraftCell
                      name={m.name}
                      hasEmail={!!emailFor(m.name, m.email)}
                      campaign={campaigns?.find((c) => c.notes === trialTag(m.name))}
                      onGenerated={loadCampaigns}
                      onOpen={() => setOpenDraftFor(m.name)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {openDraftFor && openMember && openCampaign && (
        <DraftModal
          title={`Upgrade email for ${openMember.name}`}
          subtitle="Trial Conversion"
          to={openEmail}
          subject={openCampaign.subject}
          body={openCampaign.messageBody}
          showSubject
          statusLabel={openCampaign.status}
          sentAt={openCampaign.sentAt}
          notes={openCampaign.notes}
          sendDisabledReason={openEmail ? undefined : "This contact has no email on file — can't send."}
          locked={openCampaign.status === "Sending" || openCampaign.status === "Sent" || openCampaign.status === "Queued"}
          onClose={() => setOpenDraftFor(null)}
          onPoll={loadCampaigns}
          onSave={async (subject, messageBody) => {
            const res = await fetch("/api/campaigns", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ row: openCampaign.row, subject, messageBody }),
            });
            if (!res.ok) throw new Error(await apiError(res, "Failed to save."));
            await loadCampaigns();
          }}
          onSend={async (subject, messageBody) => {
            const res = await fetch("/api/campaigns/send", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ row: openCampaign.row, subject, messageBody }),
            });
            const message = res.ok ? null : await apiError(res, "Failed to send.");
            await loadCampaigns();
            if (message) throw new Error(message);
          }}
        />
      )}
    </>
  );
}

async function generateTrialDrafts(name: string): Promise<void> {
  // Upgrade email — the one shown/edited/sent in the UI.
  const emailRes = await fetch("/api/campaigns", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      campaignName: `Trial upgrade: ${name}`,
      channel: "Email",
      audience: "",
      subject: personalize(TRIAL_UPGRADE_EMAIL_TEMPLATE.subject, name),
      messageBody: personalize(TRIAL_UPGRADE_EMAIL_TEMPLATE.messageBody, name),
      notes: trialTag(name),
    }),
  });
  if (!emailRes.ok) throw new Error();

  // First-class SMS — drafted alongside for Alex to review in Campaigns, not individually managed here.
  await fetch("/api/campaigns", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      campaignName: `Trial first-class SMS: ${name}`,
      channel: "SMS",
      audience: "",
      messageBody: personalize(TRIAL_SMS_TEMPLATE, name),
      notes: `trial-sms:${name}`,
    }),
  });
}

function GenerateAllTrialButton({
  members,
  missingCount,
  onDone,
}: {
  members: { name: string }[];
  missingCount: number;
  onDone: () => Promise<void>;
}) {
  const [state, setState] = useState<"idle" | "sending" | "error">("idle");

  async function generateAll() {
    setState("sending");
    try {
      const res = await fetch("/api/campaigns");
      const data = await res.json();
      const existing: Campaign[] = res.ok ? data.campaigns ?? [] : [];
      const toDraft = members.filter((m) => !existing.find((c) => c.notes === trialTag(m.name)));
      for (const m of toDraft) await generateTrialDrafts(m.name);
      await onDone();
      setState("idle");
    } catch {
      setState("error");
    }
  }

  if (missingCount === 0) {
    return <span className="text-sm font-medium text-neutral-500">All drafts generated</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={generateAll}
        disabled={state === "sending"}
        className="inline-flex items-center gap-2 rounded-full bg-neutral-900 text-white px-4 py-2 text-sm font-medium hover:bg-neutral-800 disabled:opacity-50"
      >
        <Sparkles className="h-4 w-4" strokeWidth={2} />
        {state === "sending" ? "Drafting…" : `Generate all (${missingCount})`}
      </button>
      {state === "error" && <p className="text-sm text-red-600">Something went wrong — try again.</p>}
    </div>
  );
}

function TrialDraftCell({
  name,
  hasEmail,
  campaign,
  onGenerated,
  onOpen,
}: {
  name: string;
  hasEmail: boolean;
  campaign: Campaign | undefined;
  onGenerated: () => Promise<void>;
  onOpen: () => void;
}) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(false);

  if (!campaign) {
    return (
      <button
        onClick={async () => {
          setGenerating(true);
          setError(false);
          try {
            await generateTrialDrafts(name);
            await onGenerated();
          } catch {
            setError(true);
          } finally {
            setGenerating(false);
          }
        }}
        disabled={generating}
        className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
      >
        <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
        {generating ? "Drafting…" : error ? "Retry" : "Generate draft"}
      </button>
    );
  }

  const isNew = campaign.status === "Draft";

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={onOpen}
        className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
      >
        {isNew && <span className="h-1.5 w-1.5 rounded-full bg-neutral-900" />}
        {isNew ? "New draft" : campaign.status}
      </button>
      {isNew && !hasEmail && <span className="text-xs text-amber-600" title="No email on file">no email</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// At Risk / Upgrade Candidates — depend on an "Attendance" tab that doesn't
// exist in the sheet yet (Name, Membership, Last Attended, Classes Last 30
// Days). These stay as empty states until that tab is added.
// ---------------------------------------------------------------------------

function AttendanceWaitingCard({ title, body }: { title: string; body: string }) {
  return (
    <Card className="text-center py-12">
      <AlertCircle className="h-8 w-8 text-neutral-300 mx-auto" strokeWidth={1.5} />
      <p className="font-semibold text-neutral-900 mt-3">{title}</p>
      <p className="text-sm text-neutral-500 mt-1 max-w-sm mx-auto">{body}</p>
    </Card>
  );
}

export function AtRiskView() {
  return (
    <div className="max-w-5xl">
      <PageHeader title="At Risk" subtitle="Members who haven't attended in 10+ days." tool="Google Sheets (Attendance) + Campaigns" />
      <AttendanceWaitingCard
        title={`Waiting on the "Attendance" tab`}
        body={`Once Attendance (Name, Membership, Last Attended, Classes Last 30 Days) is added to the sheet, this page will list anyone who hasn't attended in 10+ days and let you draft a "we miss you" SMS and email for them.`}
      />
    </div>
  );
}

export function UpgradeCandidatesView() {
  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Upgrade Candidates"
        subtitle="Light Boxer 1x and Basic Boxer 2x members attending more than their plan allows."
        tool="Google Sheets (Attendance) + Campaigns"
      />
      <AttendanceWaitingCard
        title={`Waiting on the "Attendance" tab`}
        body="Once Attendance has Classes Last 30 Days, this page will flag Light Boxer 1x / Basic Boxer 2x members over their monthly allowance and let you draft an upgrade-to-Unlimited email."
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Weekly Summary
// ---------------------------------------------------------------------------

export function WeeklySummaryView() {
  const memberships = useSheetTab("All Memberships");
  const cancelled = useSheetTab("Cancelled (Oct)");
  const pastDue = useSheetTab("Past Due");
  const payments = useSheetTab("Payments (Oct 1-25)");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  useEffect(() => {
    fetch("/api/campaigns")
      .then((r) => r.json())
      .then((d) => setCampaigns(d.campaigns ?? []))
      .catch(() => setCampaigns([]));
  }, []);

  const loading = [memberships.state, cancelled.state, pastDue.state, payments.state].some((s) => s.status === "loading");
  const notConfigured = [memberships.state, cancelled.state, pastDue.state, payments.state].some((s) => s.status === "not-configured");
  const firstError = [memberships.state, cancelled.state, pastDue.state, payments.state].find((s) => s.status === "error");

  return (
    <div className="max-w-4xl">
      <PageHeader title="Weekly Summary" subtitle="A clean, screenshot-ready recap to send to Alex." />
      {loading && <LoadingCard />}
      {!loading && notConfigured && <SetupNeeded />}
      {!loading && !notConfigured && firstError && firstError.status === "error" && <SheetErrorCard message={firstError.message} />}
      {!loading && !notConfigured && !firstError && (
        <WeeklySummaryCard
          membershipRows={memberships.state.status === "ok" ? memberships.state.rows : []}
          cancelledRows={cancelled.state.status === "ok" ? cancelled.state.rows : []}
          pastDueRows={pastDue.state.status === "ok" ? pastDue.state.rows : []}
          paymentRows={payments.state.status === "ok" ? payments.state.rows : []}
          campaigns={campaigns}
        />
      )}
    </div>
  );
}

function WeeklySummaryCard({
  membershipRows,
  cancelledRows,
  pastDueRows,
  paymentRows,
  campaigns,
}: {
  membershipRows: SheetRow[];
  cancelledRows: SheetRow[];
  pastDueRows: SheetRow[];
  paymentRows: SheetRow[];
  campaigns: Campaign[];
}) {
  // Captured once on mount — a static reference point for "within the last 7 days".
  const [now] = useState(() => Date.now());
  const withinWeek = useMemo(() => (d: Date | null) => d !== null && now - d.getTime() <= 7 * 86_400_000, [now]);

  const newMembers = useMemo(
    () => membershipRows.filter((m) => withinWeek(parseSlashDate(findField(m, "signed")))).length,
    [membershipRows, withinWeek]
  );
  const cancellationsThisWeek = useMemo(
    () => cancelledRows.filter((c) => withinWeek(parseSlashDate(findField(c, "cancelled date", "cancelled")))).length,
    [cancelledRows, withinWeek]
  );
  const revenue = useMemo(
    () =>
      paymentRows
        .filter((p) => withinWeek(parseSlashDate(findField(p, "date"))))
        .reduce((sum, p) => sum + parseMoney(findField(p, "amount paid", "amount")), 0),
    [paymentRows, withinWeek]
  );
  const pastDueTotal = useMemo(() => pastDueRows.reduce((sum, p) => sum + parseMoney(findField(p, "total overdue")), 0), [pastDueRows]);
  const campaignsSentThisWeek = useMemo(
    () => campaigns.filter((c) => (c.status === "Sent" || c.status === "Queued") && withinWeek(parseSlashDate(c.sentAt))),
    [campaigns, withinWeek]
  );

  return (
    <Card>
      <p className="text-xs text-neutral-400 uppercase tracking-wide font-medium">
        Week ending {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
      </p>
      <p className="text-xl font-semibold text-neutral-900 mt-1">Lyfe Boxing — Weekly Summary</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-5">
        <Stat label="New members" value={newMembers} />
        <Stat label="Cancellations" value={cancellationsThisWeek} />
        <Stat label="Revenue (period)" value={`$${revenue.toLocaleString()}`} />
        <Stat label="Past due total" value={`$${pastDueTotal.toLocaleString()}`} />
        <Stat label="Members past due" value={pastDueRows.length} />
        <Stat label="Campaigns sent" value={campaignsSentThisWeek.length} />
      </div>

      <div className="mt-6 pt-5 border-t border-neutral-100">
        <p className="text-sm font-semibold text-neutral-900 mb-2">Top at-risk members</p>
        <p className="text-sm text-neutral-400">Add the Attendance tab to see this.</p>
      </div>

      <div className="mt-6 pt-5 border-t border-neutral-100">
        <p className="text-sm font-semibold text-neutral-900 mb-2">Campaigns sent this week</p>
        {campaignsSentThisWeek.length === 0 ? (
          <p className="text-sm text-neutral-400">None yet.</p>
        ) : (
          <ul className="text-sm text-neutral-600 space-y-1">
            {campaignsSentThisWeek.map((c) => (
              <li key={c.row}>
                {c.campaignName} ({c.channel}) — {c.status}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Calendar / Appointment booking
// ---------------------------------------------------------------------------

export function CalendarView() {
  const [showForm, setShowForm] = useState(false);
  const [justBooked, setJustBooked] = useState<{ date: string; time: string; type: string; member: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const date = String(form.get("date") ?? "");
    const time = String(form.get("time") ?? "");
    const type = String(form.get("type") ?? "");
    const member = String(form.get("member") ?? "");
    const coach = String(form.get("coach") ?? "");

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, time, type, member, coach }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNotConfigured(!!data.notConfigured || !!data.tabMissing);
        setError(data.error ?? "Failed to book appointment.");
        return;
      }
      setJustBooked((prev) => [{ date, time, type, member }, ...prev]);
      setShowForm(false);
      (e.target as HTMLFormElement).reset();
    } catch {
      setError("Failed to book appointment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl">
      <PageHeader title="Calendar" subtitle="Appointments and booking requests." tool="Google Sheets (Appointments)" />

      <div className="mb-6">
        <button
          onClick={() => setShowForm((s) => !s)}
          className="inline-flex items-center gap-2 rounded-full bg-neutral-900 text-white px-4 py-2 text-sm font-medium hover:bg-neutral-800"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          {showForm ? "Cancel" : "Book appointment"}
        </button>
      </div>

      {showForm && (
        <Card className="mb-6 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-neutral-700 block mb-1">Date</label>
                <input name="date" type="date" required className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10" />
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-700 block mb-1">Time</label>
                <input name="time" type="time" required className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-700 block mb-1">Type</label>
              <input name="type" required placeholder="e.g. Trial class, Coaching call" className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-neutral-700 block mb-1">Member</label>
                <input name="member" required className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10" />
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-700 block mb-1">Coach (optional)</label>
                <input name="coach" className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10" />
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-neutral-900 text-white px-5 py-2.5 text-sm font-medium hover:bg-neutral-800 disabled:opacity-50"
            >
              {submitting ? "Booking…" : "Request appointment"}
            </button>
            <p className="text-xs text-neutral-400">Saved with Status &quot;Requested&quot; — your assistant enters it into Spark.</p>
          </form>
        </Card>
      )}

      {notConfigured && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-800">
            Booking isn&apos;t wired up yet — add an &quot;Appointments&quot; tab (Date, Time, Type, Member, Coach, Status) to the
            sheet and make sure the service account has edit access.
          </p>
        </Card>
      )}

      {justBooked.length > 0 && (
        <div className="space-y-3 mb-6">
          {justBooked.map((a, i) => (
            <Card key={i} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-neutral-900">
                  {a.date} at {a.time} · {a.type}
                </p>
                <p className="text-sm text-neutral-500 mt-0.5">{a.member}</p>
              </div>
              <Badge>Requested</Badge>
            </Card>
          ))}
        </div>
      )}

      {justBooked.length === 0 && (
        <Card className="text-center py-10">
          <CalendarIcon className="h-8 w-8 text-neutral-300 mx-auto" strokeWidth={1.5} />
          <p className="font-semibold text-neutral-900 mt-3">No appointments booked yet</p>
          <p className="text-sm text-neutral-500 mt-1 max-w-sm mx-auto">
            Once the Appointments tab exists in the sheet, booked appointments will show here, grouped by date.
          </p>
        </Card>
      )}
    </div>
  );
}
