"use client";

import { useEffect, useState } from "react";
import { Card, PageHeader } from "@/components/ui";
import { apiError } from "@/components/lyfeBoxing/views";

type PlaybookForm = {
  tone: string;
  offers: string;
  prices: string;
  faqs: string;
  trialLink: string;
};

const EMPTY: PlaybookForm = { tone: "", offers: "", prices: "", faqs: "", trialLink: "" };

export function PlaybookView() {
  const [form, setForm] = useState<PlaybookForm>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [envOverride, setEnvOverride] = useState(false);

  useEffect(() => {
    fetch("/api/playbook")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Couldn't load the playbook.");
        setForm({ ...EMPTY, ...data.playbook });
        setEnvOverride(!!data.trialUrlFromEnv);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load the playbook."))
      .finally(() => setLoading(false));
  }, []);

  function update(field: keyof PlaybookForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/playbook", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await apiError(res, "Couldn't save the playbook."));
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the playbook.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Playbook"
        subtitle="Tone, offers, prices, FAQs, and the trial link. Every AI draft reads this, plus the five most recent edits."
        tool="Google Sheets (Playbook)"
      />
      {loading ? (
        <div className="h-40 rounded-2xl bg-neutral-100 animate-pulse" />
      ) : (
        <Card>
          <form onSubmit={save} className="space-y-4">
            <Field label="Tone" value={form.tone} onChange={(value) => update("tone", value)} rows={3} />
            <Field label="Offers" value={form.offers} onChange={(value) => update("offers", value)} rows={3} />
            <Field label="Prices" value={form.prices} onChange={(value) => update("prices", value)} rows={3} />
            <Field label="FAQs" value={form.faqs} onChange={(value) => update("faqs", value)} rows={6} />
            <div>
              <label className="text-sm font-medium text-neutral-700 block mb-1" htmlFor="trial-link">
                Trial booking link
              </label>
              <input
                id="trial-link"
                value={form.trialLink}
                onChange={(e) => update("trialLink", e.target.value)}
                placeholder="https://"
                className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
              />
              {envOverride && (
                <p className="text-xs text-amber-700 mt-1">
                  TRIAL_BOOKING_URL is set on the server, so drafts use that link instead of the one saved here.
                </p>
              )}
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-neutral-900 text-white px-5 py-2.5 text-sm font-medium hover:bg-neutral-800 disabled:opacity-50"
            >
              {saving ? "Saving…" : saved ? "Saved" : "Save playbook"}
            </button>
          </form>
        </Card>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  rows,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-neutral-700 block mb-1">{label}</label>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
      />
    </div>
  );
}
