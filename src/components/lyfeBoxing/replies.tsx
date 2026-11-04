"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, PageHeader } from "@/components/ui";

type ReplyCategory = "interested" | "positive" | "not_interested" | "unsubscribe" | "question" | "other";

type Reply = {
  id: string;
  leadId: string;
  receivedAt: string;
  fromEmail: string | null;
  subject: string;
  snippet: string;
  fullText: string;
  category: ReplyCategory;
  handled: boolean;
  lead: { fullName: string | null; email: string | null; optedOut: boolean; interested: boolean } | null;
};

const CATEGORIES: { value: ReplyCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "interested", label: "Interested" },
  { value: "positive", label: "Positive" },
  { value: "question", label: "Question" },
  { value: "not_interested", label: "Not interested" },
  { value: "unsubscribe", label: "Unsubscribe" },
  { value: "other", label: "Other" },
];

export function RepliesView() {
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<ReplyCategory | "all">("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/replies");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Couldn't load replies.");
      setReplies(data.replies ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load replies.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load replies once on mount
    load();
  }, []);

  const counts = useMemo(() => {
    const result: Record<string, number> = { all: replies.length };
    for (const reply of replies) {
      result[reply.category] = (result[reply.category] ?? 0) + 1;
    }
    return result;
  }, [replies]);

  const visible = tab === "all" ? replies : replies.filter((r) => r.category === tab);

  async function recategorize(id: string, category: ReplyCategory) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/replies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Couldn't update the reply.");
      setReplies((prev) => prev.map((r) => (r.id === id ? data.reply : r)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update the reply.");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleHandled(reply: Reply) {
    setBusyId(reply.id);
    try {
      const res = await fetch(`/api/replies/${reply.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handled: !reply.handled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Couldn't update the reply.");
      setReplies((prev) => prev.map((r) => (r.id === reply.id ? { ...r, handled: !reply.handled } : r)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update the reply.");
    } finally {
      setBusyId(null);
    }
  }

  async function sendCalendarLink(leadId: string) {
    setBusyId(leadId);
    try {
      const res = await fetch(`/api/leads/${leadId}/send-calendar-link`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Couldn't send the calendar link.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send the calendar link.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <div className="p-8 text-sm text-neutral-500">Loading…</div>;

  return (
    <div className="max-w-5xl">
      <PageHeader title="Replies" subtitle="Inbound replies Grok has categorized, with manual re-categorize and handled tracking." />
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="flex gap-2 mb-6 flex-wrap">
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => setTab(c.value)}
            className={`rounded-full px-3 py-1.5 text-sm border ${
              tab === c.value ? "bg-blue-600 text-white border-blue-600" : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            {c.label} ({counts[c.value] ?? 0})
          </button>
        ))}
      </div>

      <Card>
        <div className="space-y-4">
          {visible.map((reply) => (
            <div key={reply.id} className="rounded-xl border border-neutral-200 p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-neutral-900">
                    {reply.lead?.fullName ?? reply.fromEmail ?? "Unknown"}
                    {reply.lead?.optedOut && (
                      <span className="ml-2 text-xs rounded-full bg-neutral-100 text-neutral-500 px-2 py-0.5">Opted out</span>
                    )}
                  </p>
                  <p className="text-xs text-neutral-400">
                    {reply.fromEmail} · {new Date(reply.receivedAt).toLocaleString()}
                  </p>
                </div>
                <span className="text-xs rounded-full bg-neutral-100 px-2 py-1 text-neutral-600">{reply.category}</span>
              </div>
              <p className="text-sm font-medium text-neutral-800 mb-1">{reply.subject}</p>
              <p className="text-sm text-neutral-600 mb-3">{reply.snippet || reply.fullText}</p>
              <div className="flex items-center gap-3 text-sm flex-wrap">
                <select
                  value={reply.category}
                  disabled={busyId === reply.id}
                  onChange={(e) => recategorize(reply.id, e.target.value as ReplyCategory)}
                  className="rounded-lg border border-neutral-200 px-2 py-1 text-sm"
                >
                  {CATEGORIES.filter((c) => c.value !== "all").map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <button
                  disabled={busyId === reply.id}
                  onClick={() => toggleHandled(reply)}
                  className="text-blue-600 hover:underline disabled:opacity-50"
                >
                  {reply.handled ? "Mark unhandled" : "Mark handled"}
                </button>
                {(reply.category === "interested" || reply.category === "positive") && (
                  <button
                    disabled={busyId === reply.leadId}
                    onClick={() => sendCalendarLink(reply.leadId)}
                    className="text-blue-600 hover:underline disabled:opacity-50"
                  >
                    Send calendar link
                  </button>
                )}
              </div>
            </div>
          ))}
          {visible.length === 0 && <p className="text-sm text-neutral-500">No replies in this category.</p>}
        </div>
      </Card>
    </div>
  );
}
