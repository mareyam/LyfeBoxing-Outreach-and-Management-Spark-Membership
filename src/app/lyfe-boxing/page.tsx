"use client";

import { useMemo, useState } from "react";
import { memberships } from "@/lib/lyfeBoxingData";
import { Card, PageHeader, Stat } from "@/components/ui";

function parseMoney(v: string) {
  return Number(v.replace(/[^0-9.-]/g, "")) || 0;
}

export default function Page() {
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
