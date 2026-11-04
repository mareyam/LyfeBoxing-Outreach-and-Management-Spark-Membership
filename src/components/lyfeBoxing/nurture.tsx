"use client";

import { useEffect, useState } from "react";
import { Card, PageHeader } from "@/components/ui";

type Step = {
  id: string;
  stepNo: number;
  delayDays: number;
  subject: string;
  body: string;
  active: boolean;
};

type Enrollment = {
  id: string;
  leadId: string;
  currentStep: number;
  nextSendAt: string | null;
  status: string;
  enrolledAt: string;
  lead: { fullName: string | null; email: string | null; optedOut: boolean } | null;
};

const EMPTY_STEP = { stepNo: 1, delayDays: 1, subject: "", body: "" };

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export function NurtureView() {
  const [steps, setSteps] = useState<Step[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newStep, setNewStep] = useState(EMPTY_STEP);
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [stepsRes, enrollmentsRes] = await Promise.all([fetch("/api/nurture/steps"), fetch("/api/nurture/enrollments")]);
      const stepsData = await stepsRes.json();
      if (!stepsRes.ok) throw new Error(stepsData?.error || "Couldn't load steps.");
      const enrollmentsData = await enrollmentsRes.json();
      if (!enrollmentsRes.ok) throw new Error(enrollmentsData?.error || "Couldn't load enrollments.");
      setSteps(stepsData.steps ?? []);
      setEnrollments(enrollmentsData.enrollments ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load the nurture sequence.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load steps/enrollments once on mount
    load();
  }, []);

  async function saveStep(step: Step) {
    const res = await fetch(`/api/nurture/steps/${step.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stepNo: step.stepNo,
        delayDays: step.delayDays,
        subject: step.subject,
        body: step.body,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Request failed.");
    setSteps((prev) => prev.map((s) => (s.id === step.id ? data.step : s)));
  }

  async function toggleActive(step: Step) {
    const res = await fetch(`/api/nurture/steps/${step.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !step.active }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error || "Request failed.");
      return;
    }
    setSteps((prev) => prev.map((s) => (s.id === step.id ? data.step : s)));
  }

  async function moveStep(step: Step, direction: -1 | 1) {
    const sorted = [...steps].sort((a, b) => a.stepNo - b.stepNo);
    const idx = sorted.findIndex((s) => s.id === step.id);
    const swapWith = sorted[idx + direction];
    if (!swapWith) return;
    const res = await fetch("/api/nurture/steps/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order: [
          { id: step.id, stepNo: swapWith.stepNo },
          { id: swapWith.id, stepNo: step.stepNo },
        ],
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error || "Request failed.");
      return;
    }
    await load();
  }

  async function createStep() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/nurture/steps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newStep),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Request failed.");
      setSteps((prev) => [...prev, data.step].sort((a, b) => a.stepNo - b.stepNo));
      setNewStep({ ...EMPTY_STEP, stepNo: newStep.stepNo + 1 });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create the step.");
    } finally {
      setCreating(false);
    }
  }

  async function enrollmentAction(id: string, action: "pause" | "resume" | "remove") {
    const res = await fetch(`/api/nurture/enrollments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error || "Request failed.");
      return;
    }
    await load();
  }

  if (loading) return <div className="p-8 text-sm text-neutral-500">Loading…</div>;

  const sortedSteps = [...steps].sort((a, b) => a.stepNo - b.stepNo);

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Nurture Sequence"
        subtitle="Automated follow-up emails sent after Spark's welcome email. Grok sends; this page only schedules."
      />
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <Card className="mb-8">
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">Steps</h2>
        <div className="space-y-4">
          {sortedSteps.map((step, idx) => (
            <StepRow
              key={step.id}
              step={step}
              onSave={saveStep}
              onToggleActive={() => toggleActive(step)}
              onMoveUp={idx > 0 ? () => moveStep(step, -1) : undefined}
              onMoveDown={idx < sortedSteps.length - 1 ? () => moveStep(step, 1) : undefined}
            />
          ))}
          {sortedSteps.length === 0 && <p className="text-sm text-neutral-500">No steps yet — add one below.</p>}
        </div>

        <div className="mt-6 pt-6 border-t border-neutral-200">
          <h3 className="text-sm font-semibold text-neutral-700 mb-3">Add a step</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <label className="text-sm">
              <span className="block text-neutral-500 mb-1">Step #</span>
              <input
                type="number"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2"
                value={newStep.stepNo}
                onChange={(e) => setNewStep((prev) => ({ ...prev, stepNo: Number(e.target.value) }))}
              />
            </label>
            <label className="text-sm">
              <span className="block text-neutral-500 mb-1">Delay (days)</span>
              <input
                type="number"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2"
                value={newStep.delayDays}
                onChange={(e) => setNewStep((prev) => ({ ...prev, delayDays: Number(e.target.value) }))}
              />
            </label>
          </div>
          <input
            placeholder="Subject (supports {first_name})"
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 mb-3"
            value={newStep.subject}
            onChange={(e) => setNewStep((prev) => ({ ...prev, subject: e.target.value }))}
          />
          <textarea
            placeholder="Body (supports {first_name})"
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 mb-3 min-h-[100px]"
            value={newStep.body}
            onChange={(e) => setNewStep((prev) => ({ ...prev, body: e.target.value }))}
          />
          <button
            onClick={createStep}
            disabled={creating || !newStep.subject}
            className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {creating ? "Adding…" : "Add step"}
          </button>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">Enrollments</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-500 border-b border-neutral-200">
                <th className="py-2 pr-4">Lead</th>
                <th className="py-2 pr-4">Step</th>
                <th className="py-2 pr-4">Next send</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map((e) => (
                <tr key={e.id} className="border-b border-neutral-100">
                  <td className="py-2 pr-4">
                    {e.lead?.fullName ?? "—"}
                    <div className="text-neutral-400">{e.lead?.email}</div>
                    {e.lead?.optedOut && (
                      <span className="inline-block mt-1 text-xs rounded-full bg-neutral-100 text-neutral-500 px-2 py-0.5">
                        Opted out
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-4">{e.currentStep}</td>
                  <td className="py-2 pr-4">{formatDate(e.nextSendAt)}</td>
                  <td className="py-2 pr-4">{e.status}</td>
                  <td className="py-2 pr-4 space-x-2">
                    {e.status === "active" && (
                      <button className="text-blue-600 hover:underline" onClick={() => enrollmentAction(e.id, "pause")}>
                        Pause
                      </button>
                    )}
                    {e.status === "paused" && (
                      <button className="text-blue-600 hover:underline" onClick={() => enrollmentAction(e.id, "resume")}>
                        Resume
                      </button>
                    )}
                    {(e.status === "active" || e.status === "paused") && (
                      <button className="text-neutral-500 hover:underline" onClick={() => enrollmentAction(e.id, "remove")}>
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {enrollments.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-neutral-500">
                    No enrollments yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function StepRow({
  step,
  onSave,
  onToggleActive,
  onMoveUp,
  onMoveDown,
}: {
  step: Step;
  onSave: (step: Step) => Promise<void>;
  onToggleActive: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  const [draft, setDraft] = useState(step);
  const [saving, setSaving] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- keep local draft in sync when the parent's step data changes
  useEffect(() => setDraft(step), [step]);

  const dirty =
    draft.subject !== step.subject || draft.body !== step.body || draft.delayDays !== step.delayDays;

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(draft);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`rounded-xl border p-4 ${step.active ? "border-neutral-200" : "border-neutral-100 bg-neutral-50 opacity-60"}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-neutral-900">Step {step.stepNo}</span>
        <div className="flex items-center gap-3 text-sm">
          <button onClick={onMoveUp} disabled={!onMoveUp} className="text-neutral-400 hover:text-neutral-700 disabled:opacity-30">
            ↑
          </button>
          <button onClick={onMoveDown} disabled={!onMoveDown} className="text-neutral-400 hover:text-neutral-700 disabled:opacity-30">
            ↓
          </button>
          <label className="flex items-center gap-1.5 text-neutral-600">
            <input type="checkbox" checked={step.active} onChange={onToggleActive} />
            Active
          </label>
        </div>
      </div>
      <label className="text-sm block mb-2">
        <span className="block text-neutral-500 mb-1">Delay (days after previous step)</span>
        <input
          type="number"
          className="w-24 rounded-lg border border-neutral-200 px-3 py-1.5"
          value={draft.delayDays}
          onChange={(e) => setDraft((prev) => ({ ...prev, delayDays: Number(e.target.value) }))}
        />
      </label>
      <input
        className="w-full rounded-lg border border-neutral-200 px-3 py-2 mb-2"
        value={draft.subject}
        onChange={(e) => setDraft((prev) => ({ ...prev, subject: e.target.value }))}
      />
      <textarea
        className="w-full rounded-lg border border-neutral-200 px-3 py-2 min-h-[80px]"
        value={draft.body}
        onChange={(e) => setDraft((prev) => ({ ...prev, body: e.target.value }))}
      />
      {dirty && (
        <button onClick={handleSave} disabled={saving} className="mt-2 text-sm text-blue-600 hover:underline disabled:opacity-50">
          {saving ? "Saving…" : "Save changes"}
        </button>
      )}
    </div>
  );
}
