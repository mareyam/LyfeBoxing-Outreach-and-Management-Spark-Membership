"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Filter, Search, Send, Sparkles } from "lucide-react";
import { Avatar, Card } from "@/components/ui";
import { DraftModal, apiError, categoryColor, usePagination, usePollWhileQueued } from "@/components/lyfeBoxing/views";
import { decodeEmailDraft, parseSheetDate } from "@/lib/leadSequence";

type SheetRow = Record<string, string> & { _row: number };

type Lead = {
  row: number;
  fullName: string;
  email: string;
  phone: string;
  stage: string;
  nextFollowUp: string;
  sequenceStep: string;
  emailStatus: string;
  emailDraft: string;
  lastContacted: string;
};

type Digest = {
  date: string;
  newLeads: string;
  replies: string;
  trialsBooked: string;
  noShows: string;
  joined: string;
  followUpsDue: string;
  summary: string;
};

function field(row: SheetRow, ...candidates: string[]): string {
  const keys = Object.keys(row);
  for (const candidate of candidates) {
    const exact = keys.find((key) => key.toLowerCase() === candidate.toLowerCase());
    if (exact) return row[exact] ?? "";
  }
  return "";
}

function toLead(row: SheetRow): Lead {
  return {
    row: row._row,
    fullName: field(row, "Full Name", "Name"),
    email: field(row, "Email"),
    phone: field(row, "Phone"),
    stage: field(row, "Stage"),
    nextFollowUp: field(row, "Next Follow-up Date"),
    sequenceStep: field(row, "Sequence Step"),
    emailStatus: field(row, "Email Status"),
    emailDraft: field(row, "Email Draft"),
    lastContacted: field(row, "Last Contacted"),
  };
}

function toDigest(row: SheetRow): Digest {
  return {
    date: field(row, "Date"),
    newLeads: field(row, "New Leads"),
    replies: field(row, "Replies"),
    trialsBooked: field(row, "Trials Booked"),
    noShows: field(row, "No-shows", "No Shows"),
    joined: field(row, "Joined"),
    followUpsDue: field(row, "Follow-ups Due"),
    summary: field(row, "Summary"),
  };
}

function latestDigest(rows: SheetRow[]): Digest | null {
  if (rows.length === 0) return null;
  const parsed = rows.map(toDigest);
  const dated = parsed
    .map((item) => ({ item, date: parseSheetDate(item.date) }))
    .filter((item): item is { item: Digest; date: Date } => item.date !== null)
    .sort((a, b) => b.date.getTime() - a.date.getTime());
  return dated[0]?.item ?? parsed[parsed.length - 1];
}

const STAGES = ["New", "Contacted", "Replied", "Trial Booked", "No-show", "Joined", "Lost"];

