"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  Search,
  BarChart2,
  Users,
  UserPlus,
  CreditCard,
  UserMinus,
  Clock,
  AlertTriangle,
  TrendingUp,
  UserX,
  Megaphone,
  FileText,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import CompanySwitcher from "./CompanySwitcher";

type SidebarLinkDef = { label: string; href?: string; icon: LucideIcon };

const lyfeBoxingGroups: { heading: string; links: SidebarLinkDef[] }[] = [
  {
    heading: "Overview",
    links: [{ href: "/lyfe-boxing/weekly-summary", label: "Summary", icon: BarChart2 }],
  },
  {
    heading: "CRM & Members",
    links: [
      { href: "/lyfe-boxing", label: "All Contacts", icon: Users },
      { href: "/lyfe-boxing/leads", label: "Leads", icon: UserPlus },
      { href: "/lyfe-boxing/memberships", label: "Memberships", icon: CreditCard },
    ],
  },
  {
    heading: "Retention & Growth",
    links: [
      { href: "/lyfe-boxing/cancelled", label: "Cancelled / Win-back", icon: UserMinus },
      { href: "/lyfe-boxing/past-due", label: "Past Due", icon: Clock },
      { href: "/lyfe-boxing/at-risk", label: "At Risk", icon: AlertTriangle },
      { href: "/lyfe-boxing/trial-conversion", label: "Trial Conversion", icon: TrendingUp },
      { href: "/lyfe-boxing/upgrade-candidates", label: "Upgrade Candidates", icon: TrendingUp },
      { label: "Inactive Members", icon: UserX },
    ],
  },
  {
    heading: "Marketing",
    links: [
      { href: "/lyfe-boxing/campaigns", label: "Campaigns", icon: Megaphone },
      { href: "/lyfe-boxing/email-templates", label: "Email Templates", icon: FileText },
      // temporarily hidden — { href: "/lyfe-boxing/sms", label: "SMS Conversations" },
      { label: "Workflows", icon: Workflow },
    ],
  },
  // temporarily hidden
  // {
  //   heading: "05. Operations",
  //   links: [
  //     { href: "/lyfe-boxing/calendar", label: "Calendar" },
  //     { href: "/lyfe-boxing/playbook", label: "Playbook" },
  //   ],
  // },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(lyfeBoxingGroups.map((g) => [g.heading, g.links.some((l) => l.href === pathname)]))
  );

  function toggleGroup(heading: string) {
    setOpenGroups((prev) => ({ ...prev, [heading]: !prev[heading] }));
  }

  return (
    <aside className="w-72 shrink-0 border-r border-blue-100 bg-white h-full overflow-y-auto flex flex-col">
      <div className="px-4 pt-4">
        <CompanySwitcher />
      </div>

      <div className="px-4 pt-3 pb-3">
        <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 focus-within:border-blue-400">
          <Search className="h-4 w-4 shrink-0 text-neutral-400" strokeWidth={1.75} />
          <span className="flex-1 text-sm text-neutral-400">Search</span>
          <kbd className="text-[11px] font-medium text-blue-600 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5">
            ⌘K
          </kbd>
        </div>
      </div>

      <nav className="flex-1 px-3 pb-3 space-y-3 overflow-y-auto">
        {lyfeBoxingGroups.map((group) => (
          <SidebarSection
            key={group.heading}
            title={group.heading}
            open={!!openGroups[group.heading]}
            onToggle={() => toggleGroup(group.heading)}
            links={group.links}
            pathname={pathname}
          />
        ))}
      </nav>

      <div className="border-t border-blue-100 px-3 py-3">
        <button className="w-full flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-blue-50">
          <div className="h-7 w-7 shrink-0 rounded-full bg-blue-600 text-white text-[11px] font-semibold flex items-center justify-center">
            LB
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium text-neutral-900 truncate">Lyfe Boxing</p>
            <p className="text-xs text-neutral-400 truncate">Google Sheets connected</p>
          </div>
        </button>
      </div>
    </aside>
  );
}

function SidebarSection({
  title,
  open,
  onToggle,
  links,
  pathname,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  links: SidebarLinkDef[];
  pathname: string;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-neutral-400 uppercase tracking-wide hover:text-blue-600 transition-colors"
      >
        <span className="flex-1 text-left">{title}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "" : "-rotate-90"}`} strokeWidth={2} />
      </button>
      {open && (
        <div className="space-y-0.5">
          {links.map((l) => {
            const Icon = l.icon;
            return l.href ? (
              <Link
                key={l.href}
                href={l.href}
                className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors ${
                  pathname === l.href
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-neutral-600 hover:bg-blue-50/60 hover:text-blue-700"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                <span className="truncate">{l.label}</span>
              </Link>
            ) : (
              <span
                key={l.label}
                title="Coming soon"
                className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-neutral-300 cursor-not-allowed select-none"
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                <span className="truncate">{l.label}</span>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
