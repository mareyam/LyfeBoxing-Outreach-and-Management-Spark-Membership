export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border-2 border-black bg-white p-6 ${className}`}>
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
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-black">{title}</h1>
      <p className="text-base text-neutral-700 mt-2 max-w-2xl">{subtitle}</p>
      {tool && (
        <p className="text-sm text-neutral-500 mt-3">
          Works behind the scenes with: <span className="font-medium text-neutral-700">{tool}</span>
        </p>
      )}
    </div>
  );
}

// Plain black / white / gray only — no color-coding, so nothing relies on
// color meaning something (easier for anyone skimming quickly).
const badgeStyle: Record<string, string> = {
  solid: "bg-black text-white",
  outline: "border-2 border-black text-black",
  muted: "bg-neutral-200 text-neutral-600",
};

const badgeKind: Record<string, keyof typeof badgeStyle> = {
  Hot: "solid",
  Warm: "outline",
  Unqualified: "muted",
  High: "solid",
  Medium: "outline",
  Low: "muted",
  Confirmed: "solid",
  "Pending confirmation": "outline",
  Sent: "solid",
  Scheduled: "outline",
  Reviewed: "solid",
  Processing: "outline",
  "Pending approval": "outline",
  Approved: "solid",
};

export function Badge({ children }: { children: string }) {
  const kind = badgeKind[children] ?? "muted";
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${badgeStyle[kind]}`}>
      {children}
    </span>
  );
}

export function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border-2 border-black bg-white p-5">
      <p className="text-sm text-neutral-600">{label}</p>
      <p className="text-2xl font-bold text-black mt-1">{value}</p>
    </div>
  );
}
