"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { createCampaignAction } from "@/app/lyfe-boxing/actions";
import { AUDIENCE_OPTIONS } from "@/lib/sheets/options";

const SMS_LIMIT = 145;

export default function NewCampaignForm() {
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<"Email" | "SMS">("Email");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const overLimit = channel === "SMS" && body.length > SMS_LIMIT;

  function handleSubmit(formData: FormData) {
    setError(null);
    if (channel === "SMS" && body.length > SMS_LIMIT) {
      setError(`SMS message is ${body.length} characters — must be under ${SMS_LIMIT}.`);
      return;
    }
    startTransition(async () => {
      try {
        await createCampaignAction(formData);
        setOpen(false);
        setBody("");
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
        New campaign
      </button>
    );
  }

  return (
    <form
      action={handleSubmit}
      className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4"
    >
      <div className="flex items-center justify-between">
        <p className="text-base font-semibold text-neutral-900">New campaign</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-neutral-400 hover:text-neutral-700"
        >
          Cancel
        </button>
      </div>

      <div>
        <label className="text-sm font-medium text-neutral-700 block mb-1">Campaign name</label>
        <input
          name="name"
          required
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          placeholder="e.g. October upgrade push"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-neutral-700 block mb-1">Channel</label>
          <select
            name="channel"
            value={channel}
            onChange={(e) => setChannel(e.target.value as "Email" | "SMS")}
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          >
            <option value="Email">Email</option>
            <option value="SMS">SMS</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-neutral-700 block mb-1">Audience</label>
          <select
            name="audience"
            required
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          >
            {AUDIENCE_OPTIONS.map((a) => (
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
            name="subject"
            required
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
            placeholder="Use {First name} for personalization"
          />
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium text-neutral-700">Message body</label>
          <span className="text-xs text-neutral-400">Use {"{First name}"} for personalization</span>
        </div>
        <textarea
          name="body"
          required
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
            overLimit ? "border-red-300 focus:ring-red-400" : "border-neutral-200 focus:ring-neutral-900"
          }`}
        />
        {channel === "SMS" && (
          <p className={`text-xs mt-1 ${overLimit ? "text-red-600 font-medium" : "text-neutral-400"}`}>
            {body.length} / {SMS_LIMIT} characters{overLimit ? " — too long for SMS" : ""}
          </p>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={pending || overLimit}
        className="rounded-lg bg-neutral-900 text-white text-sm font-medium px-4 py-2.5 hover:bg-neutral-800 transition-colors disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save as draft"}
      </button>
      <p className="text-xs text-neutral-400">
        Saved as a Draft with Send = FALSE. Nothing goes out until you open it and hit Send.
      </p>
    </form>
  );
}
