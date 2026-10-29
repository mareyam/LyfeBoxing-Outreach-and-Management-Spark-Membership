import LyfeSidebar from "@/components/lyfe/LyfeSidebar";

export default function LyfeBoxingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <LyfeSidebar />
      <main className="flex-1 min-h-screen overflow-y-auto px-10 py-10">{children}</main>
    </div>
  );
}
