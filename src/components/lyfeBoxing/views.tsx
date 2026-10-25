"use client";

import { useMemo, useState } from "react";
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
import { Card, PageHeader, Stat } from "@/components/ui";

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

export function CancelledView() {
  const [query, setQuery] = useState("");
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
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
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
