"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  type Node,
  type Edge,
  type NodeChange,
  applyNodeChanges,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Mail, Clock, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui";

type EmailTemplate = { row: number; name: string; subject: string; body: string; created: string };
type Contact = { name: string; email: string; phone: string };

/** Looks up Name/Email/Phone-ish columns on a lyfe-data tab and merges them in, keyed by name (first match wins). */
async function fetchContactsFromTab(tab: string, into: Map<string, Contact>) {
  try {
    const d = await fetch(`/api/lyfe-data?tab=${encodeURIComponent(tab)}`).then((r) => r.json());
    const rows = (d.rows ?? []) as Record<string, string>[];
    for (const r of rows) {
      const name = (r["Name"] ?? r["Member"] ?? r["Member Name"] ?? r["Full Name"] ?? "").trim();
      if (!name || into.has(name)) continue;
      const email = (r["Email"] ?? "").trim();
      const phone = (r["Phone"] ?? r["Phone Number"] ?? "").trim();
      if (email || phone) into.set(name, { name, email, phone });
    }
  } catch {
    // tab missing or unreachable — just contributes nothing
  }
}

/** The tabs searched (in order) to resolve an individual contact's real email/phone for an exact "Contact: Name <email>" audience. */
const CONTACT_SOURCE_TABS = ["Past Due", "Cancelled (Oct)", "Leads", "All Memberships"];

const STATUS_OPTIONS = ["Active members", "Cancelled members", "Past due members", "At risk (10+ days no class)", "Trial members"];
const MEMBERSHIP_OPTIONS = [
  "Any membership",
  "Basic Boxer 2x",
  "Knock Out Boxer Unlimited",
  "Light Boxer 1x",
  "Knock Out Boxer 3x",
  "1 Day Boxing Program",
  "Ignite Pro | Adult Boxing | 3-Class Trial for $19.95",
];

type AudienceMode = "status" | "leads" | "individual";

/** Parses the saved audience string back into the picker's own state. Understands both the current "Contact: Name <email>; ..." format and the older "Individual: name, name" format for sequences saved before this change. */
function parseAudience(audienceInput: string): { mode: AudienceMode; status: string; membership: string; names: string[] } {
  const audience = audienceInput ?? "";
  if (audience === "New leads") return { mode: "leads", status: STATUS_OPTIONS[0], membership: MEMBERSHIP_OPTIONS[0], names: [] };
  if (audience.includes("Contact: ")) {
    const names = Array.from(audience.matchAll(/Contact:\s*([^<;]+?)\s*</g)).map((m) => m[1].trim());
    return { mode: "individual", status: STATUS_OPTIONS[0], membership: MEMBERSHIP_OPTIONS[0], names };
  }
  if (audience.startsWith("Individual: ")) {
    return {
      mode: "individual",
      status: STATUS_OPTIONS[0],
      membership: MEMBERSHIP_OPTIONS[0],
      names: audience.slice("Individual: ".length).split(", ").filter(Boolean),
    };
  }
  const [status, membershipPart] = audience.split(" · ");
  return {
    mode: "status",
    status: STATUS_OPTIONS.includes(status) ? status : STATUS_OPTIONS[0],
    membership: membershipPart ? membershipPart.replace("membership: ", "") : MEMBERSHIP_OPTIONS[0],
    names: [],
  };
}

