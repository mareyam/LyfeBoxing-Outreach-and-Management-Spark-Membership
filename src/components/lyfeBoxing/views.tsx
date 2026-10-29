"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, AlertTriangle, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Mail, MessageSquare, Plus, Sparkles } from "lucide-react";
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

// ---------------------------------------------------------------------------
// Shared live-data fetching. Every page here reads straight from the Google
// Sheet at request time via /api/lyfe-data — nothing in this file holds
// real member data. Column names are matched fuzzily (see findField) since
// the exact header text in the live sheet may not match these guesses
// exactly; unmatched fields just render blank instead of crashing.
// ---------------------------------------------------------------------------

type SheetRow = Record<string, string>;

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

const WINBACK_EMAIL = {
  campaignName: "Win-back: Free comeback class",
  channel: "Email" as const,
  subject: "We miss you at Lyfe Boxing, {First name}",
  messageBody:
    "Hey {First name},\n\nIt's been a minute since we've seen you in the gym — and honestly, it's not the same without you.\n\nWe'd love to have you back for a free class, on us: [OFFER]\n\nNo pressure, no sales pitch. Just come throw some punches and remember why you started.\n\nLyfe Boxing",
};

const WINBACK_SMS = {
  campaignName: "Win-back: Why'd you leave?",
  channel: "SMS" as const,
  subject: "",
  messageBody: "Hey {First name}, it's Lyfe Boxing. We noticed you stepped away — mind telling us why? Just reply, we read every one. 🥊",
};

