"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home } from "lucide-react";
import { agents } from "@/lib/data";
import { agentIcons } from "@/lib/icons";

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-72 shrink-0 border-r border-neutral-200 bg-neutral-50/60 h-full overflow-y-auto">
      <div className="px-6 py-7">
        <p className="text-base font-semibold text-neutral-900">Alex&apos;s Assistants</p>
        <p className="text-sm text-neutral-400 mt-0.5">Sample preview · not live yet</p>
      </div>
      <nav className="px-3 pb-6 space-y-0.5">
        <SidebarLink href="/" label="Home" Icon={Home} active={pathname === "/"} />
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
