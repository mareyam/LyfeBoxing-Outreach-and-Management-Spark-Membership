"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ArrowUp,
  BookOpen,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Mail,
  MessageSquare,
  Plus,
  Search,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { Avatar, Badge, Card, PageHeader, Stat } from "@/components/ui";
import SequenceBuilder, { type SequenceStep } from "@/components/lyfeBoxing/SequenceBuilder";

const PAGE_SIZE = 20;

/** Paginates any array client-side; resets to page 1 whenever the input list changes length (e.g. a new search). */
export function usePagination<T>(items: T[], pageSize: number = PAGE_SIZE) {
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
export function usePollWhileQueued(active: boolean, reload: () => void) {
  useEffect(() => {
    if (!active) return;
    const interval = setInterval(reload, 15_000);
    return () => clearInterval(interval);
  }, [active, reload]);
}

export async function apiError(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    return data?.error || fallback;
  } catch {
    return fallback;
  }
}

export function PaginationControls({
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
export function DraftModal({
  title,
  subtitle,
  to,
  subject,
  body,
  showSubject,
  smsBody,
  showSms,
  audience,
  showAudience,
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
  /** SMS text for a channel that also/only sends SMS (Campaigns' "Both"/"SMS"). */
  smsBody?: string;
  showSms?: boolean;
  /** Audience text (general Campaigns only) — who this will send to. */
  audience?: string;
  showAudience?: boolean;
  locked: boolean;
  statusLabel?: string;
  sentAt?: string;
  notes?: string;
  sendDisabledReason?: string;
  onClose: () => void;
  onSave: (subject: string, body: string, smsBody?: string, audience?: string) => Promise<void>;
  onSend: (subject: string, body: string, smsBody?: string, audience?: string) => Promise<void>;
  /** Called every 15s while statusLabel === "Queued" so the modal picks up Grok's Sent/Error update. */
  onPoll?: () => Promise<void>;
}) {
  const [editSubject, setEditSubject] = useState(subject);
  const [editBody, setEditBody] = useState(body);
  const [editSmsBody, setEditSmsBody] = useState(smsBody ?? "");
  const [editAudience, setEditAudience] = useState(audience ?? "");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirmingSend, setConfirmingSend] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dirty =
    editSubject !== subject ||
    editBody !== body ||
    (showSms && editSmsBody !== (smsBody ?? "")) ||
    (showAudience && editAudience !== (audience ?? ""));
  const overSmsLimit = showSms && editSmsBody.length > 160;

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
      await onSave(editSubject, editBody, showSms ? editSmsBody : undefined, showAudience ? editAudience : undefined);
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
      await onSend(editSubject, editBody, showSms ? editSmsBody : undefined, showAudience ? editAudience : undefined);
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

        {showAudience && locked && (
          <div className="mb-3">
            <p className="text-xs text-neutral-400 mb-1">Audience</p>
            <p className="text-sm text-neutral-800">{audience || "Not set"}</p>
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
            {body && <p className="text-xs text-neutral-400 mb-1">{showSms ? "Email" : "Message"}</p>}
            {body && <p className="text-sm text-neutral-700 whitespace-pre-line leading-relaxed">{body}</p>}
            {showSms && (
              <div className={body ? "mt-3" : ""}>
                <p className="text-xs text-neutral-400 mb-1">SMS</p>
                <p className="text-sm text-neutral-700 whitespace-pre-line leading-relaxed">{smsBody || "(no SMS text)"}</p>
              </div>
            )}
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
            {showAudience && (
              <div>
                <label className="text-xs font-medium text-neutral-500 block mb-1">Audience — who this sends to</label>
                <input
                  value={editAudience}
                  onChange={(e) => setEditAudience(e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                />
              </div>
            )}
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
            {(body || !showSms || showSubject) && (
              <div>
                <label className="text-xs font-medium text-neutral-500 block mb-1">{showSms ? "Email" : "Message"}</label>
                <textarea
                  rows={8}
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                />
              </div>
            )}

            {showSms && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-neutral-500">SMS</label>
                  <span className={`text-xs ${overSmsLimit ? "text-red-600 font-medium" : "text-neutral-400"}`}>
                    {editSmsBody.length} / 160
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={editSmsBody}
                  onChange={(e) => setEditSmsBody(e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                />
                {overSmsLimit && <p className="text-xs text-red-600 mt-1">This will send as more than one SMS segment.</p>}
              </div>
            )}

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
                  disabled={!!sendDisabledReason || overSmsLimit}
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
 * One AI call from a free-text brief, reused for every contact: the brief
 * generates ONE template (with a literal {First name} token), which each
 * page then personalizes per contact. Used by the brief-driven "Generate"
 * flows on Win-back, Past Due, Trial Conversion, At Risk, and Upgrade
 * Candidates so drafting stays O(1) AI calls, not one per contact.
 */
async function generateBriefDraft(opts: {
  brief: string;
  channel: "Email" | "SMS" | "Both";
  contextHint: string;
}): Promise<{ subject: string; body: string; smsBody: string }> {
  const res = await fetch("/api/campaigns/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ brief: `${opts.contextHint} ${opts.brief}`.trim(), channel: opts.channel }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Couldn't generate a draft.");
  return { subject: data.subject ?? "", body: data.body ?? "", smsBody: data.smsBody ?? "" };
}

function BriefInput({
  brief,
  setBrief,
  placeholder,
}: {
  brief: string;
  setBrief: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="mb-3">
      <label className="text-xs font-medium text-neutral-500 block mb-1">What should the draft say?</label>
      <input
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
      />
    </div>
  );
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

/** Names currently on the Leads tab — used to resolve a "New leads" sequence audience into an actual recipient list. */
function useLeadNames() {
  const [names, setNames] = useState<string[]>([]);
  useEffect(() => {
    fetch(`/api/lyfe-data?tab=${encodeURIComponent("Leads")}`)
      .then((r) => r.json())
      .then((d: { rows?: SheetRow[] }) => {
        setNames((d.rows ?? []).map((r) => findField(r, "name").trim()).filter(Boolean));
      })
      .catch(() => setNames([]));
  }, []);
  return names;
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
    <div className="max-w-[1600px]">
      <div className="mb-2 flex items-center gap-1.5 text-sm text-neutral-400">
        <Link href="/lyfe-boxing" className="hover:text-blue-600">
          Home
        </Link>
        <span>›</span>
        <span className="text-neutral-600 font-medium">Memberships</span>
      </div>
      <div className="mb-6">
        <h1 className="text-[28px] leading-tight font-semibold text-neutral-900 tracking-tight">Memberships</h1>
        <p className="text-base text-neutral-500 mt-2 max-w-2xl">Live roster from the Spark Memberships sheet, grouped by plan.</p>
        <span className="inline-flex items-center gap-1.5 text-sm text-blue-600 font-medium mt-3">
          <CalendarIcon className="h-3.5 w-3.5" strokeWidth={1.75} /> Google Sheets Source
        </span>
      </div>
      <Link href="/lyfe-boxing/playbook" className="group block mb-6">
        <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 p-5 shadow-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-white/15 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-white" strokeWidth={1.75} />
            </div>
            <div>
              <p className="font-semibold text-white">Playbook</p>
              <p className="text-sm text-indigo-100 mt-0.5">Tone, offers, prices and FAQs that every AI-drafted message pulls from.</p>
            </div>
          </div>
          <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-indigo-700 group-hover:bg-indigo-50">
            Edit playbook <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
          </span>
        </div>
      </Link>
      <SheetGate tab="All Memberships">{(rows) => <MembershipsByPlan rows={rows} />}</SheetGate>
    </div>
  );
}

type MappedMember = {
  name: string;
  membership: string;
  expires: string;
  overdue: string;
  nextPayment: string;
  method: string;
  staff: string;
  signed: string;
};

const PLAN_BAR_COLORS = ["bg-indigo-500", "bg-blue-500", "bg-amber-400", "bg-pink-400", "bg-emerald-400"];
const PLAN_DOT_COLORS = ["bg-indigo-500", "bg-blue-500", "bg-amber-400", "bg-pink-400", "bg-emerald-400", "bg-neutral-300"];

function PlanBreakdownChart({ planCounts, totalPlans }: { planCounts: [string, number][]; totalPlans: number }) {
  const top5 = planCounts.slice(0, 5);
  const otherCount = planCounts.slice(5).reduce((sum, [, count]) => sum + count, 0);
  const segments = otherCount > 0 ? [...top5, ["Other", otherCount] as [string, number]] : top5;
  const total = segments.reduce((sum, [, count]) => sum + count, 0) || 1;

  return (
    <Card className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-base font-semibold text-neutral-900">Members by plan</p>
        <p className="text-sm text-neutral-400">Top 5 of {totalPlans}</p>
      </div>
      <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-neutral-100">
        {segments.map(([label, count], i) => (
          <div
            key={label}
            className={i < 5 ? PLAN_BAR_COLORS[i] : "bg-neutral-300"}
            style={{ width: `${(count / total) * 100}%` }}
            title={`${label} · ${count}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-4">
        {segments.map(([label, count], i) => (
          <span key={label} className="inline-flex items-center gap-1.5 text-xs text-neutral-600">
            <span className={`h-2 w-2 rounded-full ${PLAN_DOT_COLORS[i] ?? "bg-neutral-300"}`} />
            {label} · {count}
          </span>
        ))}
      </div>
    </Card>
  );
}

type MembershipsSort = "name-asc" | "plan-asc" | "overdue-desc";

function MembershipsByPlan({ rows }: { rows: SheetRow[] }) {
  const [query, setQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [planFilter, setPlanFilter] = useState("");
  const [expiresFilter, setExpiresFilter] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [nextPaymentFilter, setNextPaymentFilter] = useState("");
  const [staffFilter, setStaffFilter] = useState("");
  const [sortBy, setSortBy] = useState<MembershipsSort>("name-asc");

  const mapped: MappedMember[] = rows.map((r) => ({
    name: findField(r, "name", "member", "member name"),
    membership: findField(r, "membership") || "Uncategorized",
    expires: findField(r, "expires"),
    overdue: findField(r, "overdue"),
    nextPayment: findField(r, "next payment"),
    method: findField(r, "method"),
    staff: findField(r, "staff"),
    signed: findField(r, "signed"),
  }));

  const activeCount = mapped.filter((m) => m.expires.toLowerCase().includes("open")).length;
  const overdueMembers = mapped.filter((m) => parseMoney(m.overdue) > 0);
  const overdueCount = overdueMembers.length;
  const overdueTotal = overdueMembers.reduce((sum, m) => sum + parseMoney(m.overdue), 0);

  // eslint-disable-next-line react-hooks/purity -- "joined this month" is a point-in-time read of the clock, not cached state
  const now = new Date();
  const joinedThisMonth = mapped.filter((m) => {
    const d = parseSlashDate(m.signed);
    return d !== null && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;

  const planCounts = countBy(mapped, (m) => m.membership);
  const programGroups = new Set(planCounts.map(([plan]) => plan.split(" ")[0])).size;

  const planOptions = Array.from(new Set(mapped.map((m) => m.membership))).sort();
  const expiresOptions = Array.from(new Set(mapped.map((m) => m.expires).filter(Boolean))).sort();
  const nextPaymentOptions = Array.from(new Set(mapped.map((m) => m.nextPayment).filter(Boolean))).sort();
  const staffOptions = Array.from(new Set(mapped.map((m) => m.staff).filter(Boolean))).sort();

  const q = query.trim().toLowerCase();
  const filtered = mapped.filter((m) => {
    if (q) {
      const matches = m.name.toLowerCase().includes(q) || m.membership.toLowerCase().includes(q);
      if (!matches) return false;
    }
    if (planFilter && m.membership !== planFilter) return false;
    if (expiresFilter && m.expires !== expiresFilter) return false;
    if (overdueOnly && parseMoney(m.overdue) <= 0) return false;
    if (nextPaymentFilter && m.nextPayment !== nextPaymentFilter) return false;
    if (staffFilter && m.staff !== staffFilter) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "name-asc":
        return a.name.localeCompare(b.name);
      case "plan-asc":
        return a.membership.localeCompare(b.membership);
      case "overdue-desc":
        return parseMoney(b.overdue) - parseMoney(a.overdue);
      default:
        return 0;
    }
  });

  const { pageItems, page, setPage, totalPages } = usePagination(sorted);

  const activeFilterCount = [planFilter, expiresFilter, nextPaymentFilter, staffFilter].filter(Boolean).length + (overdueOnly ? 1 : 0);
  function clearFilters() {
    setPlanFilter("");
    setExpiresFilter("");
    setOverdueOnly(false);
    setNextPaymentFilter("");
    setStaffFilter("");
  }

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-neutral-500">Total members</p>
          <p className="text-[26px] leading-none font-semibold text-neutral-900 mt-2">{mapped.length}</p>
          {joinedThisMonth > 0 && (
            <p className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 mt-2">
              <ArrowUp className="h-3 w-3" strokeWidth={2.5} /> {joinedThisMonth} joined this month
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-neutral-500">Active plans</p>
          <p className="text-[26px] leading-none font-semibold text-neutral-900 mt-2">{planCounts.length}</p>
          <p className="text-xs text-neutral-400 mt-2">across {programGroups} programs</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-neutral-500">Open-ended</p>
          <p className="text-[26px] leading-none font-semibold text-neutral-900 mt-2">{activeCount}</p>
          <p className="text-xs text-neutral-400 mt-2">
            {mapped.length ? Math.round((activeCount / mapped.length) * 100) : 0}% of members
          </p>
        </div>
        <button
          onClick={() => {
            setOverdueOnly(true);
            setFilterOpen(false);
          }}
          className="text-left rounded-2xl border border-red-200 bg-white p-5 shadow-sm hover:border-red-300"
        >
          <p className="text-sm text-red-600">Overdue</p>
          <p className="text-[26px] leading-none font-semibold text-red-600 mt-2">{overdueCount}</p>
          <p className="inline-flex items-center gap-1 text-xs font-medium text-red-600 mt-2">
            ${overdueTotal.toLocaleString()} · Review <ArrowRight className="h-3 w-3" strokeWidth={2.5} />
          </p>
        </button>
      </div>

      <PlanBreakdownChart planCounts={planCounts} totalPlans={planCounts.length} />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <p className="text-base font-semibold text-neutral-900">Member List</p>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setFilterOpen((o) => !o)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                <Filter className="h-4 w-4 text-neutral-400" strokeWidth={1.75} />
                Filter
                {activeFilterCount > 0 && (
                  <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-blue-600 text-[10px] font-semibold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              {filterOpen && (
                <div className="absolute right-0 top-full mt-1.5 z-10 w-72 rounded-lg border border-neutral-200 bg-white shadow-md p-4 space-y-3">
                  <div>
                    <label className="text-xs font-medium text-neutral-500 block mb-1">Plan</label>
                    <select
                      value={planFilter}
                      onChange={(e) => setPlanFilter(e.target.value)}
                      className="w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-sm text-neutral-900"
                    >
                      <option value="">All plans</option>
                      {planOptions.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-neutral-500 block mb-1">Expires</label>
                    <select
                      value={expiresFilter}
                      onChange={(e) => setExpiresFilter(e.target.value)}
                      className="w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-sm text-neutral-900"
                    >
                      <option value="">Any</option>
                      {expiresOptions.map((e) => (
                        <option key={e} value={e}>
                          {e}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-xs font-medium text-neutral-500">
                      <input
                        type="checkbox"
                        checked={overdueOnly}
                        onChange={(e) => setOverdueOnly(e.target.checked)}
                        className="rounded border-neutral-300"
                      />
                      Overdue only
                    </label>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-neutral-500 block mb-1">Next Payment</label>
                    <select
                      value={nextPaymentFilter}
                      onChange={(e) => setNextPaymentFilter(e.target.value)}
                      className="w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-sm text-neutral-900"
                    >
                      <option value="">Any</option>
                      {nextPaymentOptions.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-neutral-500 block mb-1">Staff</label>
                    <select
                      value={staffFilter}
                      onChange={(e) => setStaffFilter(e.target.value)}
                      className="w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-sm text-neutral-900"
                    >
                      <option value="">All staff</option>
                      {staffOptions.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  {activeFilterCount > 0 && (
                    <button onClick={clearFilters} className="text-xs font-medium text-blue-600 hover:text-blue-700">
                      Clear filters
                    </button>
                  )}
                </div>
              )}
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as MembershipsSort)}
              className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700"
            >
              <option value="name-asc">Name (A–Z)</option>
              <option value="plan-asc">Plan (A–Z)</option>
              <option value="overdue-desc">Overdue (High–Low)</option>
            </select>
            <div className="relative w-56 shrink-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" strokeWidth={1.75} />
              <input
                type="text"
                placeholder="Search by name or plan..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 bg-white pl-9 pr-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
              />
            </div>
          </div>
        </div>
        <table className="w-full text-sm table-fixed">
          <thead>
            <tr className="text-left text-xs font-semibold text-neutral-400 uppercase tracking-wide border-b border-neutral-100 bg-neutral-50/60">
              <th className="py-3 pr-4 w-[28%]">Member</th>
              <th className="py-3 pr-4 w-[18%]">Plan</th>
              <th className="py-3 pr-4 w-[14%]">Expires</th>
              <th className="py-3 pr-4 w-[14%]">Overdue</th>
              <th className="py-3 pr-4 w-[14%]">Next Payment</th>
              <th className="py-3 pr-4 w-[12%]">Staff</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((m, i) => (
              <tr key={`${m.name}-${i}`} className="border-b border-neutral-50 last:border-0 align-top">
                <td className="py-3 pr-4">
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Avatar name={m.name} size="sm" />
                    <span className="min-w-0">
                      <span className="block text-neutral-900 font-semibold truncate">{m.name || "—"}</span>
                    </span>
                  </span>
                </td>
                <td className="py-3 pr-4">
                  <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium ${categoryColor(m.membership)}`}>
                    {m.membership}
                  </span>
                </td>
                <td className="py-3 pr-4 text-neutral-700 truncate">{m.expires || "—"}</td>
                <td className="py-3 pr-4 text-neutral-700 truncate">{m.overdue || "—"}</td>
                <td className="py-3 pr-4 text-neutral-700 truncate">{m.nextPayment || "—"}</td>
                <td className="py-3 pr-4 text-neutral-500 truncate">{m.staff || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between pt-4 mt-1 border-t border-neutral-100">
          <p className="text-sm text-neutral-500">
            Showing {pageItems.length} of {filtered.length} members
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              className="h-8 w-8 flex items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2} />
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
              className="h-8 w-8 flex items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </div>
      </Card>
    </>
  );
}

// ---------------------------------------------------------------------------
// All Contacts
// ---------------------------------------------------------------------------

export function AllContactsView() {
  return (
    <div className="max-w-[1600px]">
      <div className="mb-2 flex items-center gap-1.5 text-sm text-neutral-400">
        <Link href="/lyfe-boxing" className="hover:text-blue-600">
          Home
        </Link>
        <span>›</span>
        <span className="text-neutral-600 font-medium">All Contacts</span>
      </div>
      <div className="mb-6">
        <h1 className="text-[28px] leading-tight font-semibold text-neutral-900 tracking-tight">All Contacts</h1>
        <p className="text-base text-neutral-500 mt-2 max-w-2xl">Everyone in the Spark Contacts sheet.</p>
        <span className="inline-flex items-center gap-1.5 text-sm text-blue-600 font-medium mt-3">
          <CalendarIcon className="h-3.5 w-3.5" strokeWidth={1.75} /> Google Sheets Source
        </span>
      </div>
      <SheetGate tab="Contacts">{(rows) => <ContactsTable rows={rows} />}</SheetGate>
    </div>
  );
}

type ContactsSort = "name-asc" | "name-desc" | "type-asc";

function ContactsTable({ rows }: { rows: SheetRow[] }) {
  const [query, setQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState("");
  const [sortBy, setSortBy] = useState<ContactsSort>("name-asc");

  const mapped = rows.map((r) => ({
    name: findField(r, "name"),
    email: findField(r, "email"),
    phone: findField(r, "mobile phone", "phone"),
    contactType: findField(r, "contact type"),
  }));

  const typeOptions = Array.from(new Set(mapped.map((c) => c.contactType || "Not Assigned"))).sort();

  const q = query.trim().toLowerCase();
  const filtered = mapped.filter((c) => {
    if (q) {
      const matches = c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.contactType.toLowerCase().includes(q);
      if (!matches) return false;
    }
    if (typeFilter && (c.contactType || "Not Assigned") !== typeFilter) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "name-asc":
        return a.name.localeCompare(b.name);
      case "name-desc":
        return b.name.localeCompare(a.name);
      case "type-asc":
        return (a.contactType || "Not Assigned").localeCompare(b.contactType || "Not Assigned");
      default:
        return 0;
    }
  });

  const { pageItems, page, setPage, totalPages } = usePagination(sorted);

  const activeFilterCount = [typeFilter].filter(Boolean).length;
  function clearFilters() {
    setTypeFilter("");
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-base font-semibold text-neutral-900">
          Contact List <span className="text-neutral-400 font-normal">({mapped.length} total)</span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setFilterOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              <Filter className="h-4 w-4 text-neutral-400" strokeWidth={1.75} />
              Filter
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-blue-600 text-[10px] font-semibold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
            {filterOpen && (
              <div className="absolute right-0 top-full mt-1.5 z-10 w-72 rounded-lg border border-neutral-200 bg-white shadow-md p-4 space-y-3">
                <div>
                  <label className="text-xs font-medium text-neutral-500 block mb-1">Contact Type</label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-sm text-neutral-900"
                  >
                    <option value="">All types</option>
                    {typeOptions.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                {activeFilterCount > 0 && (
                  <button onClick={clearFilters} className="text-xs font-medium text-blue-600 hover:text-blue-700">
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as ContactsSort)}
            className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700"
          >
            <option value="name-asc">Name (A–Z)</option>
            <option value="name-desc">Name (Z–A)</option>
            <option value="type-asc">Type (A–Z)</option>
          </select>
          <div className="relative w-56 shrink-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" strokeWidth={1.75} />
            <input
              type="text"
              placeholder="Search contacts..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-white pl-9 pr-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
            />
          </div>
        </div>
      </div>
      <table className="w-full text-sm table-fixed">
        <thead>
          <tr className="text-left text-xs font-semibold text-neutral-400 uppercase tracking-wide border-b border-neutral-100 bg-neutral-50/60">
            <th className="py-3 pr-4 w-[36%]">Contact</th>
            <th className="py-3 pr-4 w-[20%]">Phone</th>
            <th className="py-3 pr-4 w-[20%]">Type</th>
            <th className="py-3 pr-4 w-[24%]">Actions</th>
          </tr>
        </thead>
        <tbody>
          {pageItems.map((c, i) => (
            <tr key={`${c.name}-${i}`} className="border-b border-neutral-50 last:border-0 align-top">
              <td className="py-3 pr-4">
                <span className="flex items-center gap-2.5 min-w-0">
                  <Avatar name={c.name} size="sm" />
                  <span className="min-w-0">
                    <span className="block text-neutral-900 font-semibold truncate">{c.name || "—"}</span>
                    <span className="block text-xs text-neutral-400 truncate">{c.email || "—"}</span>
                  </span>
                </span>
              </td>
              <td className="py-3 pr-4 text-neutral-700 truncate">{c.phone || "—"}</td>
              <td className="py-3 pr-4">
                <span
                  className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium ${categoryColor(
                    c.contactType
                  )}`}
                >
                  {c.contactType || "Not Assigned"}
                </span>
              </td>
              <td className="py-3 pr-4">
                {c.email ? (
                  <span className="text-blue-700 font-semibold text-sm">Contact</span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600">
                    No email
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center justify-between pt-4 mt-1 border-t border-neutral-100">
        <p className="text-sm text-neutral-500">
          Showing {pageItems.length} of {filtered.length} contacts
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          </button>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages}
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Cancelled + Win-back
// ---------------------------------------------------------------------------

const WINBACK_CONTEXT_HINT = "This is a win-back email to a former member who cancelled their membership.";

const CATEGORY_COLORS = [
  "bg-blue-50 text-blue-700",
  "bg-rose-50 text-rose-700",
  "bg-amber-50 text-amber-700",
  "bg-purple-50 text-purple-700",
  "bg-emerald-50 text-emerald-700",
  "bg-indigo-50 text-indigo-700",
  "bg-pink-50 text-pink-700",
];

/** Stable color per category name, cycling through a fixed palette — "Not Assigned" always reads neutral. */
export function categoryColor(category: string): string {
  if (!category || category === "Not Assigned") return "bg-neutral-100 text-neutral-600";
  let hash = 0;
  for (let i = 0; i < category.length; i++) hash = (hash * 31 + category.charCodeAt(i)) >>> 0;
  return CATEGORY_COLORS[hash % CATEGORY_COLORS.length];
}

function winbackTag(name: string): string {
  return `winback:${name}`;
}

/** Counts items by key, sorted highest-first. */
function countBy<T>(items: T[], keyFn: (item: T) => string): [string, number][] {
  const map = new Map<string, number>();
  for (const item of items) {
    const key = keyFn(item);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
}

function FrequencyChart({ title, subtitle, data }: { title: string; subtitle: string; data: [string, number][] }) {
  const max = Math.max(...data.map(([, count]) => count), 1);
  return (
    <Card>
      <p className="text-sm font-semibold text-neutral-900">{title}</p>
      <p className="text-[11px] text-neutral-400 uppercase tracking-wide mb-4">{subtitle}</p>
      <div className="space-y-2.5">
        {data.map(([label, count]) => (
          <div key={label} className="flex items-center gap-2">
            <span className="w-24 shrink-0 text-xs text-neutral-500 truncate text-right" title={label}>
              {label}
            </span>
            <div className="flex-1 h-4 rounded bg-neutral-100 overflow-hidden">
              <div className="h-full rounded bg-indigo-500" style={{ width: `${(count / max) * 100}%` }} />
            </div>
            <span className="w-5 shrink-0 text-xs text-neutral-500">{count}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function CancelledView() {
  return (
    <div className="max-w-[1600px]">
      <SheetGate tab="Cancelled (Oct)">{(rows) => <CancelledTable rows={rows} />}</SheetGate>
    </div>
  );
}

const CANCELLED_MONTHS = ["October 2024", "September 2024", "August 2024"];

/** Only October has a connected sheet right now; the rest are listed but disabled. */
function MonthSelector() {
  const [open, setOpen] = useState(false);
  const selected = CANCELLED_MONTHS[0];

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3.5 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
      >
        <CalendarIcon className="h-4 w-4 text-neutral-400" strokeWidth={1.75} />
        {selected}
        <ChevronDown className={`h-3.5 w-3.5 text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-10 w-44 rounded-lg border border-neutral-200 bg-white shadow-md py-1">
          {CANCELLED_MONTHS.map((month, i) =>
            i === 0 ? (
              <button
                key={month}
                onClick={() => setOpen(false)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50"
              >
                {month}
              </button>
            ) : (
              <div
                key={month}
                title="Coming soon"
                className="px-3 py-2 text-sm text-neutral-300 cursor-not-allowed select-none"
              >
                {month}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

type CancelledSort = "cancelled-desc" | "cancelled-asc" | "signed-desc" | "signed-asc" | "membership-asc" | "category-asc" | "reason-asc";

function CancelledTable({ rows }: { rows: SheetRow[] }) {
  const [query, setQuery] = useState("");
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [openDraftFor, setOpenDraftFor] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [brief, setBrief] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [membershipFilter, setMembershipFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [reasonFilter, setReasonFilter] = useState("");
  const [sortBy, setSortBy] = useState<CancelledSort>("cancelled-desc");
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

  const membershipOptions = Array.from(new Set(mapped.map((c) => c.membership).filter(Boolean))).sort();
  const categoryOptions = Array.from(new Set(mapped.map((c) => c.quitCategory || "Not Assigned"))).sort();
  const reasonOptions = Array.from(new Set(mapped.map((c) => c.reason).filter(Boolean))).sort();

  const reasonCounts = countBy(mapped, (c) => c.quitCategory || "Not Assigned");
  const planCounts = countBy(mapped, (c) => c.membership || "Unknown");

  const q = query.trim().toLowerCase();
  const filtered = mapped.filter((c) => {
    if (q) {
      const email = emailFor(c.name, c.email).toLowerCase();
      const matches = c.name.toLowerCase().includes(q) || email.includes(q) || c.membership.toLowerCase().includes(q) || c.quitCategory.toLowerCase().includes(q);
      if (!matches) return false;
    }
    if (membershipFilter && c.membership !== membershipFilter) return false;
    if (categoryFilter && (c.quitCategory || "Not Assigned") !== categoryFilter) return false;
    if (reasonFilter && c.reason !== reasonFilter) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "cancelled-desc":
        return (parseSlashDate(b.cancelledDate)?.getTime() ?? 0) - (parseSlashDate(a.cancelledDate)?.getTime() ?? 0);
      case "cancelled-asc":
        return (parseSlashDate(a.cancelledDate)?.getTime() ?? 0) - (parseSlashDate(b.cancelledDate)?.getTime() ?? 0);
      case "signed-desc":
        return (parseSlashDate(b.signedDate)?.getTime() ?? 0) - (parseSlashDate(a.signedDate)?.getTime() ?? 0);
      case "signed-asc":
        return (parseSlashDate(a.signedDate)?.getTime() ?? 0) - (parseSlashDate(b.signedDate)?.getTime() ?? 0);
      case "membership-asc":
        return a.membership.localeCompare(b.membership);
      case "category-asc":
        return (a.quitCategory || "Not Assigned").localeCompare(b.quitCategory || "Not Assigned");
      case "reason-asc":
        return a.reason.localeCompare(b.reason);
      default:
        return 0;
    }
  });

  const { pageItems, page, setPage, totalPages } = usePagination(sorted);

  const activeFilterCount = [membershipFilter, categoryFilter, reasonFilter].filter(Boolean).length;
  function clearFilters() {
    setMembershipFilter("");
    setCategoryFilter("");
    setReasonFilter("");
  }

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
      <div className="mb-2 flex items-center gap-1.5 text-sm text-neutral-400">
        <Link href="/lyfe-boxing" className="hover:text-blue-600">
          Home
        </Link>
        <span>›</span>
        <span className="text-neutral-600 font-medium">Cancellations</span>
      </div>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold text-neutral-900 tracking-tight">Cancellations (October)</h1>
          <p className="text-base text-neutral-500 mt-2 max-w-2xl">Analyze reasons and categories for membership cancellations.</p>
          <span className="inline-flex items-center gap-1.5 text-sm text-blue-600 font-medium mt-3">
            <CalendarIcon className="h-3.5 w-3.5" strokeWidth={1.75} /> Google Sheets Source
          </span>
        </div>
        <MonthSelector />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6 items-start">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <p className="text-base font-semibold text-neutral-900">Member List</p>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setFilterOpen((o) => !o)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                <Filter className="h-4 w-4 text-neutral-400" strokeWidth={1.75} />
                Filter
                {activeFilterCount > 0 && (
                  <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-blue-600 text-[10px] font-semibold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              {filterOpen && (
                <div className="absolute right-0 top-full mt-1.5 z-10 w-72 rounded-lg border border-neutral-200 bg-white shadow-md p-4 space-y-3">
                  <div>
                    <label className="text-xs font-medium text-neutral-500 block mb-1">Membership</label>
                    <select
                      value={membershipFilter}
                      onChange={(e) => setMembershipFilter(e.target.value)}
                      className="w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-sm text-neutral-900"
                    >
                      <option value="">All memberships</option>
                      {membershipOptions.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-neutral-500 block mb-1">Category</label>
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-sm text-neutral-900"
                    >
                      <option value="">All categories</option>
                      {categoryOptions.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-neutral-500 block mb-1">Reason</label>
                    <select
                      value={reasonFilter}
                      onChange={(e) => setReasonFilter(e.target.value)}
                      className="w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-sm text-neutral-900"
                    >
                      <option value="">All reasons</option>
                      {reasonOptions.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                  {activeFilterCount > 0 && (
                    <button onClick={clearFilters} className="text-xs font-medium text-blue-600 hover:text-blue-700">
                      Clear filters
                    </button>
                  )}
                </div>
              )}
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as CancelledSort)}
              className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700"
            >
              <option value="cancelled-desc">Cancellation Date (Newest)</option>
              <option value="cancelled-asc">Cancellation Date (Oldest)</option>
              <option value="signed-desc">Signed Date (Newest)</option>
              <option value="signed-asc">Signed Date (Oldest)</option>
              <option value="membership-asc">Membership (A–Z)</option>
              <option value="category-asc">Category (A–Z)</option>
              <option value="reason-asc">Reason (A–Z)</option>
            </select>
            <div className="relative w-56 shrink-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" strokeWidth={1.75} />
              <input
                type="text"
                placeholder="Search members..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 bg-white pl-9 pr-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
              />
            </div>
          </div>
        </div>
        {selected.size > 0 && (
          <div className="flex items-center gap-2 mb-4">
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
          </div>
        )}
        <table className="w-full text-sm table-fixed">
          <thead>
            <tr className="text-left text-xs font-semibold text-neutral-400 uppercase tracking-wide border-b border-neutral-100 bg-neutral-50/60">
              <th className="py-3 pr-2 w-6"></th>
              <th className="py-3 pr-4 w-[32%]">Member</th>
              <th className="py-3 pr-4 w-[24%]">Reason Category</th>
              <th className="py-3 pr-4 w-[20%]">Plan</th>
              <th className="py-3 pr-4 w-[20%]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((c, i) => {
              const canSelect = selectableNames.includes(c.name);
              const hasEmail = !!emailFor(c.name, c.email);
              const campaign = campaigns?.find((camp) => camp.notes === winbackTag(c.name));
              return (
                <tr
                  key={`${c.name}-${i}`}
                  className={`border-b border-neutral-50 last:border-0 align-top ${
                    campaign?.status === "Draft" ? "bg-amber-50/60" : ""
                  }`}
                >
                  <td className="py-3 pr-2">
                    {canSelect && (
                      <input
                        type="checkbox"
                        checked={selected.has(c.name)}
                        onChange={() => toggleSelected(c.name)}
                        className="rounded border-neutral-300"
                      />
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={c.name} size="sm" />
                      <span className="min-w-0">
                        <span className="block text-neutral-900 font-semibold truncate">{c.name || "—"}</span>
                        <span className="block text-xs text-neutral-400 truncate">{emailFor(c.name, c.email) || "—"}</span>
                      </span>
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium ${categoryColor(
                        c.quitCategory
                      )}`}
                    >
                      {c.quitCategory || c.reason || "Not Assigned"}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-neutral-700 truncate">{c.membership || "—"}</td>
                  <td className="py-3 pr-4">
                    {hasEmail ? (
                      <WinbackDraftCell
                        name={c.name}
                        campaign={campaign}
                        brief={brief}
                        onGenerated={loadCampaigns}
                        onOpen={() => setOpenDraftFor(c.name)}
                      />
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600">
                        No email
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="flex items-center justify-between pt-4 mt-1 border-t border-neutral-100">
          <p className="text-sm text-neutral-500">
            Showing {pageItems.length} of {filtered.length} cancellations
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              className="h-8 w-8 flex items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2} />
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
              className="h-8 w-8 flex items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </div>
      </Card>

      <div className="space-y-6">
        <div className="rounded-2xl bg-blue-700 text-white p-5 shadow-sm">
          <span className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold tracking-wide">
            AI CAMPAIGN
          </span>
          <p className="text-lg font-semibold mt-3">Win-back Members</p>
          <p className="text-sm text-blue-100 mt-1">
            {winbackEligible} member{winbackEligible === 1 ? "" : "s"} cancelled 14+ days ago. Generate personalized re-engagement
            drafts to send them automatically.
          </p>
          <label className="text-[11px] font-semibold tracking-wide text-blue-200 block mt-4 mb-1.5">DRAFT GOAL</label>
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder="e.g. Offer a free class..."
            rows={2}
            className="w-full rounded-xl bg-blue-600/60 border border-blue-400/40 px-3 py-2 text-sm text-white placeholder:text-blue-200 focus:outline-none focus:ring-2 focus:ring-white/30 resize-none"
          />
          <div className="mt-4 [&_button]:w-full [&_button]:justify-center [&_button]:bg-white [&_button]:text-blue-700 [&_button]:hover:bg-blue-50">
            <GenerateAllWinbackButton names={eligibleNames} missingCount={missingDraftCount} brief={brief} onDone={loadCampaigns} />
          </div>
        </div>

        <FrequencyChart title="Cancellation Reasons" subtitle="By reason category" data={reasonCounts} />
        <FrequencyChart title="Cancellations by Plan" subtitle="By membership plan" data={planCounts} />
      </div>
      </div>

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
  brief,
  onDone,
}: {
  names: string[];
  missingCount: number;
  brief: string;
  onDone: () => Promise<void>;
}) {
  const [state, setState] = useState<"idle" | "sending" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  if (names.length === 0) return null;

  async function generateAll() {
    if (!brief.trim()) {
      setError("Type what the draft should say first.");
      setState("error");
      return;
    }
    setError(null);
    setState("sending");
    try {
      const draft = await generateBriefDraft({ brief, channel: "Email", contextHint: WINBACK_CONTEXT_HINT });

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
            subject: personalize(draft.subject, name),
            messageBody: personalize(draft.body, name),
            notes: winbackTag(name),
          }),
        });
        if (!r.ok) throw new Error();
      }
      await onDone();
      setState("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong — try again.");
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
      {state === "error" && error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

function WinbackDraftCell({
  name,
  campaign,
  brief,
  onGenerated,
  onOpen,
}: {
  name: string;
  campaign: Campaign | undefined;
  brief: string;
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
            const draft = await generateBriefDraft({ brief, channel: "Email", contextHint: WINBACK_CONTEXT_HINT });
            const res = await fetch("/api/campaigns", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                campaignName: `Win-back: ${name}`,
                channel: "Email",
                audience: "",
                subject: personalize(draft.subject, name),
                messageBody: personalize(draft.body, name),
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
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-800 disabled:opacity-50"
      >
        <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
        {generating ? "Drafting…" : error ? "Retry" : "Generate Draft"}
      </button>
    );
  }

  return (
    <button onClick={onOpen} className="text-sm font-semibold text-blue-700 hover:text-blue-800">
      Generate Draft
    </button>
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

const PAST_DUE_CONTEXT_HINT = "This is a payment reminder email to a member whose account is past due.";

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
    <div className="max-w-[1600px]">
      <div className="mb-2 flex items-center gap-1.5 text-sm text-neutral-400">
        <Link href="/lyfe-boxing" className="hover:text-blue-600">
          Home
        </Link>
        <span>›</span>
        <span className="text-neutral-600 font-medium">Past Due</span>
      </div>
      <div className="mb-6">
        <h1 className="text-[28px] leading-tight font-semibold text-neutral-900 tracking-tight">Past Due</h1>
        <p className="text-base text-neutral-500 mt-2 max-w-2xl">Members behind on payment, with the draft collections email for each.</p>
        <span className="inline-flex items-center gap-1.5 text-sm text-blue-600 font-medium mt-3">
          <CalendarIcon className="h-3.5 w-3.5" strokeWidth={1.75} /> Google Sheets Source
        </span>
      </div>
      <SheetGate tab="Past Due">{(rows) => <PastDueList rows={rows} />}</SheetGate>
    </div>
  );
}

type PastDueSort = "overdue-desc" | "overdue-asc" | "name-asc" | "last-attempt-desc";

function PastDueList({ rows }: { rows: SheetRow[] }) {
  const [openRow, setOpenRow] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [members, setMembers] = useState<PastDueMember[]>(() => rows.map(rowToPastDueMember));
  const [brief, setBrief] = useState("");
  const [query, setQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState<PastDueSort>("overdue-desc");
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

  const statusOptions = Array.from(new Set(members.map((m) => m.emailStatus || "Not Assigned"))).sort();

  const q = query.trim().toLowerCase();
  const filtered = members.filter((m) => {
    if (q) {
      const matches = m.name.toLowerCase().includes(q) || emailFor(m.name, m.email).toLowerCase().includes(q);
      if (!matches) return false;
    }
    if (statusFilter && (m.emailStatus || "Not Assigned") !== statusFilter) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "overdue-desc":
        return parseMoney(b.totalOverdue) - parseMoney(a.totalOverdue);
      case "overdue-asc":
        return parseMoney(a.totalOverdue) - parseMoney(b.totalOverdue);
      case "name-asc":
        return a.name.localeCompare(b.name);
      case "last-attempt-desc":
        return (parseSlashDate(b.lastAttempt)?.getTime() ?? 0) - (parseSlashDate(a.lastAttempt)?.getTime() ?? 0);
      default:
        return 0;
    }
  });

  const { pageItems, page, setPage, totalPages } = usePagination(sorted);

  const activeFilterCount = [statusFilter].filter(Boolean).length;
  function clearFilters() {
    setStatusFilter("");
  }

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
    if (!brief.trim()) throw new Error("Type what the draft should say first.");
    const draft = await generateBriefDraft({ brief, channel: "Email", contextHint: PAST_DUE_CONTEXT_HINT });
    const missing = members.filter((m) => !m.emailBody);
    for (const m of missing) {
      const subject = personalize(draft.subject, m.name);
      const messageBody = personalize(draft.body, m.name);
      const res = await fetch("/api/past-due/draft", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ row: m.row, subject, messageBody }),
      });
      if (res.ok) {
        patchMember(m.row, { emailSubject: subject, emailBody: messageBody, emailStatus: "Draft" });
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
        <Card className="mb-4">
          <BriefInput brief={brief} setBrief={setBrief} placeholder="e.g. a friendly reminder, mention they can update their card online" />
          <div className="flex items-center justify-end gap-2">
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
        </Card>
      )}

      {members.length === 0 ? (
        <Card className="text-center py-10 text-sm text-neutral-500">No one is past due.</Card>
      ) : (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <p className="text-base font-semibold text-neutral-900">Member List</p>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => setFilterOpen((o) => !o)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  <Filter className="h-4 w-4 text-neutral-400" strokeWidth={1.75} />
                  Filter
                  {activeFilterCount > 0 && (
                    <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-blue-600 text-[10px] font-semibold text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
                {filterOpen && (
                  <div className="absolute right-0 top-full mt-1.5 z-10 w-72 rounded-lg border border-neutral-200 bg-white shadow-md p-4 space-y-3">
                    <div>
                      <label className="text-xs font-medium text-neutral-500 block mb-1">Email Status</label>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-sm text-neutral-900"
                      >
                        <option value="">All statuses</option>
                        {statusOptions.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    {activeFilterCount > 0 && (
                      <button onClick={clearFilters} className="text-xs font-medium text-blue-600 hover:text-blue-700">
                        Clear filters
                      </button>
                    )}
                  </div>
                )}
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as PastDueSort)}
                className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700"
              >
                <option value="overdue-desc">Overdue Amount (High–Low)</option>
                <option value="overdue-asc">Overdue Amount (Low–High)</option>
                <option value="name-asc">Name (A–Z)</option>
                <option value="last-attempt-desc">Last Attempt (Newest)</option>
              </select>
              <div className="relative w-56 shrink-0">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" strokeWidth={1.75} />
                <input
                  type="text"
                  placeholder="Search members..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 bg-white pl-9 pr-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                />
              </div>
            </div>
          </div>
          <table className="w-full text-sm table-fixed">
            <thead>
              <tr className="text-left text-xs font-semibold text-neutral-400 uppercase tracking-wide border-b border-neutral-100 bg-neutral-50/60">
                <th className="py-3 pr-2 w-6"></th>
                <th className="py-3 pr-4 w-[30%]">Member</th>
                <th className="py-3 pr-4 w-[16%]">Overdue</th>
                <th className="py-3 pr-4 w-[18%]">Last Attempt</th>
                <th className="py-3 pr-4 w-[16%]">Status</th>
                <th className="py-3 pr-4 w-[20%]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((m) => (
                <tr
                  key={m.row}
                  className={`border-b border-neutral-50 last:border-0 align-top ${
                    m.emailBody && (!m.emailStatus || m.emailStatus === "Draft") ? "bg-amber-50/60" : ""
                  }`}
                >
                  <td className="py-3 pr-2">
                    {selectableRows.includes(m.row) && (
                      <input
                        type="checkbox"
                        checked={selected.has(m.row)}
                        onChange={() => toggleSelected(m.row)}
                        className="rounded border-neutral-300"
                      />
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={m.name} size="sm" />
                      <span className="min-w-0">
                        <span className="block text-neutral-900 font-semibold truncate">{m.name || "Unnamed member"}</span>
                        <span className="block text-xs text-neutral-400 truncate">{emailFor(m.name, m.email) || "—"}</span>
                      </span>
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-neutral-700 truncate">
                    {m.totalOverdue ? `$${parseMoney(m.totalOverdue).toLocaleString()}` : "—"}
                  </td>
                  <td className="py-3 pr-4 text-neutral-500 truncate">{m.lastAttempt || "—"}</td>
                  <td className="py-3 pr-4">
                    <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium ${categoryColor(m.emailStatus)}`}>
                      {m.emailStatus || "Not Assigned"}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    {emailFor(m.name, m.email) ? (
                      <PastDueDraftCell
                        member={m}
                        hasEmail={!!emailFor(m.name, m.email)}
                        brief={brief}
                        onGenerated={(c) => patchMember(m.row, c)}
                        onOpen={() => setOpenRow(m.row)}
                      />
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600">
                        No email
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between pt-4 mt-1 border-t border-neutral-100">
            <p className="text-sm text-neutral-500">
              Showing {pageItems.length} of {filtered.length} members
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className="h-8 w-8 flex items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={2} />
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
                className="h-8 w-8 flex items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <ChevronRight className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          </div>
        </Card>
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
  const [error, setError] = useState<string | null>(null);

  if (missingCount === 0) {
    return <span className="text-sm font-medium text-neutral-500">All drafts generated</span>;
  }

  return (
    <div className="flex items-center gap-2">
      {state === "error" && error && <p className="text-sm text-red-600">{error}</p>}
      <button
        onClick={async () => {
          setState("sending");
          setError(null);
          try {
            await onGenerate();
            setState("idle");
          } catch (e) {
            setError(e instanceof Error ? e.message : "Something went wrong — try again.");
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
  brief,
  onGenerated,
  onOpen,
}: {
  member: PastDueMember;
  hasEmail: boolean;
  brief: string;
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
            const draft = await generateBriefDraft({ brief, channel: "Email", contextHint: PAST_DUE_CONTEXT_HINT });
            const subject = personalize(draft.subject, member.name);
            const messageBody = personalize(draft.body, member.name);
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
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-800 disabled:opacity-50"
      >
        <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
        {generating ? "Drafting…" : error ? "Retry" : "Generate Draft"}
      </button>
    );
  }

  return (
    <button onClick={onOpen} className="text-sm font-semibold text-blue-700 hover:text-blue-800">
      {!member.emailStatus || member.emailStatus === "Draft" ? "View Draft" : member.emailStatus}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

const PAYMENTS_MONTHS = 6;

export function PaymentsView() {
  return (
    <div className="max-w-6xl">
      <PageHeader title="Payments" subtitle="Payment activity for each of the past 6 months." tool="Google Sheets (Payments)" />
      <SheetGate tab="Payments (Oct 1-25)">{(rows) => <PaymentsByMonth rows={rows} />}</SheetGate>
    </div>
  );
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}`;
}

function monthLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function PaymentsByMonth({ rows }: { rows: SheetRow[] }) {
  const mapped = useMemo(
    () =>
      rows.map((r) => ({
        date: findField(r, "date"),
        memberName: findField(r, "member name", "name"),
        status: findField(r, "status"),
        item: findField(r, "item"),
        paymentType: findField(r, "payment type"),
        amountPaid: findField(r, "amount paid", "amount"),
      })),
    [rows]
  );

  const months = useMemo(() => {
    const now = new Date();
    const list = [];
    for (let i = 0; i < PAYMENTS_MONTHS; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = monthKey(d);
      const monthRows = mapped.filter((p) => {
        const parsed = parseSlashDate(p.date);
        return parsed !== null && monthKey(parsed) === key;
      });
      const total = monthRows.reduce((sum, p) => sum + parseMoney(p.amountPaid), 0);
      list.push({ key, label: monthLabel(d), rows: monthRows, total });
    }
    return list;
  }, [mapped]);

  return (
    <div className="space-y-2">
      {months.map((m, i) => (
        <details key={m.key} open={i === 0} className="group rounded-2xl border border-neutral-200 bg-white overflow-hidden">
          <summary className="cursor-pointer select-none list-none px-5 py-4 flex items-center justify-between gap-4 hover:bg-neutral-50">
            <div>
              <p className="text-sm font-semibold text-neutral-900">{m.label}</p>
              <p className="text-xs text-neutral-400 mt-0.5">
                {m.rows.length} payment{m.rows.length === 1 ? "" : "s"} · ${m.total.toLocaleString()} collected
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-neutral-400 shrink-0 transition-transform group-open:rotate-90" />
          </summary>
          <div className="px-5 pb-5 pt-1 border-t border-neutral-100">
            {m.rows.length === 0 ? (
              <p className="text-sm text-neutral-400 py-4">No payments this month.</p>
            ) : (
              <MonthPaymentsTable rows={m.rows} />
            )}
          </div>
        </details>
      ))}
    </div>
  );
}

function MonthPaymentsTable({
  rows,
}: {
  rows: { date: string; memberName: string; status: string; item: string; paymentType: string; amountPaid: string }[];
}) {
  const { pageItems, page, setPage, totalPages } = usePagination(rows);

  return (
    <div className="overflow-x-auto">
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
    </div>
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
  smsBody: string;
};

const STATUS_FILTER_OPTIONS = [
  "Active members",
  "Cancelled members",
  "Past due members",
  "At risk (10+ days no class)",
  "Trial members",
];

const MEMBERSHIP_FILTER_OPTIONS = [
  "Any membership",
  "Basic Boxer 2x",
  "Knock Out Boxer Unlimited",
  "Light Boxer 1x",
  "Knock Out Boxer 3x",
  "1 Day Boxing Program",
  "Ignite Pro | Adult Boxing | 3-Class Trial for $19.95",
];

/** Built from the two filters into the plain-English Audience text Grok resolves at send time. */
function buildAudience(status: string, membership: string): string {
  const parts = [status];
  if (membership !== "Any membership") parts.push(`membership: ${membership}`);
  return parts.join(" · ");
}

type CampaignSequence = {
  row: number;
  name: string;
  audience: string;
  startDate: string;
  nodes: string;
  status: string;
  currentStep: string;
  nextRunAt: string;
  lastSentAt: string;
  notes: string;
};

/** A row in one of these statuses is already in flight or finished — the Start button hides and Stop shows instead. */
const SEQUENCE_IN_FLIGHT = new Set(["Queued", "Running", "Sending"]);
const SEQUENCE_BLOCKED_FOR_START = new Set(["Queued", "Running", "Sending", "Completed"]);

const ONE_OFF_CAMPAIGNS_ENABLED = false;

function safeParseSteps(nodes: string): SequenceStep[] {
  try {
    const parsed = JSON.parse(nodes);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

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
  const [deletingRow, setDeletingRow] = useState<number | null>(null);
  const emailFor = useContactEmails();
  const leadNames = useLeadNames();

  const [sequences, setSequences] = useState<CampaignSequence[] | null>(null);
  const [sequencesError, setSequencesError] = useState<string | null>(null);
  const [builderRow, setBuilderRow] = useState<number | "new" | null>(null);
  const [savingSequence, setSavingSequence] = useState(false);
  const [deletingSeqRow, setDeletingSeqRow] = useState<number | null>(null);
  const [startingSeqRow, setStartingSeqRow] = useState<number | null>(null);
  const [startError, setStartError] = useState<string | null>(null);

  const loadSequences = useCallback(async () => {
    try {
      const res = await fetch("/api/campaign-sequences");
      const data = await res.json();
      if (!res.ok) {
        setSequencesError(data.error ?? "Failed to load sequences.");
        return;
      }
      setSequences(data.sequences);
      setSequencesError(null);
    } catch {
      setSequencesError("Failed to load sequences.");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    loadSequences();
  }, [loadSequences]);

  function sequenceName(steps: SequenceStep[]): string {
    return steps.find((s) => s.type === "email" && s.templateName)
      ? `Sequence: ${steps.filter((s) => s.type === "email").map((s) => (s as { templateName: string }).templateName).join(" → ")}`
      : `Sequence ${new Date().toLocaleDateString("en-US")}`;
  }

  async function handleSaveSequence(steps: SequenceStep[], audience: string, startDate: string) {
    setSavingSequence(true);
    try {
      const name = sequenceName(steps);
      if (builderRow === "new") {
        await fetch("/api/campaign-sequences", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, audience, startDate, nodes: JSON.stringify(steps) }),
        });
      } else if (typeof builderRow === "number") {
        await fetch("/api/campaign-sequences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ row: builderRow, audience, startDate, nodes: JSON.stringify(steps) }),
        });
      }
      setBuilderRow(null);
      await loadSequences();
    } finally {
      setSavingSequence(false);
    }
  }

  /** Save-and-start from inside the builder: writes the sequence, marks it Queued, and sets the start date to today. */
  async function handleStartNowFromBuilder(steps: SequenceStep[], audience: string) {
    setStartingSeqRow(typeof builderRow === "number" ? builderRow : -1);
    setStartError(null);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res =
        builderRow === "new"
          ? await fetch("/api/campaign-sequences", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: sequenceName(steps), audience, startDate: today, nodes: JSON.stringify(steps), status: "Queued" }),
            })
          : await fetch("/api/campaign-sequences", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ row: builderRow, audience, startDate: today, nodes: JSON.stringify(steps), status: "Queued" }),
            });
      if (!res.ok) {
        setStartError(await apiError(res, "Failed to start the sequence."));
        return;
      }
      setBuilderRow(null);
      await loadSequences();
    } finally {
      setStartingSeqRow(null);
    }
  }

  async function handleDeleteSequence(row: number) {
    setDeletingSeqRow(row);
    try {
      const res = await fetch(`/api/campaign-sequences?row=${row}`, { method: "DELETE" });
      if (res.ok) await loadSequences();
    } finally {
      setDeletingSeqRow(null);
    }
  }

  /** Starts a sequence right away: marks it Queued (server refuses if it's already in flight or done) so Grok picks it up. */
  async function handleStartNow(row: number) {
    setStartingSeqRow(row);
    setStartError(null);
    try {
      const res = await fetch("/api/campaign-sequences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ row, status: "Queued", startDate: new Date().toISOString().slice(0, 10) }),
      });
      if (!res.ok) {
        setStartError(await apiError(res, "Failed to start the sequence."));
        return;
      }
      await loadSequences();
    } finally {
      setStartingSeqRow(null);
    }
  }

  /** Stops an in-flight sequence — just flips Status to "Stopped", no webhook call needed. */
  async function handleStopSequence(row: number) {
    setStartingSeqRow(row);
    setStartError(null);
    try {
      const res = await fetch("/api/campaign-sequences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ row, status: "Stopped" }),
      });
      if (!res.ok) {
        setStartError(await apiError(res, "Failed to stop the sequence."));
        return;
      }
      await loadSequences();
    } finally {
      setStartingSeqRow(null);
    }
  }

  const editingSequence = typeof builderRow === "number" ? sequences?.find((s) => s.row === builderRow) : undefined;
  const editingSteps: SequenceStep[] = editingSequence ? safeParseSteps(editingSequence.nodes) : [];

  /** Resolves a sequence's saved audience string into an actual recipient list, where possible. */
  function resolveRecipients(audience: string): { names: string[]; description: string } {
    if (audience.includes("Contact: ")) {
      const names = Array.from(audience.matchAll(/Contact:\s*([^<;]+?)\s*</g)).map((m) => m[1].trim());
      return { names, description: "Individual contacts" };
    }
    if (audience.startsWith("Individual: ")) {
      return { names: audience.slice("Individual: ".length).split(", ").filter(Boolean), description: "Individual contacts" };
    }
    if (audience === "New leads") {
      return { names: leadNames, description: "New leads" };
    }
    return { names: [], description: audience || "Everyone" };
  }

  const ranSequences = (sequences ?? []).filter((s) => s.status && s.status !== "Draft");

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

  // Only hand-created templates live here — per-contact drafts (win-back,
  // trial, at-risk, upgrade) carry a Notes tag and manage themselves on
  // their own page.
  const generalCampaigns = (campaigns ?? []).filter((c) => !c.notes);
  const { pageItems: pagedCampaigns, page, setPage, totalPages } = usePagination(generalCampaigns);
  usePollWhileQueued(!!generalCampaigns.some((c) => c.status === "Queued"), load);

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

  async function handleDelete(row: number) {
    setDeletingRow(row);
    try {
      const res = await fetch(`/api/campaigns?row=${row}`, { method: "DELETE" });
      if (res.ok) await load();
    } finally {
      setDeletingRow(null);
    }
  }

  const openCampaign = campaigns?.find((c) => c.row === openRow);

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Campaigns"
        subtitle="Build a drag-and-drop email sequence — emails and wait steps, saved to Google Sheets for Grok to run."
        tool="Google Sheets (Campaign Sequences)"
      />

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-neutral-700">Sequences</h2>
        {builderRow === null && (
          <button
            onClick={() => setBuilderRow("new")}
            className="rounded-full bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700"
          >
            New sequence
          </button>
        )}
      </div>

      {sequencesError && (
        <Card className="mb-4 border-red-200 bg-red-50">
          <p className="text-sm text-red-700">{sequencesError}</p>
        </Card>
      )}
      {startError && (
        <Card className="mb-4 border-red-200 bg-red-50">
          <p className="text-sm text-red-700">{startError}</p>
        </Card>
      )}

      {builderRow !== null && (
        <SequenceBuilder
          key={builderRow}
          initialSteps={editingSteps}
          initialAudience={editingSequence?.audience ?? ""}
          initialStartDate={editingSequence?.startDate ?? ""}
          saving={savingSequence}
          starting={startingSeqRow !== null}
          onCancel={() => setBuilderRow(null)}
          onSave={handleSaveSequence}
          onStartNow={handleStartNowFromBuilder}
        />
      )}

      {sequences && sequences.length === 0 && builderRow === null && (
        <p className="text-sm text-neutral-400 mb-6">No sequences yet. Create one above.</p>
      )}

      <div className="space-y-3 mb-10">
        {(sequences ?? []).map((s) => {
          const steps = safeParseSteps(s.nodes);
          const emailCount = steps.filter((st) => st.type === "email").length;
          const waitCount = steps.filter((st) => st.type === "wait").length;
          return (
            <Card key={s.row} className="hover:border-blue-200 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-base font-semibold text-neutral-900">{s.name}</p>
                  <p className="text-sm text-neutral-500 mt-0.5">
                    {emailCount} email{emailCount === 1 ? "" : "s"} · {waitCount} wait step{waitCount === 1 ? "" : "s"}
                    {s.audience && ` · ${s.audience}`}
                    {s.startDate && ` · Starts ${s.startDate}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge>{s.status || "Draft"}</Badge>
                  {!SEQUENCE_BLOCKED_FOR_START.has(s.status) && (
                    <button
                      onClick={() => handleStartNow(s.row)}
                      disabled={startingSeqRow === s.row}
                      className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 text-white px-3 py-1.5 text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Send className="h-3 w-3" strokeWidth={2} />
                      {startingSeqRow === s.row ? "Starting…" : "Start now"}
                    </button>
                  )}
                  {SEQUENCE_IN_FLIGHT.has(s.status) && (
                    <button
                      onClick={() => handleStopSequence(s.row)}
                      disabled={startingSeqRow === s.row}
                      className="rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                    >
                      {startingSeqRow === s.row ? "Stopping…" : "Stop"}
                    </button>
                  )}
                  <button
                    onClick={() => setBuilderRow(s.row)}
                    className="rounded-full border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteSequence(s.row)}
                    disabled={deletingSeqRow === s.row}
                    className="rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-500 hover:bg-neutral-50 hover:text-red-600 disabled:opacity-50"
                  >
                    {deletingSeqRow === s.row ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <h2 className="text-sm font-semibold text-neutral-700 mb-3">Campaign history</h2>
      {ranSequences.length === 0 && <p className="text-sm text-neutral-400 mb-10">No campaigns have run yet.</p>}
      <div className="space-y-3 mb-10">
        {ranSequences.map((s) => {
          const steps = safeParseSteps(s.nodes);
          const { names, description } = resolveRecipients(s.audience);
          return (
            <Card key={s.row}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-base font-semibold text-neutral-900">{s.name}</p>
                  <p className="text-sm text-neutral-500 mt-0.5">
                    Started {s.startDate || "—"} · Step {s.currentStep || "0"} of {steps.filter((st) => st.type === "email").length}
                    {s.nextRunAt && ` · Next run ${new Date(s.nextRunAt).toLocaleString()}`}
                    {s.lastSentAt && ` · Last sent ${new Date(s.lastSentAt).toLocaleString()}`}
                  </p>
                  {s.notes && <p className="text-sm text-amber-700 mt-1">{s.notes}</p>}
                  {names.length > 0 ? (
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-medium text-neutral-700 mr-0.5">
                        Sent to {names.length} {names.length === 1 ? "person" : "people"}:
                      </span>
                      {names.map((n, i) => (
                        <span
                          key={`${n}-${i}`}
                          className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 pl-1 pr-2.5 py-1 text-xs font-medium text-blue-700"
                        >
                          <Avatar name={n} size="sm" />
                          {n}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-neutral-600 mt-2">
                      <span className="font-medium text-neutral-700">Sent to: </span>
                      {description} (resolved by Grok at send time)
                    </p>
                  )}
                </div>
                <Badge>{s.status}</Badge>
              </div>
            </Card>
          );
        })}
      </div>

      {/* One-off campaigns — temporarily hidden, sequences cover this now */}
      {ONE_OFF_CAMPAIGNS_ENABLED && (
      <>
      <h2 className="text-sm font-semibold text-neutral-700 mb-3">One-off campaigns</h2>
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

      {campaigns && generalCampaigns.length === 0 && !error && <p className="text-sm text-neutral-400">No campaigns yet. Create one above.</p>}

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
                    {c.channel !== "SMS" && c.subject && <p className="text-sm text-neutral-400 mt-1">Subject: {c.subject}</p>}
                    {c.channel !== "SMS" && c.messageBody && (
                      <p className="text-sm text-neutral-600 mt-2 max-w-xl break-words">{c.messageBody}</p>
                    )}
                    {c.channel !== "Email" && c.smsBody && (
                      <p className="text-sm text-neutral-600 mt-2 max-w-xl break-words">SMS: {c.smsBody}</p>
                    )}
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
                  {!locked && (
                    <button
                      onClick={() => handleDelete(c.row)}
                      disabled={deletingRow === c.row}
                      className="rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-500 hover:bg-neutral-50 hover:text-red-600 disabled:opacity-50"
                    >
                      {deletingRow === c.row ? "Deleting…" : "Delete"}
                    </button>
                  )}
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
          smsBody={openCampaign.smsBody}
          showSms={openCampaign.channel !== "Email"}
          audience={openCampaign.audience}
          showAudience
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
          onSave={async (subject, messageBody, smsBody, audience) => {
            const res = await fetch("/api/campaigns", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ row: openCampaign.row, subject, messageBody, smsBody, audience }),
            });
            if (!res.ok) throw new Error(await apiError(res, "Failed to save."));
            await load();
          }}
          onSend={async (subject, messageBody, smsBody, audience) => {
            const res = await fetch("/api/campaigns/send", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ row: openCampaign.row, subject, messageBody, smsBody, audience }),
            });
            const message = res.ok ? null : await apiError(res, "Failed to send.");
            await load();
            if (message) throw new Error(message);
          }}
        />
      )}
      </>
      )}
    </div>
  );
}

function NewCampaignForm({ onCreated }: { onCreated: () => void }) {
  const [campaignName, setCampaignName] = useState("");
  const [channel, setChannel] = useState<"Email" | "SMS" | "Both">("Email");
  const [statusFilter, setStatusFilter] = useState(STATUS_FILTER_OPTIONS[0]);
  const [membershipFilter, setMembershipFilter] = useState(MEMBERSHIP_FILTER_OPTIONS[0]);
  const audience = buildAudience(statusFilter, membershipFilter);
  const [subject, setSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [smsBody, setSmsBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brief, setBrief] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [templateId, setTemplateId] = useState("");

  const showEmail = channel === "Email" || channel === "Both";
  const showSms = channel === "SMS" || channel === "Both";
  const smsLength = smsBody.length;
  const overSmsLimit = showSms && smsLength > 160;

  useEffect(() => {
    fetch("/api/email-templates")
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates ?? []))
      .catch(() => setTemplates([]));
  }, []);

  function applyTemplate(row: string) {
    setTemplateId(row);
    const t = templates.find((tpl) => String(tpl.row) === row);
    if (!t) return;
    setSubject(t.subject);
    setMessageBody(t.body);
    if (!campaignName.trim()) setCampaignName(t.name);
  }

  async function handleGenerate() {
    if (!brief.trim()) {
      setGenError("Type a rough idea first, e.g. \"20% off this weekend only\".");
      return;
    }
    setGenError(null);
    setGenerating(true);
    try {
      const res = await fetch("/api/campaigns/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief, channel }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGenError(data.error ?? "Couldn't generate a draft.");
        return;
      }
      if (data.subject) setSubject(data.subject);
      if (data.body) setMessageBody(data.body);
      if (data.smsBody) setSmsBody(data.smsBody);
      if (!campaignName.trim()) setCampaignName(brief.slice(0, 60));
    } catch {
      setGenError("Couldn't generate a draft.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (showEmail && !subject.trim()) {
      setError("Subject is required for email campaigns.");
      return;
    }
    if (showEmail && !messageBody.trim()) {
      setError("Message body is required for email campaigns.");
      return;
    }
    if (showSms && !smsBody.trim()) {
      setError("SMS message is required for SMS campaigns.");
      return;
    }
    if (overSmsLimit) {
      setError(`SMS message is ${smsLength} characters — keep it under 160.`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignName, channel, audience, subject, messageBody, smsBody }),
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
              onChange={(e) => setChannel(e.target.value as "Email" | "SMS" | "Both")}
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
            >
              <option value="Email">Email</option>
              <option value="SMS">SMS</option>
              <option value="Both">Both</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-neutral-700 block mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
            >
              {STATUS_FILTER_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700 block mb-1">Membership</label>
            <select
              value={membershipFilter}
              onChange={(e) => setMembershipFilter(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
            >
              {MEMBERSHIP_FILTER_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-xs text-neutral-400 -mt-2">Audience: {audience}</p>

        {showEmail && templates.length > 0 && (
          <div>
            <label className="text-sm font-medium text-neutral-700 block mb-1">Email template</label>
            <select
              value={templateId}
              onChange={(e) => applyTemplate(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
            >
              <option value="">Start from scratch</option>
              {templates.map((t) => (
                <option key={t.row} value={t.row}>
                  {t.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-neutral-400 mt-1">
              Fills in subject &amp; body — create more in{" "}
              <Link href="/lyfe-boxing/email-templates" className="underline hover:text-neutral-600">
                Email Templates
              </Link>
              .
            </p>
          </div>
        )}

        <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50/60 p-4 space-y-2">
          <label className="text-sm font-medium text-neutral-700 block">Give AI a rough idea, it&apos;ll draft the rest</label>
          <div className="flex gap-2">
            <input
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              className="flex-1 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
              placeholder="e.g. 20% off any membership upgrade this weekend only"
            />
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              className="rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 whitespace-nowrap"
            >
              {generating ? "Generating…" : "Generate with AI"}
            </button>
          </div>
          {genError && <p className="text-sm text-red-600">{genError}</p>}
        </div>

        {showEmail && (
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

        {showEmail && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-neutral-700">Email body</label>
              <span className="text-xs text-neutral-400">Use {"{First name}"} for personalization</span>
            </div>
            <textarea
              required
              rows={5}
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
            />
          </div>
        )}

        {showSms && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-neutral-700">SMS message</label>
              <span className={`text-xs ${overSmsLimit ? "text-red-600 font-medium" : "text-neutral-400"}`}>{smsLength} / 160</span>
            </div>
            <textarea
              required
              rows={3}
              value={smsBody}
              onChange={(e) => setSmsBody(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
              placeholder="Use {First name} for personalization"
            />
            {overSmsLimit && <p className="text-xs text-red-600 mt-1">This will send as more than one SMS segment.</p>}
          </div>
        )}

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
// Email Templates
// ---------------------------------------------------------------------------

type EmailTemplate = {
  row: number;
  name: string;
  subject: string;
  body: string;
  created: string;
};

export function EmailTemplatesView() {
  const [templates, setTemplates] = useState<EmailTemplate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [deletingRow, setDeletingRow] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/email-templates");
      const data = await res.json();
      if (!res.ok) {
        setNotConfigured(!!data.notConfigured);
        setError(data.error ?? "Failed to load templates.");
        return;
      }
      setTemplates(data.templates ?? []);
      setError(null);
      setNotConfigured(false);
    } catch {
      setError("Failed to load templates.");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount, the standard pattern for client-rendered pages with no server-fetched data
    load();
  }, [load]);

  async function handleDelete(row: number) {
    setDeletingRow(row);
    try {
      const res = await fetch(`/api/email-templates?row=${row}`, { method: "DELETE" });
      if (res.ok) await load();
    } finally {
      setDeletingRow(null);
    }
  }

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Email Templates"
        subtitle="Reusable email drafts you write once and pick from when creating a Campaign."
        tool="Google Sheets (Email Templates)"
      />

      <div className="mb-6">
        <button
          onClick={() => {
            setEditingRow(null);
            setShowForm((s) => !s);
          }}
          className="inline-flex items-center gap-2 rounded-full bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          {showForm && editingRow === null ? "Cancel" : "New template"}
        </button>
      </div>

      {showForm && editingRow === null && (
        <TemplateForm
          onDone={async () => {
            setShowForm(false);
            await load();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {notConfigured && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-800">
            Templates aren&apos;t wired up yet — the Google service account needs edit access to the sheet, and its
            credentials need to be set as environment variables on this deployment.
          </p>
        </Card>
      )}
      {error && !notConfigured && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <p className="text-sm text-red-700">{error}</p>
        </Card>
      )}

      {templates === null && !error && <LoadingCard />}
      {templates !== null && templates.length === 0 && !error && (
        <Card className="text-center py-10 text-sm text-neutral-500">No templates yet. Create one above.</Card>
      )}

      <div className="space-y-3">
        {(templates ?? []).map((t) =>
          editingRow === t.row ? (
            <TemplateForm
              key={t.row}
              initial={t}
              onDone={async () => {
                setEditingRow(null);
                await load();
              }}
              onCancel={() => setEditingRow(null)}
            />
          ) : (
            <Card key={t.row} className="hover:border-blue-200 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-base font-semibold text-neutral-900">{t.name}</p>
                  {t.created && <p className="text-xs text-neutral-400 mt-0.5">Created {t.created}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setEditingRow(t.row);
                    }}
                    className="rounded-full border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(t.row)}
                    disabled={deletingRow === t.row}
                    className="rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-500 hover:bg-neutral-50 hover:text-red-600 disabled:opacity-50"
                  >
                    {deletingRow === t.row ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-neutral-100 bg-neutral-50/60 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">Subject</p>
                <p className="text-sm text-neutral-900 mt-1">{t.subject}</p>
                <div className="mt-3 pt-3 border-t border-neutral-200">
                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">Body</p>
                  <p className="text-sm text-neutral-700 mt-1 whitespace-pre-line">{t.body}</p>
                </div>
              </div>
            </Card>
          )
        )}
      </div>
    </div>
  );
}

function TemplateForm({
  initial,
  onDone,
  onCancel,
}: {
  initial?: EmailTemplate;
  onDone: () => void;
  onCancel: () => void;
}) {
  const isEdit = !!initial;
  const [name, setName] = useState(initial?.name ?? "");
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brief, setBrief] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  async function handleGenerate() {
    if (!brief.trim()) {
      setGenError("Type a rough idea first, e.g. \"welcome new members\".");
      return;
    }
    setGenError(null);
    setGenerating(true);
    try {
      const res = await fetch("/api/campaigns/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief, channel: "Email" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGenError(data.error ?? "Couldn't generate a draft.");
        return;
      }
      if (data.subject) setSubject(data.subject);
      if (data.body) setBody(data.body);
      if (!name.trim()) setName(brief.slice(0, 60));
    } catch {
      setGenError("Couldn't generate a draft.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/email-templates", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? { row: initial!.row, name, subject, body } : { name, subject, body }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? `Failed to ${isEdit ? "save" : "create"} template.`);
        return;
      }
      onDone();
    } catch {
      setError(`Failed to ${isEdit ? "save" : "create"} template.`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="mb-6 border-blue-200">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-neutral-700 block mb-1">Template name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            placeholder="e.g. Monthly newsletter"
          />
        </div>

        {!isEdit && (
          <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50/50 p-4 space-y-2">
            <label className="text-sm font-medium text-neutral-700 block">Give AI a rough idea, it&apos;ll draft the rest</label>
            <div className="flex gap-2">
              <input
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                className="flex-1 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                placeholder="e.g. welcome new members, friendly and upbeat"
              />
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
              >
                {generating ? "Generating…" : "Generate with AI"}
              </button>
            </div>
            {genError && <p className="text-sm text-red-600">{genError}</p>}
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-neutral-700 block mb-1">Subject</label>
          <input
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            placeholder="Use {First name} for personalization"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-neutral-700 block mb-1">Body</label>
          <textarea
            required
            rows={6}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            placeholder="Use {First name} for personalization"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-blue-600 text-white px-5 py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Saving…" : isEdit ? "Save changes" : "Save template"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-neutral-200 px-5 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Trial Conversion
// ---------------------------------------------------------------------------

const TRIAL_MEMBERSHIP_NAMES = ["1 Day Boxing Program", "Ignite Pro | Adult Boxing | 3-Class Trial for $19.95"];

const TRIAL_CONTEXT_HINT =
  "This is an upgrade-offer email (plus a short first-class SMS) to a trial member, encouraging them to convert to a full membership.";

function trialTag(name: string): string {
  return `trial:${name}`;
}

export function TrialConversionView() {
  return (
    <div className="max-w-[1600px]">
      <div className="mb-2 flex items-center gap-1.5 text-sm text-neutral-400">
        <Link href="/lyfe-boxing" className="hover:text-blue-600">
          Home
        </Link>
        <span>›</span>
        <span className="text-neutral-600 font-medium">Trial Conversion</span>
      </div>
      <div className="mb-6">
        <h1 className="text-[28px] leading-tight font-semibold text-neutral-900 tracking-tight">Trial Conversion</h1>
        <p className="text-base text-neutral-500 mt-2 max-w-2xl">
          Trial and 1-Day Boxing Program members to follow up with and convert to a full membership.
        </p>
        <span className="inline-flex items-center gap-1.5 text-sm text-blue-600 font-medium mt-3">
          <CalendarIcon className="h-3.5 w-3.5" strokeWidth={1.75} /> Google Sheets Source
        </span>
      </div>
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

type TrialSort = "name-asc" | "membership-asc";

function TrialTable({ trialMembers }: { trialMembers: { name: string; email: string; membership: string }[] }) {
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [openDraftFor, setOpenDraftFor] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [brief, setBrief] = useState("");
  const [query, setQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [membershipFilter, setMembershipFilter] = useState("");
  const [sortBy, setSortBy] = useState<TrialSort>("name-asc");
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

  const membershipOptions = Array.from(new Set(trialMembers.map((m) => m.membership))).sort();

  const q = query.trim().toLowerCase();
  const filtered = trialMembers.filter((m) => {
    if (q) {
      const matches = m.name.toLowerCase().includes(q) || emailFor(m.name, m.email).toLowerCase().includes(q);
      if (!matches) return false;
    }
    if (membershipFilter && m.membership !== membershipFilter) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "name-asc":
        return a.name.localeCompare(b.name);
      case "membership-asc":
        return a.membership.localeCompare(b.membership);
      default:
        return 0;
    }
  });

  const activeFilterCount = [membershipFilter].filter(Boolean).length;
  function clearFilters() {
    setMembershipFilter("");
  }

  return (
    <>
      <Card className="mb-6">
        <p className="font-semibold text-neutral-900">
          {trialMembers.length} trial member{trialMembers.length === 1 ? "" : "s"}
        </p>
        <p className="text-sm text-neutral-500 mt-1 mb-4">
          Write what the upgrade offer should say, generate it once, then edit or send per contact below — or send to all at once.
        </p>
        <BriefInput brief={brief} setBrief={setBrief} placeholder="e.g. offer 10% off their first month if they upgrade this week" />
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
          <GenerateAllTrialButton members={trialMembers} missingCount={missingDraftCount} brief={brief} onDone={loadCampaigns} />
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <p className="text-base font-semibold text-neutral-900">Member List</p>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setFilterOpen((o) => !o)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                <Filter className="h-4 w-4 text-neutral-400" strokeWidth={1.75} />
                Filter
                {activeFilterCount > 0 && (
                  <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-blue-600 text-[10px] font-semibold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              {filterOpen && (
                <div className="absolute right-0 top-full mt-1.5 z-10 w-72 rounded-lg border border-neutral-200 bg-white shadow-md p-4 space-y-3">
                  <div>
                    <label className="text-xs font-medium text-neutral-500 block mb-1">Membership</label>
                    <select
                      value={membershipFilter}
                      onChange={(e) => setMembershipFilter(e.target.value)}
                      className="w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-sm text-neutral-900"
                    >
                      <option value="">All memberships</option>
                      {membershipOptions.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  {activeFilterCount > 0 && (
                    <button onClick={clearFilters} className="text-xs font-medium text-blue-600 hover:text-blue-700">
                      Clear filters
                    </button>
                  )}
                </div>
              )}
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as TrialSort)}
              className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700"
            >
              <option value="name-asc">Name (A–Z)</option>
              <option value="membership-asc">Membership (A–Z)</option>
            </select>
            <div className="relative w-56 shrink-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" strokeWidth={1.75} />
              <input
                type="text"
                placeholder="Search members..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 bg-white pl-9 pr-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
              />
            </div>
          </div>
        </div>
        <table className="w-full text-sm table-fixed">
          <thead>
            <tr className="text-left text-xs font-semibold text-neutral-400 uppercase tracking-wide border-b border-neutral-100 bg-neutral-50/60">
              <th className="py-3 pr-2 w-6"></th>
              <th className="py-3 pr-4 w-[32%]">Member</th>
              <th className="py-3 pr-4 w-[24%]">Membership</th>
              <th className="py-3 pr-4 w-[20%]">Status</th>
              <th className="py-3 pr-4 w-[20%]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((m, i) => {
              const canSelect = selectableNames.includes(m.name);
              const campaign = campaigns?.find((c) => c.notes === trialTag(m.name));
              const draftStatus = campaign?.status;
              const hasEmail = !!emailFor(m.name, m.email);
              return (
                <tr
                  key={`${m.name}-${i}`}
                  className={`border-b border-neutral-50 last:border-0 align-top ${draftStatus === "Draft" ? "bg-amber-50/60" : ""}`}
                >
                  <td className="py-3 pr-2">
                    {canSelect && (
                      <input
                        type="checkbox"
                        checked={selected.has(m.name)}
                        onChange={() => toggleSelected(m.name)}
                        className="rounded border-neutral-300"
                      />
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={m.name} size="sm" />
                      <span className="min-w-0">
                        <span className="block text-neutral-900 font-semibold truncate">{m.name || "—"}</span>
                        <span className="block text-xs text-neutral-400 truncate">{emailFor(m.name, m.email) || "—"}</span>
                      </span>
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium ${categoryColor(m.membership)}`}>
                      {m.membership}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-neutral-500 truncate">{draftStatus || "No draft"}</td>
                  <td className="py-3 pr-4">
                    {hasEmail ? (
                      <TrialDraftCell
                        name={m.name}
                        hasEmail={hasEmail}
                        campaign={campaign}
                        brief={brief}
                        onGenerated={loadCampaigns}
                        onOpen={() => setOpenDraftFor(m.name)}
                      />
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600">
                        No email
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="flex items-center justify-between pt-4 mt-1 border-t border-neutral-100">
          <p className="text-sm text-neutral-500">
            Showing {sorted.length} of {trialMembers.length} members
          </p>
        </div>
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

async function generateTrialDrafts(name: string, brief: string): Promise<void> {
  const draft = await generateBriefDraft({ brief, channel: "Both", contextHint: TRIAL_CONTEXT_HINT });

  // Upgrade email — the one shown/edited/sent in the UI.
  const emailRes = await fetch("/api/campaigns", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      campaignName: `Trial upgrade: ${name}`,
      channel: "Email",
      audience: "",
      subject: personalize(draft.subject, name),
      messageBody: personalize(draft.body, name),
      notes: trialTag(name),
    }),
  });
  if (!emailRes.ok) throw new Error();

  // First-class SMS — drafted alongside for Alex to review in Campaigns, not individually managed here.
  if (draft.smsBody) {
    await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignName: `Trial first-class SMS: ${name}`,
        channel: "SMS",
        audience: "",
        messageBody: personalize(draft.smsBody, name),
        notes: `trial-sms:${name}`,
      }),
    });
  }
}

function GenerateAllTrialButton({
  members,
  missingCount,
  brief,
  onDone,
}: {
  members: { name: string }[];
  missingCount: number;
  brief: string;
  onDone: () => Promise<void>;
}) {
  const [state, setState] = useState<"idle" | "sending" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function generateAll() {
    if (!brief.trim()) {
      setError("Type what the draft should say first.");
      setState("error");
      return;
    }
    setError(null);
    setState("sending");
    try {
      const res = await fetch("/api/campaigns");
      const data = await res.json();
      const existing: Campaign[] = res.ok ? data.campaigns ?? [] : [];
      const toDraft = members.filter((m) => !existing.find((c) => c.notes === trialTag(m.name)));
      for (const m of toDraft) await generateTrialDrafts(m.name, brief);
      await onDone();
      setState("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong — try again.");
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
      {state === "error" && error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

function TrialDraftCell({
  name,
  hasEmail,
  campaign,
  brief,
  onGenerated,
  onOpen,
}: {
  name: string;
  hasEmail: boolean;
  campaign: Campaign | undefined;
  brief: string;
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
            await generateTrialDrafts(name, brief);
            await onGenerated();
          } catch {
            setError(true);
          } finally {
            setGenerating(false);
          }
        }}
        disabled={generating}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-800 disabled:opacity-50"
      >
        <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
        {generating ? "Drafting…" : error ? "Retry" : "Generate Draft"}
      </button>
    );
  }

  return (
    <button onClick={onOpen} className="text-sm font-semibold text-blue-700 hover:text-blue-800">
      {campaign.status === "Draft" ? "View Draft" : campaign.status}
    </button>
  );
}

// ---------------------------------------------------------------------------
// At Risk / Upgrade Candidates — read the "Attendance" tab (Name, Membership,
// Last Attended, Classes Last 30 Days) and offer the same brief-driven,
// per-contact generate/edit/send flow as Win-back and Trial Conversion.
// ---------------------------------------------------------------------------

function daysSince(dateStr: string): number | null {
  const d = parseSlashDate(dateStr);
  if (!d) return null;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function atRiskTag(name: string): string {
  return `atrisk:${name}`;
}

function upgradeTag(name: string): string {
  return `upgrade:${name}`;
}

const AT_RISK_CONTEXT_HINT = "This is a check-in email to a member who hasn't attended a class in 10+ days.";
const UPGRADE_CONTEXT_HINT =
  "This is an email to a member training more classes per month than their current plan covers, inviting them to upgrade.";

export function AtRiskView() {
  return (
    <div className="max-w-[1600px]">
      <div className="mb-2 flex items-center gap-1.5 text-sm text-neutral-400">
        <Link href="/lyfe-boxing" className="hover:text-blue-600">
          Home
        </Link>
        <span>›</span>
        <span className="text-neutral-600 font-medium">At Risk</span>
      </div>
      <div className="mb-6">
        <h1 className="text-[28px] leading-tight font-semibold text-neutral-900 tracking-tight">At Risk</h1>
        <p className="text-base text-neutral-500 mt-2 max-w-2xl">Members who haven&apos;t attended in 10+ days.</p>
        <span className="inline-flex items-center gap-1.5 text-sm text-blue-600 font-medium mt-3">
          <CalendarIcon className="h-3.5 w-3.5" strokeWidth={1.75} /> Google Sheets Source
        </span>
      </div>
      <SheetGate tab="Attendance">
        {(rows) => {
          const members = rows
            .map((r) => ({
              name: findField(r, "name"),
              email: findField(r, "email"),
              lastAttended: findField(r, "last attended"),
            }))
            .filter((m) => m.name)
            .map((m) => ({ ...m, daysSince: daysSince(m.lastAttended) }))
            .filter((m) => m.daysSince !== null && m.daysSince >= 10);

          if (members.length === 0) {
            return <Card className="text-center py-10 text-sm text-neutral-500">No one is at risk right now.</Card>;
          }

          return (
            <AttendanceDraftTable
              members={members.map((m) => ({ name: m.name, email: m.email, detail: `${m.daysSince} days since last class` }))}
              detailLabel="Last attended"
              tagFn={atRiskTag}
              contextHint={AT_RISK_CONTEXT_HINT}
              briefPlaceholder="e.g. invite them back with a free class"
              modalTitlePrefix="Check-in email for"
              modalSubtitle="At Risk"
              pageLabel="member"
            />
          );
        }}
      </SheetGate>
    </div>
  );
}

export function UpgradeCandidatesView() {
  return (
    <div className="max-w-[1600px]">
      <div className="mb-2 flex items-center gap-1.5 text-sm text-neutral-400">
        <Link href="/lyfe-boxing" className="hover:text-blue-600">
          Home
        </Link>
        <span>›</span>
        <span className="text-neutral-600 font-medium">Upgrade Candidates</span>
      </div>
      <div className="mb-6">
        <h1 className="text-[28px] leading-tight font-semibold text-neutral-900 tracking-tight">Upgrade Candidates</h1>
        <p className="text-base text-neutral-500 mt-2 max-w-2xl">
          Light Boxer 1x and Basic Boxer 2x members attending more than their plan allows.
        </p>
        <span className="inline-flex items-center gap-1.5 text-sm text-blue-600 font-medium mt-3">
          <CalendarIcon className="h-3.5 w-3.5" strokeWidth={1.75} /> Google Sheets Source
        </span>
      </div>
      <SheetGate tab="Attendance">
        {(rows) => {
          const members = rows
            .map((r) => ({
              name: findField(r, "name"),
              email: findField(r, "email"),
              membership: findField(r, "membership"),
              classes30d: Number(findField(r, "classes last 30 days", "classes")) || 0,
            }))
            .filter((m) => m.name)
            .filter(
              (m) =>
                (m.membership === "Light Boxer 1x" && m.classes30d > 4) ||
                (m.membership === "Basic Boxer 2x" && m.classes30d > 8)
            );

          if (members.length === 0) {
            return <Card className="text-center py-10 text-sm text-neutral-500">No upgrade candidates right now.</Card>;
          }

          return (
            <AttendanceDraftTable
              members={members.map((m) => ({ name: m.name, email: m.email, detail: `${m.classes30d} classes in 30 days (${m.membership})` }))}
              detailLabel="Activity"
              tagFn={upgradeTag}
              contextHint={UPGRADE_CONTEXT_HINT}
              briefPlaceholder="e.g. offer a discount on their first month on Unlimited"
              modalTitlePrefix="Upgrade email for"
              modalSubtitle="Upgrade Candidates"
              pageLabel="candidate"
            />
          );
        }}
      </SheetGate>
    </div>
  );
}

/** Shared per-contact generate → edit → send table, brief-driven, for At Risk and Upgrade Candidates. */
function AttendanceDraftTable({
  members,
  detailLabel,
  tagFn,
  contextHint,
  briefPlaceholder,
  pageLabel,
  modalTitlePrefix,
  modalSubtitle,
}: {
  members: { name: string; email: string; detail: string }[];
  detailLabel: string;
  tagFn: (name: string) => string;
  contextHint: string;
  briefPlaceholder: string;
  pageLabel: string;
  modalTitlePrefix: string;
  modalSubtitle: string;
}) {
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [openDraftFor, setOpenDraftFor] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [brief, setBrief] = useState("");
  const [query, setQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState<"name-asc" | "status-asc">("name-asc");
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

  const missingDraftCount = campaigns ? members.filter((m) => !campaigns.find((c) => c.notes === tagFn(m.name))).length : members.length;
  const anyQueued = !!campaigns?.some((c) => c.status === "Queued" && members.some((m) => c.notes === tagFn(m.name)));
  usePollWhileQueued(anyQueued, loadCampaigns);

  const openMember = members.find((m) => m.name === openDraftFor);
  const openCampaign = openDraftFor ? campaigns?.find((c) => c.notes === tagFn(openDraftFor)) : undefined;
  const openEmail = openMember ? emailFor(openMember.name, openMember.email) : "";

  const selectableNames = members
    .filter((m) => {
      const camp = campaigns?.find((c) => c.notes === tagFn(m.name));
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

  async function generateDraft(name: string): Promise<void> {
    const draft = await generateBriefDraft({ brief, channel: "Email", contextHint });
    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignName: `${modalSubtitle}: ${name}`,
        channel: "Email",
        audience: "",
        subject: personalize(draft.subject, name),
        messageBody: personalize(draft.body, name),
        notes: tagFn(name),
      }),
    });
    if (!res.ok) throw new Error();
  }

  const statusOptions = Array.from(
    new Set(members.map((m) => campaigns?.find((c) => c.notes === tagFn(m.name))?.status || "No draft"))
  ).sort();

  const q = query.trim().toLowerCase();
  const filtered = members.filter((m) => {
    if (q) {
      const matches = m.name.toLowerCase().includes(q) || emailFor(m.name, m.email).toLowerCase().includes(q);
      if (!matches) return false;
    }
    if (statusFilter) {
      const status = campaigns?.find((c) => c.notes === tagFn(m.name))?.status || "No draft";
      if (status !== statusFilter) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "name-asc") return a.name.localeCompare(b.name);
    const sa = campaigns?.find((c) => c.notes === tagFn(a.name))?.status || "No draft";
    const sb = campaigns?.find((c) => c.notes === tagFn(b.name))?.status || "No draft";
    return sa.localeCompare(sb);
  });

  const activeFilterCount = [statusFilter].filter(Boolean).length;
  function clearFilters() {
    setStatusFilter("");
  }

  return (
    <>
      <Card className="mb-6">
        <p className="font-semibold text-neutral-900">
          {members.length} {pageLabel}
          {members.length === 1 ? "" : "s"}
        </p>
        <p className="text-sm text-neutral-500 mt-1 mb-4">
          Write what the draft should say, generate it once, then edit or send per contact below — or send to all at once.
        </p>
        <BriefInput brief={brief} setBrief={setBrief} placeholder={briefPlaceholder} />
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <SendSelectedButton
              campaigns={campaigns ?? []}
              selectedNames={selected}
              emailFor={emailFor}
              tagFn={tagFn}
              onDone={async () => {
                setSelected(new Set());
                await loadCampaigns();
              }}
            />
          )}
          <GenerateAllAttendanceButton members={members} missingCount={missingDraftCount} brief={brief} tagFn={tagFn} contextHint={contextHint} modalSubtitle={modalSubtitle} onDone={loadCampaigns} />
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <p className="text-base font-semibold text-neutral-900">{modalSubtitle} List</p>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setFilterOpen((o) => !o)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                <Filter className="h-4 w-4 text-neutral-400" strokeWidth={1.75} />
                Filter
                {activeFilterCount > 0 && (
                  <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-blue-600 text-[10px] font-semibold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              {filterOpen && (
                <div className="absolute right-0 top-full mt-1.5 z-10 w-72 rounded-lg border border-neutral-200 bg-white shadow-md p-4 space-y-3">
                  <div>
                    <label className="text-xs font-medium text-neutral-500 block mb-1">Draft Status</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-sm text-neutral-900"
                    >
                      <option value="">All statuses</option>
                      {statusOptions.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  {activeFilterCount > 0 && (
                    <button onClick={clearFilters} className="text-xs font-medium text-blue-600 hover:text-blue-700">
                      Clear filters
                    </button>
                  )}
                </div>
              )}
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "name-asc" | "status-asc")}
              className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700"
            >
              <option value="name-asc">Name (A–Z)</option>
              <option value="status-asc">Status (A–Z)</option>
            </select>
            <div className="relative w-56 shrink-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" strokeWidth={1.75} />
              <input
                type="text"
                placeholder="Search members..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 bg-white pl-9 pr-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
              />
            </div>
          </div>
        </div>
        <table className="w-full text-sm table-fixed">
          <thead>
            <tr className="text-left text-xs font-semibold text-neutral-400 uppercase tracking-wide border-b border-neutral-100 bg-neutral-50/60">
              <th className="py-3 pr-2 w-6"></th>
              <th className="py-3 pr-4 w-[30%]">Member</th>
              <th className="py-3 pr-4 w-[26%]">{detailLabel}</th>
              <th className="py-3 pr-4 w-[20%]">Status</th>
              <th className="py-3 pr-4 w-[20%]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((m, i) => {
              const canSelect = selectableNames.includes(m.name);
              const campaign = campaigns?.find((c) => c.notes === tagFn(m.name));
              const isNew = campaign?.status === "Draft";
              const hasEmail = !!emailFor(m.name, m.email);
              return (
                <tr key={`${m.name}-${i}`} className={`border-b border-neutral-50 last:border-0 align-top ${isNew ? "bg-amber-50/60" : ""}`}>
                  <td className="py-3 pr-2">
                    {canSelect && (
                      <input
                        type="checkbox"
                        checked={selected.has(m.name)}
                        onChange={() => toggleSelected(m.name)}
                        className="rounded border-neutral-300"
                      />
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={m.name} size="sm" />
                      <span className="min-w-0">
                        <span className="block text-neutral-900 font-semibold truncate">{m.name || "—"}</span>
                        <span className="block text-xs text-neutral-400 truncate">{emailFor(m.name, m.email) || "—"}</span>
                      </span>
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-neutral-700 truncate">{m.detail}</td>
                  <td className="py-3 pr-4">
                    <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium ${categoryColor(campaign?.status || "No draft")}`}>
                      {campaign?.status || "No draft"}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    {!hasEmail ? (
                      <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600">
                        No email
                      </span>
                    ) : !campaign ? (
                      <GenerateDraftButton name={m.name} generateDraft={generateDraft} onGenerated={loadCampaigns} />
                    ) : (
                      <button onClick={() => setOpenDraftFor(m.name)} className="text-sm font-semibold text-blue-700 hover:text-blue-800">
                        {isNew ? "View Draft" : campaign.status}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="flex items-center justify-between pt-4 mt-1 border-t border-neutral-100">
          <p className="text-sm text-neutral-500">
            Showing {sorted.length} of {members.length} {pageLabel}
            {sorted.length === 1 ? "" : "s"}
          </p>
        </div>
      </Card>

      {openDraftFor && openMember && openCampaign && (
        <DraftModal
          title={`${modalTitlePrefix} ${openMember.name}`}
          subtitle={modalSubtitle}
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

function GenerateAllAttendanceButton({
  members,
  missingCount,
  brief,
  tagFn,
  contextHint,
  modalSubtitle,
  onDone,
}: {
  members: { name: string }[];
  missingCount: number;
  brief: string;
  tagFn: (name: string) => string;
  contextHint: string;
  modalSubtitle: string;
  onDone: () => Promise<void>;
}) {
  const [state, setState] = useState<"idle" | "sending" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function generateAll() {
    if (!brief.trim()) {
      setError("Type what the draft should say first.");
      setState("error");
      return;
    }
    setError(null);
    setState("sending");
    try {
      const draft = await generateBriefDraft({ brief, channel: "Email", contextHint });
      const res = await fetch("/api/campaigns");
      const data = await res.json();
      const existing: Campaign[] = res.ok ? data.campaigns ?? [] : [];
      const toDraft = members.filter((m) => !existing.find((c) => c.notes === tagFn(m.name)));
      for (const m of toDraft) {
        const r = await fetch("/api/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campaignName: `${modalSubtitle}: ${m.name}`,
            channel: "Email",
            audience: "",
            subject: personalize(draft.subject, m.name),
            messageBody: personalize(draft.body, m.name),
            notes: tagFn(m.name),
          }),
        });
        if (!r.ok) throw new Error();
      }
      await onDone();
      setState("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong — try again.");
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
      {state === "error" && error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

function GenerateDraftButton({
  name,
  generateDraft,
  onGenerated,
}: {
  name: string;
  generateDraft: (name: string) => Promise<void>;
  onGenerated: () => Promise<void>;
}) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(false);

  return (
    <button
      onClick={async () => {
        setGenerating(true);
        setError(false);
        try {
          await generateDraft(name);
          await onGenerated();
        } catch {
          setError(true);
        } finally {
          setGenerating(false);
        }
      }}
      disabled={generating}
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-800 disabled:opacity-50"
    >
      <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
      {generating ? "Drafting…" : error ? "Retry" : "Generate Draft"}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Monthly Summary
// ---------------------------------------------------------------------------

function formatMonthLabel(monthStart: Date): string {
  const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
  const monthYear = monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  return `1–${daysInMonth} ${monthYear}`;
}

/** Oldest "Signed" date across all memberships — the real start of the gym's data, not an arbitrary lookback window. */
function oldestSignedDate(membershipRows: SheetRow[]): Date | null {
  let oldest: Date | null = null;
  for (const m of membershipRows) {
    const d = parseSlashDate(findField(m, "signed"));
    if (d && (!oldest || d.getTime() < oldest.getTime())) oldest = d;
  }
  return oldest;
}

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
      <PageHeader title="Summary" subtitle="Key numbers, plus a month-by-month recap since the first member joined." tool="Google Sheets (Summary + more)" />
      {loading && <LoadingCard />}
      {!loading && notConfigured && <SetupNeeded />}
      {!loading && !notConfigured && firstError && firstError.status === "error" && <SheetErrorCard message={firstError.message} />}
      {!loading && !notConfigured && !firstError && (
        <MonthlySummaryList
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

function MonthlySummaryList({
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
  // Captured once on mount — a static reference point for "now".
  const [now] = useState(() => new Date());
  const pastDueTotal = useMemo(() => pastDueRows.reduce((sum, p) => sum + parseMoney(findField(p, "total overdue")), 0), [pastDueRows]);

  const months = useMemo(() => {
    const start = oldestSignedDate(membershipRows);
    if (!start) return [];

    const list = [];
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth(), 1);

    while (cursor.getTime() <= last.getTime()) {
      const monthStart = new Date(cursor);
      const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      const inRange = (d: Date | null) => d !== null && d.getTime() >= monthStart.getTime() && d.getTime() < monthEnd.getTime();

      const newMembers = membershipRows.filter((m) => inRange(parseSlashDate(findField(m, "signed")))).length;
      const cancellations = cancelledRows.filter((c) => inRange(parseSlashDate(findField(c, "cancelled date", "cancelled")))).length;
      const revenue = paymentRows
        .filter((p) => inRange(parseSlashDate(findField(p, "date"))))
        .reduce((sum, p) => sum + parseMoney(findField(p, "amount paid", "amount")), 0);
      const campaignsSent = campaigns.filter((c) => (c.status === "Sent" || c.status === "Queued") && inRange(parseSlashDate(c.sentAt)));

      list.push({ monthStart, newMembers, cancellations, revenue, campaignsSent });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return list.reverse(); // most recent month first
  }, [now, membershipRows, cancelledRows, paymentRows, campaigns]);

  return (
    <div>
      <Card className="mb-4">
        <p className="text-xs text-neutral-400 uppercase tracking-wide font-medium">As of today</p>
        <div className="grid grid-cols-2 gap-4 mt-3">
          <Stat label="Past due total" value={`$${pastDueTotal.toLocaleString()}`} />
          <Stat label="Members past due" value={pastDueRows.length} />
        </div>
      </Card>

      {months.length === 0 ? (
        <Card className="text-center py-10 text-sm text-neutral-500">No membership signup dates found yet.</Card>
      ) : (
        <div className="space-y-2">
          {months.map((m, i) => (
            <details key={m.monthStart.getTime()} open={i === 0} className="group rounded-2xl border border-neutral-200 bg-white overflow-hidden">
              <summary className="cursor-pointer select-none list-none px-5 py-4 flex items-center justify-between gap-4 hover:bg-neutral-50">
                <div>
                  <p className="text-sm font-semibold text-neutral-900">{formatMonthLabel(m.monthStart)}</p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {m.newMembers} new · {m.cancellations} cancelled · ${m.revenue.toLocaleString()} revenue
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-neutral-400 shrink-0 transition-transform group-open:rotate-90" />
              </summary>
              <div className="px-5 pb-5 pt-1 border-t border-neutral-100">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <Stat label="New members" value={m.newMembers} />
                  <Stat label="Cancellations" value={m.cancellations} />
                  <Stat label="Revenue" value={`$${m.revenue.toLocaleString()}`} />
                  <Stat label="Campaigns sent" value={m.campaignsSent.length} />
                </div>
                <div className="mt-4">
                  <p className="text-sm font-semibold text-neutral-900 mb-2">Campaigns sent</p>
                  {m.campaignsSent.length === 0 ? (
                    <p className="text-sm text-neutral-400">None.</p>
                  ) : (
                    <ul className="text-sm text-neutral-600 space-y-1">
                      {m.campaignsSent.map((c) => (
                        <li key={c.row}>
                          {c.campaignName} ({c.channel}) — {c.status}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
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
