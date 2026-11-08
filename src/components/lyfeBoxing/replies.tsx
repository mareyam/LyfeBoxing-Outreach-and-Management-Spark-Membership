"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, PageHeader } from "@/components/ui";

type EmailThreadCategory =
  | "interested"
  | "question"
  | "cancellation"
  | "not_interested"
  | "unsubscribe"
  | "other"
  | "needs_review";

type EmailThread = {
  id: string;
  fromEmail: string;
  fromName: string;
  originalSubject: string;
  originalText: string;
  replyBody: string;
  category: EmailThreadCategory;
  sentAt: string;
};

const CATEGORIES: { value: EmailThreadCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "interested", label: "Interested" },
  { value: "question", label: "Question" },
  { value: "cancellation", label: "Cancellation" },
  { value: "not_interested", label: "Not interested" },
  { value: "unsubscribe", label: "Unsubscribe" },
  { value: "needs_review", label: "Needs review" },
  { value: "other", label: "Other" },
];

export function RepliesView() {
  const [threads, setThreads] = useState<EmailThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<EmailThreadCategory | "all">("all");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/email-threads");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Couldn't load email threads.");
      setThreads(data.threads ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load email threads.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load threads once on mount
    load();
  }, []);

  const counts = useMemo(() => {
    const result: Record<string, number> = { all: threads.length };
    for (const thread of threads) {
      result[thread.category] = (result[thread.category] ?? 0) + 1;
    }
    return result;
  }, [threads]);

  const visible = tab === "all" ? threads : threads.filter((t) => t.category === tab);

  if (loading) return <div className="p-8 text-sm text-neutral-500">Loading…</div>;

  return (
    <div className="max-w-5xl">
      <PageHeader title="Replies" subtitle="Inbound emails and the reply sent back, categorized by the AI agent." />
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
          {visible.map((thread) => (
            <div key={thread.id} className="rounded-xl border border-neutral-200 p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-neutral-900">{thread.fromName || thread.fromEmail}</p>
                  <p className="text-xs text-neutral-400">
                    {thread.fromEmail} · {new Date(thread.sentAt).toLocaleString()}
                  </p>
                </div>
                <span className="text-xs rounded-full bg-neutral-100 px-2 py-1 text-neutral-600">{thread.category}</span>
              </div>
              <p className="text-sm font-medium text-neutral-800 mb-1">{thread.originalSubject}</p>
              <p className="text-sm text-neutral-600 mb-3 whitespace-pre-wrap">{thread.originalText}</p>
              {thread.replyBody && (
                <div className="rounded-lg bg-neutral-50 border border-neutral-100 p-3">
                  <p className="text-xs font-medium text-neutral-500 mb-1">Reply sent</p>
                  <p className="text-sm text-neutral-700 whitespace-pre-wrap">{thread.replyBody}</p>
                </div>
              )}
            </div>
          ))}
          {visible.length === 0 && <p className="text-sm text-neutral-500">No emails in this category.</p>}
        </div>
      </Card>
    </div>
  );
}
