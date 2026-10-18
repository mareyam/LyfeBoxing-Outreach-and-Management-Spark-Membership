export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 ${className}`}
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
    <div className="mb-6">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">{title}</h1>
      <p className="text-sm text-neutral-500 mt-1">{subtitle}</p>
      {tool && (
        <p className="text-xs text-neutral-400 mt-2">
          Real integration: <span className="font-mono">{tool}</span>
        </p>
      )}
    </div>
  );
}

const badgeColors: Record<string, string> = {
  Hot: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  Warm: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  Unqualified: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
  High: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  Medium: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  Low: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  Confirmed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  "Pending confirmation": "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  Sent: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  Scheduled: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  Reviewed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  Processing: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  "Pending approval": "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  Approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
};

export function Badge({ children }: { children: string }) {
  const cls = badgeColors[children] ?? "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300";
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{children}</span>;
}

export function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mt-1">{value}</p>
    </div>
  );
}