function AudiencePicker({ audience, onChange }: { audience: string; onChange: (audience: string) => void }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const parsed = useMemo(() => parseAudience(audience), [audience]);
  const [mode, setMode] = useState<AudienceMode>(parsed.mode);
  const [status, setStatus] = useState(parsed.status);
  const [membership, setMembership] = useState(parsed.membership);
  const [names, setNames] = useState<string[]>(parsed.names);

  useEffect(() => {
    const byName = new Map<string, Contact>();
    Promise.all(CONTACT_SOURCE_TABS.map((tab) => fetchContactsFromTab(tab, byName))).then(() => {
      setContacts(Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name)));
    });
  }, []);

  /** Individual mode always saves the exact resolved contact(s) — never a bare first name — so Grok can send without guessing an email. */
  function commit(nextMode: AudienceMode, nextStatus: string, nextMembership: string, nextNames: string[]) {
    if (nextMode === "leads") {
      onChange("New leads");
    } else if (nextMode === "individual") {
      const formatted = nextNames
        .map((name) => contacts.find((c) => c.name === name))
        .filter((c): c is Contact => !!c)
        .map((c) => `Contact: ${c.name} <${c.email}>${c.phone ? ` (${c.phone})` : ""}`);
      onChange(formatted.join("; "));
    } else {
      onChange(nextMembership !== "Any membership" ? `${nextStatus} · membership: ${nextMembership}` : nextStatus);
    }
  }

  function toggleName(name: string) {
    const next = names.includes(name) ? names.filter((n) => n !== name) : [...names, name];
    setNames(next);
    commit(mode, status, membership, next);
  }

  return (
    <div className="px-4 pt-4 pb-3 border-b border-neutral-100 bg-indigo-50/40">
      <label className="text-xs font-semibold text-neutral-700 block mb-2">Who should receive this sequence?</label>
      <div className="flex gap-1.5 mb-3">
        {([
          ["status", "By status / membership"],
          ["leads", "New leads"],
          ["individual", "Individual contacts"],
        ] as [AudienceMode, string][]).map(([m, label]) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              commit(m, status, membership, names);
            }}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              mode === m
                ? "bg-indigo-700 text-white border-indigo-700"
                : "border-neutral-200 bg-white text-neutral-600 hover:bg-indigo-50 hover:border-indigo-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "status" && (
        <div className="flex gap-2">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              commit(mode, e.target.value, membership, names);
            }}
            className="rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={membership}
            onChange={(e) => {
              setMembership(e.target.value);
              commit(mode, status, e.target.value, names);
            }}
            className="rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
          >
            {MEMBERSHIP_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      )}

      {mode === "leads" && <p className="text-xs text-neutral-400">Everyone newly added to the Leads tab.</p>}

      {mode === "individual" && (
        <div className="max-h-32 overflow-y-auto rounded-lg border border-neutral-200 bg-white p-2 space-y-1">
          {contacts.length === 0 && <p className="text-xs text-neutral-400">No contacts loaded.</p>}
          {contacts.map((c) => (
            <label
              key={c.name}
              className="flex items-center gap-2 text-xs text-neutral-700 rounded-md px-1.5 py-1 hover:bg-indigo-50/60"
            >
              <input
                type="checkbox"
                checked={names.includes(c.name)}
                onChange={() => toggleName(c.name)}
                className="rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
              />
              {c.name} <span className="text-neutral-400">{c.email || c.phone}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export type WaitUnit = "seconds" | "minutes" | "hours" | "days";

export type SequenceStep =
  | { type: "email"; templateRow: number; templateName: string; subject: string; body: string }
  | { type: "wait"; amount: number; unit: WaitUnit };

type FlowNodeData = {
  step: SequenceStep;
  templates: EmailTemplate[];
  onChange: (step: SequenceStep) => void;
  onDelete: () => void;
};

const NODE_GAP_X = 260;

function EmailNode({ data }: { data: FlowNodeData }) {
  const step = data.step as { type: "email"; templateRow: number; templateName: string; subject: string; body: string };
  return (
    <div className="w-56 rounded-xl border border-indigo-100 bg-white shadow-sm p-3">
      <Handle type="target" position={Position.Left} className="!bg-indigo-400" />
      <Handle type="source" position={Position.Right} className="!bg-indigo-400" />
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700">
          <span className="h-5 w-5 rounded-md bg-indigo-50 flex items-center justify-center">
            <Mail className="h-3 w-3 text-indigo-600" strokeWidth={2} />
          </span>
          Email
        </div>
        <button onClick={data.onDelete} className="text-neutral-300 hover:text-red-600">
          <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>
      <select
        value={step.templateRow || ""}
        onChange={(e) => {
          const t = data.templates.find((tpl) => String(tpl.row) === e.target.value);
          data.onChange({
            type: "email",
            templateRow: t?.row ?? 0,
            templateName: t?.name ?? "",
            subject: t?.subject ?? "",
            body: t?.body ?? "",
          });
        }}
        className="w-full rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 nodrag"
      >
        <option value="">Choose a template…</option>
        {data.templates.map((t) => (
          <option key={t.row} value={t.row}>
            {t.name}
          </option>
        ))}
      </select>
      {step.subject && <p className="text-xs text-neutral-400 mt-1.5 truncate">{step.subject}</p>}
    </div>
  );
}

const WAIT_UNITS: WaitUnit[] = ["seconds", "minutes", "hours", "days"];

function WaitNode({ data }: { data: FlowNodeData }) {
  const step = data.step as { type: "wait"; amount: number; unit: WaitUnit };
  return (
    <div className="w-44 rounded-xl border border-dashed border-amber-200 bg-amber-50/40 shadow-sm p-3">
      <Handle type="target" position={Position.Left} className="!bg-amber-400" />
      <Handle type="source" position={Position.Right} className="!bg-amber-400" />
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
          <span className="h-5 w-5 rounded-md bg-amber-100 flex items-center justify-center">
            <Clock className="h-3 w-3 text-amber-600" strokeWidth={2} />
          </span>
          Wait
        </div>
        <button onClick={data.onDelete} className="text-neutral-300 hover:text-red-600">
          <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          min={0}
          value={step.amount}
          onChange={(e) => data.onChange({ type: "wait", amount: Math.max(0, Number(e.target.value) || 0), unit: step.unit })}
          className="w-14 rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-300 nodrag"
        />
        <select
          value={step.unit}
          onChange={(e) => data.onChange({ type: "wait", amount: step.amount, unit: e.target.value as WaitUnit })}
          className="flex-1 rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-300 nodrag"
        >
          {WAIT_UNITS.map((u) => (
            <option key={u} value={u}>
              {step.amount === 1 ? u.slice(0, -1) : u}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

const nodeTypes = { email: EmailNode, wait: WaitNode };

/** A linear id, e.g. "n3" — order is derived from x-position on save, not from this id. */
let nextId = 1;
function freshId() {
  return `n${nextId++}`;
}

export default function SequenceBuilder({
  initialSteps,
  initialAudience,
  initialStartDate,
  onSave,
  onStartNow,
  onCancel,
  saving,
  starting,
}: {
  initialSteps: SequenceStep[];
  initialAudience: string;
  initialStartDate: string;
  onSave: (steps: SequenceStep[], audience: string, startDate: string) => void;
  onStartNow: (steps: SequenceStep[], audience: string) => void;
  onCancel: () => void;
  saving: boolean;
  starting: boolean;
}) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [audience, setAudience] = useState(initialAudience);
  const [startDate, setStartDate] = useState(initialStartDate);

  useEffect(() => {
    fetch("/api/email-templates")
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates ?? []))
      .catch(() => setTemplates([]));
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- seeds the canvas once from the saved sequence on mount
  useEffect(() => {
    setNodes(
      (initialSteps.length ? initialSteps : [emptyEmailStep()]).map((step, i) => ({
        id: freshId(),
        type: step.type,
        position: { x: i * NODE_GAP_X, y: 80 },
        data: { step } as unknown as Record<string, unknown>,
      }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function emptyEmailStep(): SequenceStep {
    return { type: "email", templateRow: 0, templateName: "", subject: "", body: "" };
  }

  const updateStep = useCallback((id: string, step: SequenceStep) => {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, data: { ...n.data, step } } : n)));
  }, []);

  const deleteNode = useCallback((id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  function addNode(type: "email" | "wait") {
    setNodes((prev) => {
      const maxX = prev.reduce((m, n) => Math.max(m, n.position.x), -NODE_GAP_X);
      const step: SequenceStep = type === "email" ? emptyEmailStep() : { type: "wait", amount: 1, unit: "days" };
      return [...prev, { id: freshId(), type, position: { x: maxX + NODE_GAP_X, y: 80 }, data: { step } as unknown as Record<string, unknown> }];
    });
  }

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((prev) => applyNodeChanges(changes, prev));
  }, []);

  const ordered = useMemo(() => [...nodes].sort((a, b) => a.position.x - b.position.x), [nodes]);

  const renderNodes: Node[] = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        data: {
          step: (n.data as { step: SequenceStep }).step,
          templates,
          onChange: (step: SequenceStep) => updateStep(n.id, step),
          onDelete: () => deleteNode(n.id),
        } as unknown as Record<string, unknown>,
      })),
    [nodes, templates, updateStep, deleteNode]
  );

  const edges: Edge[] = useMemo(
    () =>
      ordered.slice(1).map((n, i) => ({
        id: `${ordered[i].id}-${n.id}`,
        source: ordered[i].id,
        target: n.id,
        animated: true,
        style: { stroke: "#a3a3a3" },
      })),
    [ordered]
  );

  function handleSave() {
    const steps = ordered.map((n) => (n.data as { step: SequenceStep }).step);
    onSave(steps, audience, startDate);
  }

  function handleStartNow() {
    const steps = ordered.map((n) => (n.data as { step: SequenceStep }).step);
    onStartNow(steps, audience);
  }

  return (
    <Card className="mb-6 p-0 overflow-hidden">
      <AudiencePicker audience={audience} onChange={setAudience} />
      <div className="px-4 pt-3 pb-1 border-b border-neutral-100">
        <label className="text-xs font-semibold text-neutral-700 block mb-1.5">Start date</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
        />
        <span className="text-xs text-neutral-400 ml-2">When the first email should go out. Leave blank to start immediately.</span>
      </div>
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => addNode("email")}
            className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            Add email
          </button>
          <button
            type="button"
            onClick={() => addNode("wait")}
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            Add wait
          </button>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-neutral-200 px-4 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || starting}
            className="rounded-full border border-indigo-200 px-4 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save sequence"}
          </button>
          <button
            type="button"
            onClick={handleStartNow}
            disabled={saving || starting}
            className="rounded-full bg-indigo-700 text-white px-4 py-1.5 text-xs font-medium hover:bg-indigo-800 disabled:opacity-50"
          >
            {starting ? "Starting…" : "Start now"}
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 bg-neutral-50/60">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Sequence Flow</p>
        <p className="text-xs italic text-neutral-400">Drag nodes to reorder the sequence position.</p>
      </div>
      <div style={{ height: 320 }}>
        <ReactFlow
          nodes={renderNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          nodeTypes={nodeTypes}
          proOptions={{ hideAttribution: true }}
          fitView
        >
          <Background />
        </ReactFlow>
      </div>
    </Card>
  );
}
