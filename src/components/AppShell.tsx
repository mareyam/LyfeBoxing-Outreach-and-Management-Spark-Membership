"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/login") {
    return <div className="h-full w-full overflow-y-auto">{children}</div>;
  }
  return (
    <>
      <Sidebar />
      <main className="flex-1 h-full overflow-y-auto px-10 py-10">{children}</main>
    </>
  );
}