function WinbackSection({ eligibleCount }: { eligibleCount: number }) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function generate() {
    setState("sending");
    try {
      for (const draft of [WINBACK_EMAIL, WINBACK_SMS]) {
        const res = await fetch("/api/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campaignName: draft.campaignName,
            channel: draft.channel,
            audience: "",
            subject: draft.subject,
            messageBody: draft.messageBody,
            notes: "Audience: Cancelled members, 14+ days (not a dropdown option — select recipients manually before sending)",
          }),
        });
        if (!res.ok) throw new Error((await res.json())?.error ?? "Failed to draft campaign.");
      }
      setState("done");
    } catch {
      setState("error");
    }
  }

  return (
    <Card className="mb-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="font-semibold text-neutral-900">
            Win-back: {eligibleCount} member{eligibleCount === 1 ? "" : "s"} cancelled 14+ days ago
          </p>
          <p className="text-sm text-neutral-500 mt-1">
            Drafts a free-class email and a short &quot;why&apos;d you leave&quot; SMS into Campaigns as Drafts.
          </p>
        </div>
        {state === "done" ? (
          <span className="text-sm font-medium text-neutral-600">Drafts added to Campaigns</span>
        ) : (
          <button
            onClick={generate}
            disabled={state === "sending"}
            className="rounded-full bg-neutral-900 text-white px-4 py-2 text-sm font-medium hover:bg-neutral-800 disabled:opacity-50"
          >
            {state === "sending" ? "Drafting…" : "Generate win-back drafts"}
          </button>
        )}
        {state === "error" && <p className="text-sm text-red-600 w-full">Something went wrong — try again.</p>}
      </div>
    </Card>
  );
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

  const mapped = rows.map((r) => ({
    name: findField(r, "name"),
    membership: findField(r, "membership"),
    signedDate: findField(r, "signed"),
    cancelledDate: findField(r, "cancelled date", "cancelled"),
    quitCategory: findField(r, "quit category", "category"),
    reason: findField(r, "reason"),
  }));

  // eslint-disable-next-line react-hooks/purity -- intentionally evaluated fresh each render: a point-in-time "days since cancellation" check, not cached state
  const winbackNow = Date.now();
  const winbackEligible = mapped.filter((c) => {
    const d = parseSlashDate(c.cancelledDate);
    return d !== null && winbackNow - d.getTime() >= 14 * 86_400_000;
  }).length;

  const byCategory = new Map<string, number>();
  for (const c of mapped) {
    const key = c.quitCategory || "Not Assigned";
    byCategory.set(key, (byCategory.get(key) ?? 0) + 1);
  }
  const categoryList = Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? mapped.filter((c) => c.name.toLowerCase().includes(q) || c.membership.toLowerCase().includes(q) || c.quitCategory.toLowerCase().includes(q))
    : mapped;

  const { pageItems, page, setPage, totalPages } = usePagination(filtered);

  return (
    <>
      <WinbackSection eligibleCount={winbackEligible} />
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
        placeholder="Search by name, plan, or reason category..."
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
              <th className="py-2 pr-4 font-medium">Name</th>
              <th className="py-2 pr-4 font-medium">Membership</th>
              <th className="py-2 pr-4 font-medium">Signed</th>
              <th className="py-2 pr-4 font-medium">Cancelled</th>
              <th className="py-2 pr-4 font-medium">Category</th>
              <th className="py-2 pr-4 font-medium">Reason</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((c, i) => (
              <tr key={`${c.name}-${i}`} className="border-b border-neutral-50 last:border-0 align-top">
                <td className="py-2.5 pr-4 text-neutral-900 font-medium whitespace-nowrap">{c.name || "—"}</td>
                <td className="py-2.5 pr-4 text-neutral-600 whitespace-nowrap">{c.membership || "—"}</td>
                <td className="py-2.5 pr-4 text-neutral-500 whitespace-nowrap">{c.signedDate || "—"}</td>
                <td className="py-2.5 pr-4 text-neutral-500 whitespace-nowrap">{c.cancelledDate || "—"}</td>
                <td className="py-2.5 pr-4 text-neutral-600 whitespace-nowrap">{c.quitCategory || "—"}</td>
                <td className="py-2.5 pr-4 text-neutral-500 max-w-xs break-words">{c.reason || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <PaginationControls page={page} totalPages={totalPages} onChange={setPage} />
      </Card>
    </>
  );
}

// ---------------------------------------------------------------------------
// Past Due
// ---------------------------------------------------------------------------

type PastDueMember = {
  name: string;
  totalOverdue: string;
  paymentAmount: string;
  lastAttempt: string;
  emailSubject: string;
  emailBody: string;
  emailStatus: string;
};

export function PastDueView() {
  return (
    <div className="max-w-5xl">
      <PageHeader title="Past Due" subtitle="Members behind on payment, with the draft collections email for each." tool="Google Sheets (Past Due)" />
      <SheetGate tab="Past Due">{(rows) => <PastDueList rows={rows} />}</SheetGate>
    </div>
  );
}

function PastDueList({ rows }: { rows: SheetRow[] }) {
  const [open, setOpen] = useState<PastDueMember | null>(null);

  const mapped: PastDueMember[] = rows.map((r) => ({
    name: findField(r, "contact", "name", "member"),
    totalOverdue: findField(r, "total overdue"),
    paymentAmount: findField(r, "payment amount"),
    lastAttempt: findField(r, "last attempt"),
    emailSubject: findField(r, "email subject"),
    emailBody: findField(r, "email body"),
    emailStatus: findField(r, "email status"),
  }));

  const totalOwed = mapped.reduce((sum, m) => sum + parseMoney(m.totalOverdue), 0);
  const { pageItems, page, setPage, totalPages } = usePagination(mapped);

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <Stat label="Members past due" value={mapped.length} />
        <Stat label="Total overdue amount" value={`$${totalOwed.toLocaleString()}`} />
      </div>

      {mapped.length === 0 ? (
        <Card className="text-center py-10 text-sm text-neutral-500">No one is past due.</Card>
      ) : (
        <>
          <div className="space-y-3">
            {pageItems.map((m, i) => (
              <Card key={i}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-neutral-900">{m.name || "Unnamed member"}</p>
                    <p className="text-sm text-neutral-500 mt-0.5">
                      {m.totalOverdue ? `$${parseMoney(m.totalOverdue).toLocaleString()}` : "Amount not set"} overdue
                      {m.lastAttempt ? ` · last attempt ${m.lastAttempt}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {m.emailStatus && <Badge>{m.emailStatus}</Badge>}
                    {m.emailBody ? (
                      <button
                        onClick={() => setOpen(m)}
                        className="rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                      >
                        View email
                      </button>
                    ) : (
                      <span className="text-xs text-neutral-400">No email drafted</span>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <PaginationControls page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}

      {open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setOpen(null)}>
          <div
            className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm text-neutral-400">Email to {open.name}</p>
            <p className="text-base font-semibold text-neutral-900 mt-0.5">{open.emailSubject || "(no subject)"}</p>
            <p className="text-sm text-neutral-700 whitespace-pre-line leading-relaxed mt-4">{open.emailBody}</p>
          </div>
        </div>
      )}
    </>
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
};

function nextSendWindowPKT(): string {
  const now = new Date();
  const pktNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Karachi" }));
  const candidates = [3, 12, 15, 24].map((h) => {
    const d = new Date(pktNow);
    d.setHours(h % 24, 0, 0, 0);
    if (h === 24) d.setDate(d.getDate() + 1);
    return d;
  });
  const next = candidates.find((d) => d.getTime() > pktNow.getTime()) ?? candidates[0];
  return next.toLocaleString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }) + " PKT";
}

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

export function CampaignsView() {
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [sendingRow, setSendingRow] = useState<number | null>(null);
  const nextWindow = useMemo(() => nextSendWindowPKT(), []);

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

  async function handleSend(row: number) {
    setSendingRow(row);
    try {
      const res = await fetch("/api/campaigns/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ row }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Failed to queue campaign.");
      } else {
        await load();
      }
    } finally {
      setSendingRow(null);
    }
  }

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Campaigns"
        subtitle="Email and SMS campaigns. Sending happens through Spark on the next 3 PM / 12 AM PKT run — this page only queues them."
        tool="Google Sheets (Campaigns) + Spark"
      />

      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-neutral-500">
          Next send window: <span className="text-neutral-900 font-medium">{nextWindow}</span>
        </p>
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

      {campaigns && campaigns.length === 0 && !error && <p className="text-sm text-neutral-400">No campaigns yet. Create one above.</p>}

      <div className="space-y-3">
        {pagedCampaigns.map((c) => {
          const locked = c.status === "Sending" || c.status === "Sent";
          const canSend = c.status === "Draft" || c.status === "Error";
          return (
            <Card key={c.row}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-full bg-neutral-50 border border-neutral-200 flex items-center justify-center shrink-0">
                    {c.channel === "SMS" ? (
                      <MessageSquare className="h-4 w-4 text-neutral-500" strokeWidth={1.75} />
                    ) : (
                      <Mail className="h-4 w-4 text-neutral-500" strokeWidth={1.75} />
                    )}
                  </div>
                  <div>
                    <p className="text-base font-semibold text-neutral-900">{c.campaignName}</p>
                    <p className="text-sm text-neutral-500 mt-0.5">
                      {c.channel} · {c.audience}
                      {c.recipients && ` · ${c.recipients} recipients`}
                    </p>
                    {c.channel === "Email" && c.subject && <p className="text-sm text-neutral-400 mt-1">Subject: {c.subject}</p>}
                    <p className="text-sm text-neutral-600 mt-2 max-w-xl break-words">{c.messageBody}</p>
                    {c.sentAt && <p className="text-xs text-neutral-400 mt-2">Sent at {c.sentAt}</p>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <Badge>{c.status}</Badge>
                  {canSend && (
                    <button
                      onClick={() => handleSend(c.row)}
                      disabled={sendingRow === c.row}
                      className="rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                    >
                      {sendingRow === c.row ? "Queuing…" : "Send"}
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

const TRIAL_SMS = {
  campaignName: "Trial: After first class",
  channel: "SMS" as const,
  subject: "",
  messageBody: "Great first class, {First name}! How are you feeling? We're pumped to have you training with us at Lyfe Boxing.",
};

const TRIAL_UPGRADE_EMAIL = {
  campaignName: "Trial: Day 3 upgrade offer",
  channel: "Email" as const,
  subject: "Ready to make it official, {First name}?",
  messageBody:
    "Hey {First name},\n\nYou're a few days into training with us and we love having you in the gym.\n\nIf you're feeling it, now's a great time to lock in a membership — Basic Boxer 2x or Knock Out Boxer Unlimited both give you room to keep building momentum. [OFFER]\n\nLet us know and we'll get you set up.\n\nLyfe Boxing",
};

export function TrialConversionView() {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function generate() {
    setState("sending");
    try {
      for (const draft of [TRIAL_SMS, TRIAL_UPGRADE_EMAIL]) {
        const res = await fetch("/api/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campaignName: draft.campaignName,
            channel: draft.channel,
            audience: "1 Day Boxing Program",
            subject: draft.subject,
            messageBody: draft.messageBody,
            notes: "Trial / 1 Day Boxing Program members — review audience before sending if targeting Ignite Pro trial too",
          }),
        });
        if (!res.ok) throw new Error((await res.json())?.error ?? "Failed to draft campaign.");
      }
      setState("done");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Trial Conversion"
        subtitle="Trial and 1-Day Boxing Program members to follow up with and convert to a full membership."
        tool="Google Sheets (All Memberships) + Campaigns"
      />

      <Card className="mb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-semibold text-neutral-900">Drafts for trial members</p>
            <p className="text-sm text-neutral-500 mt-1">Drafts a first-class SMS and a day-3 upgrade email into Campaigns as Drafts.</p>
          </div>
          {state === "done" ? (
            <span className="text-sm font-medium text-neutral-600">Drafts added to Campaigns</span>
          ) : (
            <button
              onClick={generate}
              disabled={state === "sending"}
              className="inline-flex items-center gap-2 rounded-full bg-neutral-900 text-white px-4 py-2 text-sm font-medium hover:bg-neutral-800 disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" strokeWidth={2} />
              {state === "sending" ? "Drafting…" : "Generate conversion drafts"}
            </button>
          )}
          {state === "error" && <p className="text-sm text-red-600 w-full">Something went wrong — try again.</p>}
        </div>
      </Card>

      <SheetGate tab="All Memberships">
        {(rows) => {
          const trialMembers = rows
            .map((r) => ({ name: findField(r, "name"), membership: findField(r, "membership") }))
            .filter((m) => TRIAL_MEMBERSHIP_NAMES.includes(m.membership));

          if (trialMembers.length === 0) {
            return <Card className="text-center py-10 text-sm text-neutral-500">No trial members right now.</Card>;
          }
          return (
            <div className="space-y-3">
              {trialMembers.map((m, i) => (
                <Card key={`${m.name}-${i}`}>
                  <p className="font-semibold text-neutral-900">{m.name}</p>
                  <p className="text-sm text-neutral-500 mt-0.5">{m.membership}</p>
                </Card>
              ))}
            </div>
          );
        }}
      </SheetGate>
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
