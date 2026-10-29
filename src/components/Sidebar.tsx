"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Dumbbell, ChevronDown, ChevronRight } from "lucide-react";
import { agents } from "@/lib/data";
import { agentIcons } from "@/lib/icons";

const lyfeBoxingLinks = [
  { href: "/lyfe-boxing", label: "Memberships" },
  { href: "/lyfe-boxing/summary", label: "Summary" },
  { href: "/lyfe-boxing/cancelled", label: "Cancelled / Win-back" },
  { href: "/lyfe-boxing/past-due", label: "Past Due" },
  { href: "/lyfe-boxing/campaigns", label: "Campaigns" },
  { href: "/lyfe-boxing/payments", label: "Payments (Oct 1-25)" },
  { href: "/lyfe-boxing/sms", label: "SMS Conversations" },
  { href: "/lyfe-boxing/contacts", label: "Contacts" },
  { href: "/lyfe-boxing/reports", label: "Reports Index" },
  { href: "/lyfe-boxing/trial-conversion", label: "Trial Conversion" },
  { href: "/lyfe-boxing/at-risk", label: "At Risk" },
  { href: "/lyfe-boxing/upgrade-candidates", label: "Upgrade Candidates" },
  { href: "/lyfe-boxing/weekly-summary", label: "Weekly Summary" },
  { href: "/lyfe-boxing/calendar", label: "Calendar" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const isLyfeBoxing = pathname.startsWith("/lyfe-boxing");
  const [lyfeBoxingOpen, setLyfeBoxingOpen] = useState(isLyfeBoxing);
  const [othersOpen, setOthersOpen] = useState(false);

  return (
    <aside className="w-72 shrink-0 border-r border-neutral-200 bg-neutral-50/60 h-full overflow-y-auto">
      <div className="px-6 py-7">
        <p className="text-base font-semibold text-neutral-900">Alex&apos;s Assistants</p>
        <p className="text-sm text-neutral-400 mt-0.5">Sample preview · not live yet</p>
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
          <div className="ml-[22px] pl-[13px] border-l border-neutral-200 space-y-0.5 py-0.5">
            {lyfeBoxingLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
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

        <button
          onClick={() => setOthersOpen((o) => !o)}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-600 hover:bg-white/70 hover:text-neutral-900 transition-colors mt-1"
        >
          <span className="flex-1 text-left">Others</span>
          {othersOpen ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-neutral-400" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400" />
          )}
        </button>
        {othersOpen && (
          <div className="space-y-0.5">
            {agents.map((a) => {
              const href = `/agents/${a.slug}`;
              return (
                <SidebarLink
                  key={a.slug}
                  href={href}
                  label={a.name}
                  Icon={agentIcons[a.icon]}
                  active={pathname === href}
                />
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
