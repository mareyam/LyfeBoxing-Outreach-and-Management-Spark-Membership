import Link from "next/link";
import { ArrowUpRight, Dumbbell } from "lucide-react";
import { agents } from "@/lib/data";
import { Card } from "@/components/ui";
import { agentIcons } from "@/lib/icons";

export default function Home() {
  return (
    <div className="max-w-5xl">
      <h1 className="text-[28px] leading-tight font-semibold text-neutral-900 tracking-tight">
        Your Assistants
      </h1>
      <p className="text-base text-neutral-500 mt-2 max-w-2xl">
        Here&apos;s a preview of 9 assistants that could run parts of your
        business for you. Click any one to see an example of what it would
        do. Everything on these pages is a sample — no real emails, posts, or
        bookings are being made yet.
      </p>

      <Link href="/lyfe-boxing" className="group block mt-6">
        <Card className="transition-all group-hover:shadow-md group-hover:border-neutral-300 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-neutral-900 flex items-center justify-center shrink-0">
            <Dumbbell className="h-5 w-5 text-white" strokeWidth={1.75} />
          </div>
          <div className="flex-1">
            <p className="text-base font-semibold text-neutral-900">Lyfe Boxing — live gym ops site</p>
            <p className="text-sm text-neutral-500 mt-0.5">
              Real client build: campaigns, past due, win-back, and more, reading from a live Google Sheet.
            </p>
          </div>
          <ArrowUpRight className="h-4 w-4 text-neutral-300 group-hover:text-neutral-500 transition-colors shrink-0" />
        </Card>
      </Link>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        {agents.map((a) => {
          const Icon = agentIcons[a.icon];
          return (
            <Link key={a.slug} href={`/agents/${a.slug}`} className="group">
              <Card className="h-full transition-all group-hover:shadow-md group-hover:border-neutral-300">
                <div className="flex items-start justify-between">
                  <div className="h-10 w-10 rounded-xl bg-neutral-900 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-white" strokeWidth={1.75} />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-neutral-300 group-hover:text-neutral-500 transition-colors" />
                </div>
                <p className="text-base font-semibold text-neutral-900 mt-4">{a.name}</p>
                <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">{a.blurb}</p>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
