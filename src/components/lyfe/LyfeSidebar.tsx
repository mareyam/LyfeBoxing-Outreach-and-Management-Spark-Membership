"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Megaphone,
  CircleDollarSign,
  UserMinus,
  Sparkles,
  AlertCircle,
  TrendingUp,
  FileBarChart,
  CalendarDays,
} from "lucide-react";

const links = [
  { href: "/lyfe-boxing", label: "Dashboard", Icon: LayoutDashboard, exact: true },
  { href: "/lyfe-boxing/campaigns", label: "Campaigns", Icon: Megaphone },
  { href: "/lyfe-boxing/past-due", label: "Past Due", Icon: CircleDollarSign },
  { href: "/lyfe-boxing/cancelled", label: "Cancelled / Win-back", Icon: UserMinus },
  { href: "/lyfe-boxing/trial-conversion", label: "Trial Conversion", Icon: Sparkles },
  { href: "/lyfe-boxing/at-risk", label: "At Risk", Icon: AlertCircle },
  { href: "/lyfe-boxing/upgrade-candidates", label: "Upgrade Candidates", Icon: TrendingUp },
  { href: "/lyfe-boxing/weekly-summary", label: "Weekly Summary", Icon: FileBarChart },
  { href: "/lyfe-boxing/calendar", label: "Calendar", Icon: CalendarDays },
];

export default function LyfeSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-72 shrink-0 border-r border-neutral-200 bg-neutral-50/60 h-full overflow-y-auto">
      <div className="px-6 py-7">
        <Link href="/" className="text-xs text-neutral-400 hover:text-neutral-600">
          ← Back to all assistants
        </Link>
        <p className="text-base font-semibold text-neutral-900 mt-2">Lyfe Boxing</p>
        <p className="text-sm text-neutral-400 mt-0.5">Gym operations</p>
      </div>
      <nav className="px-3 pb-6 space-y-0.5">
        {links.map(({ href, label, Icon, exact }) => {
          const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-white text-neutral-900 shadow-sm border border-neutral-200"
                  : "text-neutral-600 hover:bg-white/70 hover:text-neutral-900"
              }`}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
