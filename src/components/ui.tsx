export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  tool,
}: {
  title: string;
  subtitle: string;
  tool?: string;
}) {
  return (
    <div className="mb-8 pb-6 border-b border-neutral-200">
      <h1 className="text-[28px] leading-tight font-semibold text-neutral-900 tracking-tight">
        {title}
      </h1>
      <p className="text-base text-neutral-500 mt-2 max-w-2xl">{subtitle}</p>
      {tool && (
        <p className="inline-flex items-center gap-1.5 text-sm text-neutral-400 mt-4 bg-neutral-50 border border-neutral-200 rounded-full px-3 py-1">
          Behind the scenes: <span className="text-neutral-600">{tool}</span>
        </p>
      )}
    </div>
  );
}

// Monochrome status pills — a filled dot carries the meaning instead of
// color, so it reads fine even to someone skimming in black & white.
const badgeKind: Record<string, "done" | "attention" | "neutral"> = {
  Hot: "attention",
  Warm: "neutral",
  Unqualified: "neutral",
  High: "attention",
  Medium: "neutral",
  Low: "done",
  Confirmed: "done",
  "Pending confirmation": "neutral",
  Sent: "done",
  Scheduled: "neutral",
  Reviewed: "done",
  Processing: "neutral",
  "Pending approval": "neutral",
  Approved: "done",
  "Ready to send": "neutral",
  Error: "attention",
  Draft: "neutral",
  Queued: "neutral",
  Sending: "attention",
};

const dotStyle: Record<string, string> = {
  done: "bg-neutral-900",
  attention: "bg-neutral-900",
  neutral: "bg-neutral-300",
};

export function Badge({ children }: { children: string }) {
  const kind = badgeKind[children] ?? "neutral";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-sm font-medium text-neutral-700">
      <span className={`h-1.5 w-1.5 rounded-full ${dotStyle[kind]}`} />
      {children}
    </span>
  );
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const dims = size === "sm" ? "h-7 w-7 text-[11px]" : "h-8 w-8 text-xs";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-semibold ${dims}`}
    >
      {initialsOf(name || "?")}
    </span>
  );
}

export function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="text-[26px] leading-none font-semibold text-neutral-900 mt-2">{value}</p>
    </div>
  );
}
