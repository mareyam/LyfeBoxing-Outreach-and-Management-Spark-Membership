"use client";

import { useState, useTransition } from "react";
import { Sparkles, Check } from "lucide-react";

export default function GenerateDraftsButton({
  label,
  action,
}: {
  label: string;
  action: () => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-100 px-4 py-2.5 text-sm font-medium text-neutral-600">
        <Check className="h-4 w-4" strokeWidth={2} />
        Drafts added to Campaigns
      </span>
    );
  }

  return (
    <button
      onClick={() => startTransition(async () => { await action(); setDone(true); })}
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 text-white text-sm font-medium px-4 py-2.5 hover:bg-neutral-800 transition-colors disabled:opacity-50"
    >
      <Sparkles className="h-4 w-4" strokeWidth={2} />
      {pending ? "Drafting…" : label}
    </button>
  );
}
