"use client";

import { useEffect, useMemo, useState } from "react";
import { Mail, MessageSquare } from "lucide-react";
import { memberships } from "@/lib/lyfeBoxingData";
import {
  summary,
  cancellations,
  pastDue,
  reportsIndex,
  contacts,
  paymentsList,
  smsList,
} from "@/lib/lyfeBoxingOthersData";
import { AlertCircle, Calendar as CalendarIcon, Plus, Sparkles } from "lucide-react";
import { Badge, Card, PageHeader, Stat } from "@/components/ui";

function parseMoney(v: string) {
  return Number(v.replace(/[^0-9.-]/g, "")) || 0;
}

export function MembershipsView() {
  const [query, setQuery] = useState("");
  const [membershipFilter, setMembershipFilter] = useState("All");

  const membershipTypes = useMemo(() => {
    const types = Array.from(new Set(memberships.map((m) => m.membership))).sort();
    return ["All", ...types];
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return memberships.filter((m) => {
      const matchesQuery =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.membership.toLowerCase().includes(q) ||
        m.staff.toLowerCase().includes(q);
      const matchesType = membershipFilter === "All" || m.membership === membershipFilter;
      return matchesQuery && matchesType;
    });
  }, [query, membershipFilter]);

  const activeCount = memberships.filter((m) => m.expires === "Open Ended").length;
  const totalWeeklyRevenue = memberships.reduce((sum, m) => sum + parseMoney(m.totalMonthlyPayment), 0);
  const overdueCount = memberships.filter((m) => parseMoney(m.overdue) > 0).length;

  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- Map-based reduction; compiler can't statically preserve this, but memberships is module-level static data so re-running is cheap and correct
  const byMembership = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of memberships) counts.set(m.membership, (counts.get(m.membership) ?? 0) + 1);
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, []);

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Lyfe Boxing — Memberships"
        subtitle="Who's on which membership, what they owe, and when their next payment is due."
        tool="Google Sheets (All Memberships)"
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Stat label="Total members" value={memberships.length} />
        <Stat label="Open-ended / active" value={activeCount} />
        <Stat label="Overdue balances" value={overdueCount} />
        <Stat label="Total billed value" value={`$${totalWeeklyRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
      </div>

      <Card className="mb-6">
        <p className="text-base text-neutral-500 mb-3">Members per plan</p>
        <div className="flex flex-wrap gap-2">
          {byMembership.map(([name, count]) => (
            <span
              key={name}
              className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-sm text-neutral-700"
            >
              {name} <span className="text-neutral-400">· {count}</span>
            </span>
          ))}
        </div>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by name, plan, or staff..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full sm:w-80 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
        />
        <select
          value={membershipFilter}
          onChange={(e) => setMembershipFilter(e.target.value)}
          className="w-full sm:w-64 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
        >
          {membershipTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <p className="text-sm text-neutral-400 mb-3">
        Showing {filtered.length} of {memberships.length} members
      </p>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-neutral-400 border-b border-neutral-100">
              <th className="py-2 pr-4 font-medium">Student</th>
              <th className="py-2 pr-4 font-medium">Membership</th>
              <th className="py-2 pr-4 font-medium">Signed</th>
              <th className="py-2 pr-4 font-medium">Expires</th>
              <th className="py-2 pr-4 font-medium">Payment</th>
              <th className="py-2 pr-4 font-medium">Overdue</th>
              <th className="py-2 pr-4 font-medium">Next payment</th>
              <th className="py-2 pr-4 font-medium">Staff</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m, i) => {
              const isOverdue = parseMoney(m.overdue) > 0;
              return (
                <tr key={`${m.name}-${i}`} className="border-b border-neutral-50 last:border-0">
                  <td className="py-2.5 pr-4 text-neutral-900 font-medium whitespace-nowrap">{m.name}</td>
                  <td className="py-2.5 pr-4 text-neutral-600 whitespace-nowrap">{m.membership}</td>
                  <td className="py-2.5 pr-4 text-neutral-500 whitespace-nowrap">{m.signed}</td>
                  <td className="py-2.5 pr-4 text-neutral-500 whitespace-nowrap">{m.expires}</td>
                  <td className="py-2.5 pr-4 text-neutral-600 whitespace-nowrap">{m.payment}</td>
                  <td className={`py-2.5 pr-4 whitespace-nowrap ${isOverdue ? "text-neutral-900 font-medium" : "text-neutral-400"}`}>
                    {m.overdue}
                  </td>
                  <td className="py-2.5 pr-4 text-neutral-500 whitespace-nowrap">{m.nextPayment}</td>
                  <td className="py-2.5 pr-4 text-neutral-500 whitespace-nowrap">{m.staff}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export function SummaryView() {
  return (
    <div className="max-w-6xl">
      <PageHeader title="Summary" subtitle="Financial and membership summary for Oct 1–25." tool="Google Sheets (Summary)" />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {summary.map(([label, value]) => (
          <Stat key={label} label={label} value={value} />
        ))}
      </div>
    </div>
  );
}

function parseSlashDate(dateStr: string): Date | null {
  const m = (dateStr ?? "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  const [, mm, dd, yyyy] = m;
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
}

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
  messageBody:
    "Hey {First name}, it's Lyfe Boxing. We noticed you stepped away — mind telling us why? Just reply, we read every one. 🥊",
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
  const [query, setQuery] = useState("");

  const winbackEligible = useMemo(() => {
    // eslint-disable-next-line react-hooks/purity -- intentionally evaluated fresh each render: this is a point-in-time "days since cancellation" check, not cached state
    const now = Date.now();
    return cancellations.filter((c) => {
      const d = parseSlashDate(c.cancelledDate);
      return d !== null && now - d.getTime() >= 14 * 86_400_000;
    }).length;
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cancellations;
    return cancellations.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.membership.toLowerCase().includes(q) ||
        c.quitCategory.toLowerCase().includes(q)
    );
  }, [query]);

  const byCategory = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of cancellations) counts.set(c.quitCategory, (counts.get(c.quitCategory) ?? 0) + 1);
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, []);

  return (
    <div className="max-w-6xl">
      <PageHeader title="Cancelled (October)" subtitle="Members who cancelled this month, with reason and category." tool="Google Sheets (Cancelled Oct)" />
      <WinbackSection eligibleCount={winbackEligible} />
      <Card className="mb-6">
        <p className="text-base text-neutral-500 mb-3">Cancellations by category</p>
        <div className="flex flex-wrap gap-2">
          {byCategory.map(([name, count]) => (
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
      <p className="text-sm text-neutral-400 mb-3">Showing {filtered.length} of {cancellations.length} cancellations</p>
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
            {filtered.map((c, i) => (
              <tr key={`${c.name}-${i}`} className="border-b border-neutral-50 last:border-0 align-top">
                <td className="py-2.5 pr-4 text-neutral-900 font-medium whitespace-nowrap">{c.name}</td>
                <td className="py-2.5 pr-4 text-neutral-600 whitespace-nowrap">{c.membership}</td>
                <td className="py-2.5 pr-4 text-neutral-500 whitespace-nowrap">{c.signedDate}</td>
                <td className="py-2.5 pr-4 text-neutral-500 whitespace-nowrap">{c.cancelledDate}</td>
                <td className="py-2.5 pr-4 text-neutral-600 whitespace-nowrap">{c.quitCategory}</td>
                <td className="py-2.5 pr-4 text-neutral-500 max-w-xs break-words">{c.reason || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export function PastDueView() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const open = openIndex !== null ? pastDue[openIndex] : null;

  return (
    <div className="max-w-6xl">
      <PageHeader title="Past Due" subtitle="Members with failed or missed autoCharge payments." tool="Google Sheets (Past Due)" />
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-neutral-400 border-b border-neutral-100">
              <th className="py-2 pr-4 font-medium">Due</th>
              <th className="py-2 pr-4 font-medium">Contact</th>
              <th className="py-2 pr-4 font-medium">Contact details</th>
              <th className="py-2 pr-4 font-medium">Membership</th>
              <th className="py-2 pr-4 font-medium">Attempts</th>
              <th className="py-2 pr-4 font-medium">Last attempt</th>
              <th className="py-2 pr-4 font-medium">Payment amount</th>
              <th className="py-2 pr-4 font-medium">Total overdue</th>
              <th className="py-2 pr-4 font-medium">Email</th>
            </tr>
          </thead>
          <tbody>
            {pastDue.map((p, i) => (
              <tr key={`${p.contact}-${i}`} className="border-b border-neutral-50 last:border-0">
                <td className="py-2.5 pr-4 text-neutral-500 whitespace-nowrap">{p.due}</td>
                <td className="py-2.5 pr-4 text-neutral-900 font-medium whitespace-nowrap">{p.contact}</td>
                <td className="py-2.5 pr-4 text-neutral-500 whitespace-nowrap">{p.contactDetails}</td>
                <td className="py-2.5 pr-4 text-neutral-600 whitespace-nowrap">{p.description}</td>
                <td className="py-2.5 pr-4 text-neutral-500 whitespace-nowrap">{p.attempts}</td>
                <td className="py-2.5 pr-4 text-neutral-500 whitespace-nowrap">{p.lastAttempt}</td>
                <td className="py-2.5 pr-4 text-neutral-600 whitespace-nowrap">{p.paymentAmount}</td>
                <td className="py-2.5 pr-4 text-neutral-900 font-medium whitespace-nowrap">{p.totalOverdue}</td>
                <td className="py-2.5 pr-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Badge>{p.emailStatus}</Badge>
                    <button
                      onClick={() => setOpenIndex(i)}
                      className="text-sm text-neutral-500 underline underline-offset-2 hover:text-neutral-900"
                    >
                      View email
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={() => setOpenIndex(null)}
        >
          <div
            className="w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-sm text-neutral-400">Email to {open.contact}</p>
                <p className="text-base font-semibold text-neutral-900 mt-0.5">{open.emailSubject}</p>
              </div>
              <Badge>{open.emailStatus}</Badge>
            </div>
            <p className="text-sm text-neutral-500 mb-4">{open.email}</p>
            <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-4 text-sm text-neutral-700 whitespace-pre-wrap">
              {open.emailBody}
            </div>
            <button
              onClick={() => setOpenIndex(null)}
              className="mt-5 w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function parsePaymentDate(dateStr: string): Date | null {
  const m = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  const [, mm, dd, yyyy] = m;
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
}

function toInputDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addMonths(d: Date, months: number): Date {
  const result = new Date(d);
  result.setMonth(result.getMonth() + months);
  return result;
}

export function PaymentsView() {
  const [query, setQuery] = useState("");

  const earliestDate = useMemo(() => {
    const dates = paymentsList.map((p) => parsePaymentDate(p.date)).filter((d): d is Date => d !== null);
    return dates.length ? new Date(Math.min(...dates.map((d) => d.getTime()))) : new Date();
  }, []);

  const [fromDate, setFromDate] = useState(() => toInputDate(earliestDate));
  const toDate = useMemo(() => toInputDate(addMonths(new Date(fromDate), 1)), [fromDate]);

  const dateFiltered = useMemo(() => {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    return paymentsList.filter((p) => {
      const d = parsePaymentDate(p.date);
      return d !== null && d >= from && d < to;
    });
  }, [fromDate, toDate]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return dateFiltered;
    return dateFiltered.filter(
      (p) => p.memberName.toLowerCase().includes(q) || p.item.toLowerCase().includes(q) || p.paymentType.toLowerCase().includes(q)
    );
  }, [dateFiltered, query]);

  const totalPaid = useMemo(() => dateFiltered.reduce((sum, p) => sum + parseMoney(p.amountPaid), 0), [dateFiltered]);

  return (
    <div className="max-w-6xl">
      <PageHeader title="Payments" subtitle="Every payment captured in a one-month window, by member and method." tool="Google Sheets (Payments Oct 1-25)" />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <Stat label="Payments recorded" value={dateFiltered.length} />
        <Stat label="Total collected" value={`$${totalPaid.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
      </div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <label className="flex items-center gap-2 text-sm text-neutral-600">
          From
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
          />
        </label>
        <span className="text-sm text-neutral-400 self-center">1-month window, through {toDate}</span>
        <input
          type="text"
          placeholder="Search by name, item, or card type..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full sm:w-80 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
        />
      </div>
      <p className="text-sm text-neutral-400 mb-3">Showing {filtered.length} of {dateFiltered.length} payments in this window ({paymentsList.length} total on record)</p>
      <Card className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white">
            <tr className="text-left text-neutral-400 border-b border-neutral-100">
              <th className="py-2 pr-4 font-medium">Date</th>
              <th className="py-2 pr-4 font-medium">Member</th>
              <th className="py-2 pr-4 font-medium">Item</th>
              <th className="py-2 pr-4 font-medium">Type</th>
              <th className="py-2 pr-4 font-medium">Amount</th>
              <th className="py-2 pr-4 font-medium">Invoice #</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => (
              <tr key={`${p.invoiceNumber}-${i}`} className="border-b border-neutral-50 last:border-0">
                <td className="py-2.5 pr-4 text-neutral-500 whitespace-nowrap">{p.date}</td>
                <td className="py-2.5 pr-4 text-neutral-900 font-medium whitespace-nowrap">{p.memberName}</td>
                <td className="py-2.5 pr-4 text-neutral-500 max-w-sm truncate">{p.item}</td>
                <td className="py-2.5 pr-4 text-neutral-600 whitespace-nowrap">{p.paymentType}</td>
                <td className="py-2.5 pr-4 text-neutral-900 whitespace-nowrap">{p.amountPaid}</td>
                <td className="py-2.5 pr-4 text-neutral-400 whitespace-nowrap">{p.invoiceNumber}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export function SmsView() {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return smsList;
    return smsList.filter((s) => s.contactName.toLowerCase().includes(q) || s.text.toLowerCase().includes(q));
  }, [query]);

  return (
    <div className="max-w-6xl">
      <PageHeader title="SMS Conversations" subtitle="Most recent message per conversation thread." tool="Google Sheets (SMS Conversations)" />
      <input
        type="text"
        placeholder="Search by contact or message text..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full sm:w-80 mb-4 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
      />
      <p className="text-sm text-neutral-400 mb-3">Showing {filtered.length} of {smsList.length} conversations</p>
      <Card className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white">
            <tr className="text-left text-neutral-400 border-b border-neutral-100">
              <th className="py-2 pr-4 font-medium">Last message</th>
              <th className="py-2 pr-4 font-medium">Contact</th>
              <th className="py-2 pr-4 font-medium">Text</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, i) => (
              <tr key={`${s.contactName}-${i}`} className="border-b border-neutral-50 last:border-0 align-top">
                <td className="py-2.5 pr-4 text-neutral-500 whitespace-nowrap">{s.date || "Broadcast"}</td>
                <td className="py-2.5 pr-4 text-neutral-900 font-medium whitespace-nowrap">{s.contactName}</td>
                <td className="py-2.5 pr-4 text-neutral-600 max-w-xl break-words">{s.text}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export function ContactsView() {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.phone.includes(q)
    );
  }, [query]);

  return (
    <div className="max-w-6xl">
      <PageHeader title="Contacts" subtitle="Everyone in the system — students, staff, and misc entries." tool="Google Sheets (Contacts)" />
      <input
        type="text"
        placeholder="Search by name, email, or phone..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full sm:w-80 mb-4 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
      />
      <p className="text-sm text-neutral-400 mb-3">Showing {filtered.length} of {contacts.length} contacts</p>
      <Card className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white">
            <tr className="text-left text-neutral-400 border-b border-neutral-100">
              <th className="py-2 pr-4 font-medium">Name</th>
              <th className="py-2 pr-4 font-medium">Email</th>
              <th className="py-2 pr-4 font-medium">Phone</th>
              <th className="py-2 pr-4 font-medium">Type</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => (
              <tr key={`${c.name}-${i}`} className="border-b border-neutral-50 last:border-0">
                <td className="py-2.5 pr-4 text-neutral-900 font-medium whitespace-nowrap">{c.name}</td>
                <td className="py-2.5 pr-4 text-neutral-600 whitespace-nowrap">{c.email || "—"}</td>
                <td className="py-2.5 pr-4 text-neutral-500 whitespace-nowrap">{c.phone || "—"}</td>
                <td className="py-2.5 pr-4 text-neutral-500 whitespace-nowrap">{c.contactType}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export function ReportsView() {
  const bySection = useMemo(() => {
    const groups = new Map<string, typeof reportsIndex>();
    for (const r of reportsIndex) {
      if (!groups.has(r.section)) groups.set(r.section, []);
      groups.get(r.section)!.push(r);
    }
    return Array.from(groups.entries());
  }, []);

  return (
    <div className="max-w-6xl">
      <PageHeader title="Reports Index" subtitle="Every report available in the membership platform, grouped by section." tool="Google Sheets (Reports Index)" />
      <div className="grid sm:grid-cols-3 gap-4">
        {bySection.map(([section, reports]) => (
          <Card key={section}>
            <p className="text-base font-semibold text-neutral-900 mb-3">{section}</p>
            <ul className="space-y-2">
              {reports.map((r) => (
                <li key={r.urlPath} className="text-sm text-neutral-600">
                  {r.name}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}

type Campaign = {
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

function nextSendWindowPKT(): string {
  const now = new Date();
  const pktNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Karachi" }));
  const candidates = [0, 15].map((hour) => {
    const d = new Date(pktNow);
    d.setHours(hour, 0, 0, 0);
    if (d <= pktNow) d.setDate(d.getDate() + 1);
    return d;
  });
  const next = candidates.sort((a, b) => a.getTime() - b.getTime())[0];
  const label = next.getHours() === 0 ? "12 AM" : "3 PM";
  const dayLabel = next.toDateString() === pktNow.toDateString() ? "today" : "tomorrow";
  return `${label} PKT ${dayLabel}`;
}

const audienceOptions = [
  "All active members",
  "Past due members",
  ...Array.from(new Set(memberships.map((m) => m.membership))).sort(),
];

export function CampaignsView() {
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [sendingRow, setSendingRow] = useState<number | null>(null);
  const nextWindow = useMemo(() => nextSendWindowPKT(), []);

  async function load() {
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
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount, the standard pattern for client-rendered pages with no server-fetched data
    load();
  }, []);

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
            Campaigns aren&apos;t wired up yet — the Google service account needs edit access to the sheet,
            and its credentials need to be set as environment variables on this deployment.
          </p>
        </Card>
      )}
      {error && !notConfigured && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <p className="text-sm text-red-700">{error}</p>
        </Card>
      )}

      {campaigns && campaigns.length === 0 && !error && (
        <p className="text-sm text-neutral-400">No campaigns yet. Create one above.</p>
      )}

      <div className="space-y-3">
        {campaigns?.map((c) => {
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
                    {c.channel === "Email" && c.subject && (
                      <p className="text-sm text-neutral-400 mt-1">Subject: {c.subject}</p>
                    )}
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
    setSubmitting(true);
    setError(null);
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
      setCampaignName("");
      setSubject("");
      setMessageBody("");
      onCreated();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="mb-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-neutral-600 mb-1.5">Campaign name</label>
          <input
            required
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-neutral-600 mb-1.5">Channel</label>
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
            <label className="block text-sm text-neutral-600 mb-1.5">Audience</label>
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
            <label className="block text-sm text-neutral-600 mb-1.5">Subject</label>
            <input
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
            />
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm text-neutral-600">
              Message body <span className="text-neutral-400">— use {"{First name}"} to personalize</span>
            </label>
            {channel === "SMS" && (
              <span className={`text-xs ${overSmsLimit ? "text-red-600 font-medium" : "text-neutral-400"}`}>
                {smsLength} / 145
              </span>
            )}
          </div>
          <textarea
            required
            rows={5}
            value={messageBody}
            onChange={(e) => setMessageBody(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
          />
          {overSmsLimit && (
            <p className="text-xs text-red-600 mt-1">This will send as more than one SMS segment.</p>
          )}
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
  const trialMembers = useMemo(
    () => memberships.filter((m) => TRIAL_MEMBERSHIP_NAMES.includes(m.membership)),
    []
  );
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
            <p className="font-semibold text-neutral-900">
              {trialMembers.length} trial member{trialMembers.length === 1 ? "" : "s"} found
            </p>
            <p className="text-sm text-neutral-500 mt-1">
              Drafts a first-class SMS and a day-3 upgrade email into Campaigns as Drafts.
            </p>
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

      {trialMembers.length === 0 ? (
        <Card className="text-center py-10 text-sm text-neutral-500">No trial members right now.</Card>
      ) : (
        <div className="space-y-3">
          {trialMembers.map((m, i) => (
            <Card key={`${m.name}-${i}`}>
              <p className="font-semibold text-neutral-900">{m.name}</p>
              <p className="text-sm text-neutral-500 mt-0.5">{m.membership}</p>
            </Card>
          ))}
        </div>
      )}
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
      <PageHeader
        title="At Risk"
        subtitle="Members who haven't attended in 10+ days."
        tool="Google Sheets (Attendance) + Campaigns"
      />
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
        title='Waiting on the "Attendance" tab'
        body="Once Attendance has Classes Last 30 Days, this page will flag Light Boxer 1x / Basic Boxer 2x members over their monthly allowance and let you draft an upgrade-to-Unlimited email."
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Weekly Summary
// ---------------------------------------------------------------------------

export function WeeklySummaryView() {
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);

  useEffect(() => {
    fetch("/api/campaigns")
      .then((r) => r.json())
      .then((d) => setCampaigns(d.campaigns ?? null))
      .catch(() => setCampaigns(null));
  }, []);

  // Captured once on mount — a static reference point for "within the last 7 days", not re-evaluated on every render.
  const [now] = useState(() => Date.now());
  const withinWeek = useMemo(
    () => (d: Date | null) => d !== null && now - d.getTime() <= 7 * 86_400_000,
    [now]
  );

  const newMembers = useMemo(
    () => memberships.filter((m) => withinWeek(parsePaymentDate(m.signed))).length,
    [withinWeek]
  );
  const cancellationsThisWeek = useMemo(
    () => cancellations.filter((c) => withinWeek(parsePaymentDate(c.cancelledDate))).length,
    [withinWeek]
  );
  const revenue = useMemo(
    () =>
      paymentsList
        .filter((p) => withinWeek(parsePaymentDate(p.date)))
        .reduce((sum, p) => sum + parseMoney(p.amountPaid), 0),
    [withinWeek]
  );
  const pastDueTotal = useMemo(() => pastDue.reduce((sum, p) => sum + parseMoney(p.totalOverdue), 0), []);
  const campaignsSentThisWeek = useMemo(
    () =>
      (campaigns ?? []).filter(
        (c) => (c.status === "Sent" || c.status === "Queued") && withinWeek(parsePaymentDate(c.sentAt))
      ),
    [campaigns, withinWeek]
  );

  return (
    <div className="max-w-4xl">
      <PageHeader title="Weekly Summary" subtitle="A clean, screenshot-ready recap to send to Alex." />
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
          <Stat label="Members past due" value={pastDue.length} />
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
            <p className="text-xs text-neutral-400">
              Saved with Status &quot;Requested&quot; — your assistant enters it into Spark.
            </p>
          </form>
        </Card>
      )}

      {notConfigured && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-800">
            Booking isn&apos;t wired up yet — add an &quot;Appointments&quot; tab (Date, Time, Type, Member, Coach, Status)
            to the sheet and make sure the service account has edit access.
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
