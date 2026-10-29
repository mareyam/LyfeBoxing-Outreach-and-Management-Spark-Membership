"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { bookAppointmentAction } from "@/app/lyfe-boxing/actions";

export default function BookAppointmentForm() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await bookAppointmentAction(formData);
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 text-white text-sm font-medium px-4 py-2.5 hover:bg-neutral-800 transition-colors"
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
        Book appointment
      </button>
    );
  }

  return (
    <form action={handleSubmit} className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-base font-semibold text-neutral-900">Book appointment</p>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-neutral-400 hover:text-neutral-700">
          Cancel
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-neutral-700 block mb-1">Date</label>
          <input name="date" type="date" required className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
        </div>
        <div>
          <label className="text-sm font-medium text-neutral-700 block mb-1">Time</label>
          <input name="time" type="time" required className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-neutral-700 block mb-1">Type</label>
        <input name="type" required placeholder="e.g. Trial class, Coaching call" className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-neutral-700 block mb-1">Member</label>
          <input name="member" required className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
        </div>
        <div>
          <label className="text-sm font-medium text-neutral-700 block mb-1">Coach (optional)</label>
          <input name="coach" className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-neutral-900 text-white text-sm font-medium px-4 py-2.5 hover:bg-neutral-800 transition-colors disabled:opacity-50"
      >
        {pending ? "Booking…" : "Request appointment"}
      </button>
      <p className="text-xs text-neutral-400">
        Saved with Status &quot;Requested&quot; — your assistant enters it into Spark.
      </p>
    </form>
  );
}
