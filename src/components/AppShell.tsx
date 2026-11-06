"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import Sidebar from "@/components/Sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- close the drawer on navigation
    setMobileNavOpen(false);
  }, [pathname]);

  if (pathname === "/login") {
    return <div className="h-full w-full overflow-y-auto">{children}</div>;
  }

  return (
    <>
      <div className="hidden md:block h-full">
        <Sidebar />
      </div>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileNavOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] h-full">
            <Sidebar />
          </div>
        </div>
      )}

      <div className="flex-1 h-full flex flex-col overflow-hidden">
        <header className="md:hidden flex items-center gap-3 border-b border-blue-100 bg-white px-4 py-3 shrink-0">
          <button
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open menu"
            className="rounded-lg border border-neutral-200 p-2 text-neutral-600 hover:bg-neutral-50"
          >
            <Menu className="h-5 w-5" strokeWidth={1.75} />
          </button>
          <p className="text-sm font-medium text-neutral-900">Lyfe Boxing</p>
        </header>
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-10 md:py-10">{children}</main>
      </div>
    </>
  );
}
