"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui";

/**
 * Supabase-backed "today's due drafts" + upcoming appointments section for the
 * Leads page. Everything here reads/writes Supabase only (via /api/leads/drafts
 * and /api/appointments) — no Google Sheets involved, and no email is ever sent
 * except by a human clicking "Approve & Send".
 */

type Draft = {
  id: string;
  lead_id: string;
  step: string;
  subject: string;
  body: string;
  status: string;
  leads: { id: string; full_name: string | null; email: string | null; stage: string | null } | null;
};

type Appointment = {
  id: string;
  lead_id: string | null;
  scheduled_at: string;
  type: string;
  status: string;
  leads: { full_name: string | null; email: string | null } | null;
};

export function DueFollowups() {
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [appointments, setAppointments] = useState<Appointment[] | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Record<string, { subject: string; body: string }>>({});
  const [bookingFor, setBookingFor] = useState<string | null>(null);
  const [bookForm, setBookForm] = useState({ date: "", time: "", type: "intro" });
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    try {
      const [draftsRes, apptRes] = await Promise.all([fetch("/api/leads/drafts"), fetch("/api/appointments")]);
      const draftsJson = await draftsRes.json();
      const apptJson = await apptRes.json();
      if (draftsJson.notConfigured || apptJson.notConfigured) {
        setNotConfigured(true);
        return;
      }
      setDrafts(draftsJson.drafts ?? []);
      setAppointments(apptJson.appointments ?? []);
    } catch {
      setNotConfigured(true);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load drafts/appointments once on mount
    load();
  }, []);

  async function approveAndSend(draft: Draft) {
    setBusyId(draft.id);
    setNotice(null);
    try {
      const edit = editing[draft.id];
      if (edit) {
        await fetch(`/api/leads/drafts/${draft.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(edit),
        });
      }
      const res = await fetch(`/api/leads/drafts/${draft.id}/send`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Send failed.");
      setNotice(`Sent to ${draft.leads?.full_name ?? "lead"}.`);
      await load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Send failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function skip(draft: Draft) {
    setBusyId(draft.id);
    try {
      await fetch(`/api/leads/drafts/${draft.id}/skip`, { method: "POST" });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function bookAppointment(leadId: string) {
    if (!bookForm.date || !bookForm.time) return;
    setBusyId(leadId);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, ...bookForm }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Booking failed.");
      setBookingFor(null);
      setBookForm({ date: "", time: "", type: "intro" });
      await load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Booking failed.");
    } finally {
      setBusyId(null);
    }
  }

  if (notConfigured) {
    return (
      <Card className="mb-6 border-amber-200 bg-amber-50">
        <p className="text-sm text-amber-800">Supabase isn&apos;t connected on this deployment yet — due follow-ups and appointments will show here once it is.</p>
      </Card>
    );
  }

  if (drafts === null) return null;

  return (
    <div className="mb-6 space-y-4">
      {notice && <p className="text-sm text-neutral-600">{notice}</p>}

      <Card>
        <p className="text-base font-semibold text-neutral-900 mb-1">Due today ({drafts.length})</p>
        <p className="text-sm text-neutral-500 mb-4">
          Every draft here was written by the daily cron job. Nothing is sent until you click &quot;Approve &amp; Send&quot;.
        </p>
        {drafts.length === 0 && <p className="text-sm text-neutral-400">No drafts waiting right now.</p>}
        <div className="space-y-3">
          {drafts.map((draft) => {
            const edit = editing[draft.id] ?? { subject: draft.subject, body: draft.body };
            return (
              <div key={draft.id} className="rounded-lg border border-neutral-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-neutral-900">
                    {draft.leads?.full_name ?? "Lead"}{" "}
                    <span className="text-xs text-neutral-400">
                      step {draft.step} · {draft.status}
                    </span>
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      className="text-xs rounded-full border border-neutral-200 px-3 py-1 hover:bg-neutral-50"
                      onClick={() => setBookingFor(bookingFor === draft.lead_id ? null : draft.lead_id)}
                    >
                      Book appointment
                    </button>
                    <button
                      disabled={busyId === draft.id}
                      className="text-xs rounded-full border border-neutral-200 px-3 py-1 hover:bg-neutral-50"
                      onClick={() => skip(draft)}
                    >
                      Skip
                    </button>
                    <button
                      disabled={busyId === draft.id}
                      className="text-xs rounded-full bg-blue-600 text-white px-3 py-1 hover:bg-blue-700"
                      onClick={() => approveAndSend(draft)}
                    >
                      Approve &amp; Send
                    </button>
                  </div>
                </div>
                <input
                  className="mt-2 w-full rounded border border-neutral-200 px-2 py-1 text-sm"
                  value={edit.subject}
                  onChange={(e) => setEditing((prev) => ({ ...prev, [draft.id]: { ...edit, subject: e.target.value } }))}
                />
                <textarea
                  className="mt-2 w-full rounded border border-neutral-200 px-2 py-1 text-sm"
                  rows={3}
                  value={edit.body}
                  onChange={(e) => setEditing((prev) => ({ ...prev, [draft.id]: { ...edit, body: e.target.value } }))}
                />
                {bookingFor === draft.lead_id && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 rounded border border-neutral-100 bg-neutral-50 p-2">
                    <input
                      type="date"
                      className="rounded border border-neutral-200 px-2 py-1 text-sm"
                      value={bookForm.date}
                      onChange={(e) => setBookForm((f) => ({ ...f, date: e.target.value }))}
                    />
                    <input
                      type="time"
                      className="rounded border border-neutral-200 px-2 py-1 text-sm"
                      value={bookForm.time}
                      onChange={(e) => setBookForm((f) => ({ ...f, time: e.target.value }))}
                    />
                    <select
                      className="rounded border border-neutral-200 px-2 py-1 text-sm"
                      value={bookForm.type}
                      onChange={(e) => setBookForm((f) => ({ ...f, type: e.target.value }))}
                    >
                      <option value="intro">Intro</option>
                      <option value="trial class">Trial class</option>
                    </select>
                    <button
                      className="text-xs rounded-full bg-neutral-900 text-white px-3 py-1"
                      onClick={() => draft.lead_id && bookAppointment(draft.lead_id)}
                    >
                      Confirm booking
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {appointments && appointments.length > 0 && (
        <Card>
          <p className="text-base font-semibold text-neutral-900 mb-3">Today &amp; upcoming appointments</p>
          <div className="space-y-2">
            {appointments.map((appt) => (
              <div key={appt.id} className="flex items-center justify-between text-sm">
                <span className="text-neutral-700">
                  {appt.leads?.full_name ?? "Lead"} — {appt.type}
                </span>
                <span className="text-neutral-400">
                  {new Date(appt.scheduled_at).toLocaleString()} · {appt.status}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
