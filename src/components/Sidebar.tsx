"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { agents } from "@/lib/data";

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 border-r border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950 h-full overflow-y-auto">
      <div className="px-5 py-5 border-b border-neutral-200 dark:border-neutral-800">
        <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          Alex Ops — Agent Suite
        </p>
        <p className="text-xs text-neutral-500 mt-0.5">Demo · dummy data</p>
      </div>
      <nav className="p-2">
        <Link
          href="/"
          className={`block rounded-md px-3 py-2 text-sm mb-1 ${
            pathname === "/"
              ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
              : "text-neutral-700 hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-800"
          }`}
        >
          Overview
        </Link>
        {agents.map((a) => {
          const href = `/agents/${a.slug}`;
          const active = pathname === href;
          return (
            <Link
              key={a.slug}
              href={href}
              className={`block rounded-md px-3 py-2 text-sm mb-1 ${
                active
                  ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                  : "text-neutral-700 hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-800"
              }`}
            >
              {a.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
