"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { agents } from "@/lib/data";

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-72 shrink-0 border-r-2 border-black bg-white h-full overflow-y-auto">
      <div className="px-6 py-6 border-b-2 border-black">
        <p className="text-lg font-bold text-black">Alex&apos;s Assistants</p>
        <p className="text-sm text-neutral-500 mt-1">Sample version — not live yet</p>
      </div>
      <nav className="p-3">
        <Link
          href="/"
          className={`block rounded-xl px-4 py-3 text-base font-medium mb-1 ${
            pathname === "/" ? "bg-black text-white" : "text-black hover:bg-neutral-100"
          }`}
        >
          Home
        </Link>
        {agents.map((a) => {
          const href = `/agents/${a.slug}`;
          const active = pathname === href;
          return (
            <Link
              key={a.slug}
              href={href}
              className={`block rounded-xl px-4 py-3 text-base font-medium mb-1 ${
                active ? "bg-black text-white" : "text-black hover:bg-neutral-100"
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
