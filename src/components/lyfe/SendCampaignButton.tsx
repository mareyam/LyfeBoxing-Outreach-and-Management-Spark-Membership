"use client";

import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import { sendCampaignAction } from "@/app/lyfe-boxing/actions";

export default function SendCampaignButton({
  rowNumber,
  locked,
}: {
  rowNumber: number;
  locked: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  if (locked || done) {
    return (
      <span className="text-xs text-neutral-400">
        {done ? "Queued" : "Locked"}
      </span>
    );
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
      >
        <Send className="h-3.5 w-3.5" strokeWidth={2} />
        Send
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() =>
          startTransition(async () => {
            await sendCampaignAction(rowNumber);
            setDone(true);
          })
        }
        disabled={pending}
        className="rounded-lg bg-neutral-900 text-white px-3 py-1.5 text-xs font-medium hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? "…" : "Confirm"}
      </button>
      <button
        onClick={() => setConfirming(false)}
        className="text-xs text-neutral-400 hover:text-neutral-700"
      >
        Cancel
      </button>
      <span className="text-xs text-neutral-400">Goes out at the next 3 PM / 12 AM PKT run</span>
    </div>
  );
}
