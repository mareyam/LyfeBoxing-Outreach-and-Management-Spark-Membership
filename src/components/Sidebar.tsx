"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Dumbbell, ChevronDown, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

const lyfeBoxingGroups = [
  {
    heading: "Overview",
    links: [
      { href: "/lyfe-boxing/weekly-summary", label: "Summary" },
    ],
  },
  {
    heading: "Members & CRM",
    links: [
      { href: "/lyfe-boxing", label: "Memberships" },
      { href: "/lyfe-boxing/leads", label: "Leads" },
    ],
  },
  {
    heading: "Retention & Growth",
    links: [
      { href: "/lyfe-boxing/cancelled", label: "Cancelled / Win-back" },
      { href: "/lyfe-boxing/past-due", label: "Past Due" },
      { href: "/lyfe-boxing/at-risk", label: "At Risk" },
      { href: "/lyfe-boxing/trial-conversion", label: "Trial Conversion" },
      { href: "/lyfe-boxing/upgrade-candidates", label: "Upgrade Candidates" },
    ],
  },
  {
    heading: "Marketing & Engagement",
    links: [
      { href: "/lyfe-boxing/campaigns", label: "Campaigns" },
      { href: "/lyfe-boxing/sms", label: "SMS Conversations" },
    ],
  },
  {
    heading: "Revenue & Payments",
    links: [{ href: "/lyfe-boxing/payments", label: "Payments" }],
  },
  {
    heading: "Operations",
    links: [
      { href: "/lyfe-boxing/calendar", label: "Calendar" },
      { href: "/lyfe-boxing/playbook", label: "Playbook" },
    ],
  },
];

const COLLAPSE_KEY = "sidebar-collapsed";

export default function Sidebar() {
  const pathname = usePathname();
  const isLyfeBoxing = pathname.startsWith("/lyfe-boxing");
  const [lyfeBoxingOpen, setLyfeBoxingOpen] = useState(isLyfeBoxing);
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(lyfeBoxingGroups.map((g) => [g.heading, g.links.some((l) => l.href === pathname)]))
  );

  function toggleGroup(heading: string) {
    setOpenGroups((prev) => ({ ...prev, [heading]: !prev[heading] }));
  }

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reading a per-viewer UI preference from localStorage, only available client-side after mount
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      // ignore — private browsing / blocked storage
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }

  if (collapsed) {
    return (
      <aside className="w-16 shrink-0 border-r border-neutral-200 bg-neutral-50/60 h-full overflow-y-auto flex flex-col items-center py-4 gap-2">
        <button
          onClick={toggleCollapsed}
          title="Expand sidebar"
          className="h-9 w-9 flex items-center justify-center rounded-lg text-neutral-500 hover:bg-white hover:text-neutral-900"
        >
          <ChevronsRight className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </button>
        <div className="w-full border-t border-neutral-200 my-1" />
        <Link
          href="/"
          title="Home"
          className={`h-9 w-9 flex items-center justify-center rounded-lg ${
            pathname === "/" ? "bg-white text-neutral-900 shadow-sm border border-neutral-200" : "text-neutral-500 hover:bg-white"
          }`}
        >
          <Home className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </Link>
        <Link
          href="/lyfe-boxing"
          title="Lyfe Boxing"
          className={`h-9 w-9 flex items-center justify-center rounded-lg ${
            isLyfeBoxing ? "bg-white text-neutral-900 shadow-sm border border-neutral-200" : "text-neutral-500 hover:bg-white"
          }`}
        >
          <Dumbbell className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </Link>
      </aside>
    );
  }

  return (
    <aside className="w-72 shrink-0 border-r border-neutral-200 bg-neutral-50/60 h-full overflow-y-auto">
      <div className="px-6 py-7 flex items-start justify-between gap-2">
        <div>
          <p className="text-base font-semibold text-neutral-900">Alex&apos;s Assistants</p>
          <p className="text-sm text-neutral-400 mt-0.5">Sample preview · not live yet</p>
        </div>
        <button
          onClick={toggleCollapsed}
          title="Collapse sidebar"
          className="h-7 w-7 shrink-0 flex items-center justify-center rounded-lg text-neutral-400 hover:bg-white hover:text-neutral-700"
        >
          <ChevronsLeft className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>
      <nav className="px-3 pb-6 space-y-0.5">
        <SidebarLink href="/" label="Home" Icon={Home} active={pathname === "/"} />

        <button
          onClick={() => setLyfeBoxingOpen((o) => !o)}
          className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
            isLyfeBoxing
              ? "bg-white text-neutral-900 shadow-sm border border-neutral-200"
              : "text-neutral-600 hover:bg-white/70 hover:text-neutral-900"
          }`}
        >
          <Dumbbell className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
          <span className="flex-1 text-left">Lyfe Boxing</span>
          {lyfeBoxingOpen ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-neutral-400" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400" />
          )}
        </button>
        {lyfeBoxingOpen && (
          <div className="ml-[22px] pl-[13px] border-l border-neutral-200 py-1 space-y-0.5">
            {lyfeBoxingGroups.map((group) => {
              const groupOpen = !!openGroups[group.heading];
              return (
                <div key={group.heading}>
                  <button
                    onClick={() => toggleGroup(group.heading)}
                    className="w-full flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-neutral-400 uppercase tracking-wide hover:bg-white/70 hover:text-neutral-600 transition-colors"
                  >
                    {groupOpen ? (
                      <ChevronDown className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                    )}
                    <span className="flex-1 text-left">{group.heading}</span>
                  </button>
                  {groupOpen && (
                    <div className="space-y-0.5 pb-2">
                      {group.links.map((l) => (
                        <Link
                          key={l.href}
                          href={l.href}
                          className={`block rounded-lg px-3 py-2 ml-[18px] text-sm transition-colors ${
                            pathname === l.href
                              ? "bg-white text-neutral-900 font-medium shadow-sm border border-neutral-200"
                              : "text-neutral-500 hover:bg-white/70 hover:text-neutral-900"
                          }`}
                        >
                          {l.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </nav>
    </aside>
  );
}

function SidebarLink({
  href,
  label,
  Icon,
  active,
}: {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  active: boolean;
}) {
  return (
    <Link
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
}