export function LeadsView() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [digest, setDigest] = useState<Digest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const [tabMissing, setTabMissing] = useState(false);
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"followup-asc" | "followup-desc" | "name-asc" | "stage-asc">("followup-asc");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [openRow, setOpenRow] = useState<number | null>(null);
  const [generating, setGenerating] = useState<number | "bulk" | null>(null);
  const [sending, setSending] = useState<number | "bulk" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [leadRes, digestRes] = await Promise.all([
        fetch(`/api/lyfe-data?tab=${encodeURIComponent("Leads")}`),
        fetch(`/api/lyfe-data?tab=${encodeURIComponent("Digest")}`),
      ]);
      const leadData = await leadRes.json();
      if (!leadRes.ok) {
        setNotConfigured(!!leadData.notConfigured);
        setTabMissing(!!leadData.tabMissing);
        setError(leadData.error ?? "Couldn't load leads.");
        return;
      }
      setLeads((leadData.rows ?? []).map(toLead));
      setError(null);
      setNotConfigured(false);
      setTabMissing(false);
      if (digestRes.ok) {
        const digestData = await digestRes.json();
        setDigest(latestDigest(digestData.rows ?? []));
      } else {
        setDigest(null);
      }
    } catch {
      setError("Couldn't load leads.");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load the sheet once on mount
    load();
  }, [load]);

  usePollWhileQueued(!!leads?.some((lead) => lead.emailStatus === "Queued"), load);

  const statusOptions = useMemo(
    () => Array.from(new Set((leads ?? []).map((l) => l.emailStatus || "Not Assigned"))).sort(),
    [leads]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (leads ?? []).filter((lead) => {
      if (stage && lead.stage.toLowerCase() !== stage.toLowerCase()) return false;
      if (statusFilter && (lead.emailStatus || "Not Assigned") !== statusFilter) return false;
      if (!q) return true;
      return (
        lead.fullName.toLowerCase().includes(q) ||
        lead.email.toLowerCase().includes(q) ||
        lead.phone.toLowerCase().includes(q) ||
        lead.stage.toLowerCase().includes(q)
      );
    });
    return list.sort((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return a.fullName.localeCompare(b.fullName);
        case "stage-asc":
          return a.stage.localeCompare(b.stage);
        case "followup-asc":
        case "followup-desc": {
          const aDate = parseSheetDate(a.nextFollowUp);
          const bDate = parseSheetDate(b.nextFollowUp);
          if (!aDate && !bDate) return a.fullName.localeCompare(b.fullName);
          if (!aDate) return 1;
          if (!bDate) return -1;
          const diff = aDate.getTime() - bDate.getTime();
          return sortBy === "followup-asc" ? diff : -diff;
        }
        default:
          return 0;
      }
    });
  }, [leads, query, stage, statusFilter, sortBy]);

  const { pageItems, page, setPage, totalPages } = usePagination(filtered);
  useEffect(() => {
    setPage(1);
  }, [query, stage, statusFilter, setPage]);

  const activeFilterCount = [stage, statusFilter].filter(Boolean).length;
  function clearFilters() {
    setStage("");
    setStatusFilter("");
  }

  const openLead = leads?.find((lead) => lead.row === openRow);
  const openDraft = openLead ? decodeEmailDraft(openLead.emailDraft) : { subject: "", body: "" };

  function canSend(lead: Lead): boolean {
    return !!lead.email.trim() && !!decodeEmailDraft(lead.emailDraft).body && lead.emailStatus !== "Sent" && lead.emailStatus !== "Sending";
  }

  async function generate(rows: number[]) {
    setActionError(null);
    setGenerating(rows.length === 1 ? rows[0] : "bulk");
    try {
      for (const row of rows) {
        const res = await fetch("/api/leads/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ row }),
        });
        if (!res.ok) {
          setActionError(await apiError(res, "Couldn't generate a draft."));
          break;
        }
      }
      await load();
    } finally {
      setGenerating(null);
    }
  }

  async function send(lead: Lead, subject?: string, messageBody?: string) {
    const draft = decodeEmailDraft(lead.emailDraft);
    setActionError(null);
    setSending(lead.row);
    try {
      const res = await fetch("/api/leads/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          row: lead.row,
          subject: subject ?? draft.subject,
          messageBody: messageBody ?? draft.body,
        }),
      });
      const message = res.ok ? null : await apiError(res, "Couldn't queue this lead.");
      await load();
      if (message) throw new Error(message);
    } finally {
      setSending(null);
    }
  }

  return (
    <div className="max-w-[1600px]">
      <div className="mb-2 flex items-center gap-1.5 text-sm text-neutral-400">
        <Link href="/lyfe-boxing" className="hover:text-blue-600">
          Home
        </Link>
        <span>›</span>
        <span className="text-neutral-600 font-medium">Leads</span>
      </div>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold text-neutral-900 tracking-tight">Leads</h1>
          <p className="text-base text-neutral-500 mt-2 max-w-2xl">
            Follow-ups for new leads. Generate a draft, edit it, then send. Grok delivers anything marked Queued and writes Last Contacted.
          </p>
          <span className="inline-flex items-center gap-1.5 text-sm text-blue-600 font-medium mt-3">
            <CalendarIcon className="h-3.5 w-3.5" strokeWidth={1.75} /> Google Sheets Source
          </span>
        </div>
        <Link
          href="/lyfe-boxing/playbook"
          className="shrink-0 mt-1 rounded-full border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Playbook
        </Link>
      </div>

      {digest && (
        <Card className="mb-6">
          <p className="text-sm text-neutral-400">Latest digest{digest.date ? ` · ${digest.date}` : ""}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3">
            <DigestStat label="New leads" value={digest.newLeads || "—"} />
            <DigestStat label="Replies" value={digest.replies || "—"} />
            <DigestStat label="Trials booked" value={digest.trialsBooked || "—"} />
            <DigestStat label="No-shows" value={digest.noShows || "—"} />
            <DigestStat label="Joined" value={digest.joined || "—"} />
            <DigestStat label="Follow-ups due" value={digest.followUpsDue || "—"} />
          </div>
          {digest.summary && <p className="text-sm text-neutral-600 mt-4 whitespace-pre-line">{digest.summary}</p>}
        </Card>
      )}

      {notConfigured && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-800">Google Sheets isn&apos;t connected on this deployment yet.</p>
        </Card>
      )}
      {tabMissing && (
        <Card className="mb-6">
          <p className="font-semibold text-neutral-900">Waiting on the Leads tab</p>
          <p className="text-sm text-neutral-500 mt-1">Grok adds new leads to the Leads tab. This page will fill in once that tab exists.</p>
        </Card>
      )}
      {error && !notConfigured && !tabMissing && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <p className="text-sm text-red-700">{error}</p>
        </Card>
      )}
      {actionError && <p className="text-sm text-red-600 mb-4">{actionError}</p>}

      {leads && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <p className="text-base font-semibold text-neutral-900">Lead List</p>
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
                      <label className="text-xs font-medium text-neutral-500 block mb-1">Stage</label>
                      <select
                        value={stage}
                        onChange={(e) => setStage(e.target.value)}
                        className="w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-sm text-neutral-900"
                      >
                        <option value="">All stages</option>
                        {STAGES.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>
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
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700"
              >
                <option value="followup-asc">Next Follow-up (Soonest)</option>
                <option value="followup-desc">Next Follow-up (Latest)</option>
                <option value="name-asc">Name (A–Z)</option>
                <option value="stage-asc">Stage (A–Z)</option>
              </select>
              <div className="relative w-56 shrink-0">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" strokeWidth={1.75} />
                <input
                  type="text"
                  placeholder="Search leads..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 bg-white pl-9 pr-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                />
              </div>
            </div>
          </div>
          {selected.size > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() =>
                  generate(
                    [...selected].filter((row) => {
                      const lead = leads?.find((item) => item.row === row);
                      return lead && !["Queued", "Sent", "Sending"].includes(lead.emailStatus);
                    })
                  )
                }
                disabled={generating === "bulk"}
                className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {generating === "bulk" ? "Drafting…" : `Generate selected (${selected.size})`}
              </button>
              <button
                onClick={async () => {
                  const items = (leads ?? [])
                    .filter((lead) => selected.has(lead.row) && canSend(lead))
                    .map((lead) => {
                      const draft = decodeEmailDraft(lead.emailDraft);
                      return { row: lead.row, subject: draft.subject, messageBody: draft.body };
                    });
                  if (items.length === 0) {
                    setActionError("Nothing to send — each selected lead needs an email and a draft.");
                    return;
                  }
                  setSending("bulk");
                  setActionError(null);
                  try {
                    const res = await fetch("/api/leads/send-bulk", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ items }),
                    });
                    if (!res.ok) setActionError(await apiError(res, "Couldn't queue the selected leads."));
                    setSelected(new Set());
                    await load();
                  } finally {
                    setSending(null);
                  }
                }}
                disabled={sending === "bulk"}
                className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                {sending === "bulk" ? "Sending…" : `Send selected (${selected.size})`}
              </button>
            </div>
          )}
          <table className="w-full text-sm table-fixed">
            <thead>
              <tr className="text-left text-xs font-semibold text-neutral-400 uppercase tracking-wide border-b border-neutral-100 bg-neutral-50/60">
                <th className="py-3 pr-2 w-6"></th>
                <th className="py-3 pr-4 w-[24%]">Lead</th>
                <th className="py-3 pr-4 w-[14%]">Stage</th>
                <th className="py-3 pr-4 w-[14%]">Next Follow-up</th>
                <th className="py-3 pr-4 w-[12%]">Step</th>
                <th className="py-3 pr-4 w-[16%]">Email Status</th>
                <th className="py-3 pr-4 w-[20%]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((lead) => {
                const isNew = lead.emailStatus === "Draft";
                return (
                  <tr
                    key={lead.row}
                    onClick={() => setOpenRow(lead.row)}
                    className={`border-b border-neutral-50 last:border-0 align-top cursor-pointer hover:bg-neutral-50 ${isNew ? "bg-amber-50/60" : ""}`}
                  >
                    <td className="py-3 pr-2" onClick={(e) => e.stopPropagation()}>
                      {canSend(lead) && (
                        <input
                          type="checkbox"
                          checked={selected.has(lead.row)}
                          onChange={() =>
                            setSelected((prev) => {
                              const next = new Set(prev);
                              if (next.has(lead.row)) next.delete(lead.row);
                              else next.add(lead.row);
                              return next;
                            })
                          }
                          className="rounded border-neutral-300"
                        />
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="flex items-center gap-2.5 min-w-0">
                        <Avatar name={lead.fullName} size="sm" />
                        <span className="min-w-0">
                          <span className="block text-neutral-900 font-semibold truncate">{lead.fullName || "—"}</span>
                          <span className="block text-xs text-neutral-400 truncate">{lead.email || "—"}</span>
                        </span>
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      {lead.stage ? (
                        <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium ${categoryColor(lead.stage)}`}>
                          {lead.stage}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 pr-4 text-neutral-700 truncate">{lead.nextFollowUp || "—"}</td>
                    <td className="py-3 pr-4 text-neutral-500 truncate">{lead.sequenceStep || "—"}</td>
                    <td className="py-3 pr-4">
                      {lead.emailStatus ? (
                        <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium ${categoryColor(lead.emailStatus)}`}>
                          {lead.emailStatus}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 pr-4" onClick={(e) => e.stopPropagation()}>
                      {!lead.email ? (
                        <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600">
                          No email
                        </span>
                      ) : (
                        <div className="flex items-center gap-3">
                          {!["Queued", "Sent", "Sending"].includes(lead.emailStatus) && (
                            <button
                              onClick={() => generate([lead.row])}
                              disabled={generating === lead.row}
                              className="text-sm font-semibold text-blue-700 hover:text-blue-800 disabled:opacity-50"
                            >
                              {generating === lead.row ? "Drafting…" : "Generate Draft"}
                            </button>
                          )}
                          {canSend(lead) && lead.emailStatus !== "Queued" && (
                            <button
                              onClick={() => send(lead).catch((err) => setActionError(err instanceof Error ? err.message : "Couldn't queue this lead."))}
                              disabled={sending === lead.row}
                              className="text-sm font-semibold text-blue-700 hover:text-blue-800 disabled:opacity-50"
                            >
                              {sending === lead.row ? "Sending…" : "Send"}
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex items-center justify-between pt-4 mt-1 border-t border-neutral-100">
            <p className="text-sm text-neutral-500">
              Showing {pageItems.length} of {filtered.length} leads
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

      {openLead && (
        <DraftModal
          title={openLead.fullName || "Lead"}
          subtitle={openLead.lastContacted ? `Last contacted ${openLead.lastContacted}` : "Leads"}
          to={openLead.email}
          subject={openDraft.subject}
          body={openDraft.body}
          showSubject
          statusLabel={openLead.emailStatus || "Draft"}
          sendDisabledReason={openLead.email ? undefined : "This lead has no email — can't send."}
          locked={openLead.emailStatus === "Queued" || openLead.emailStatus === "Sent" || openLead.emailStatus === "Sending"}
          onClose={() => setOpenRow(null)}
          onPoll={load}
          onSave={async (subject, messageBody) => {
            const res = await fetch("/api/leads/draft", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ row: openLead.row, subject, messageBody }),
            });
            if (!res.ok) throw new Error(await apiError(res, "Couldn't save the draft."));
            await load();
          }}
          onSend={async (subject, messageBody) => {
            const res = await fetch("/api/leads/send", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ row: openLead.row, subject, messageBody }),
            });
            const message = res.ok ? null : await apiError(res, "Couldn't queue this lead.");
            await load();
            if (message) throw new Error(message);
          }}
        />
      )}
    </div>
  );
}

function DigestStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-neutral-400">{label}</p>
      <p className="text-lg font-semibold text-neutral-900 mt-0.5">{value}</p>
    </div>
  );
}
