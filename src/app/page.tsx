import Link from "next/link";
import { agents } from "@/lib/data";
import { Card } from "@/components/ui";

export default function Home() {
  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
        Agent Suite Overview
      </h1>
      <p className="text-sm text-neutral-500 mt-1 max-w-2xl">
        Walkthrough demo of the 9 agents discussed with Alex. Every number and
        message below is dummy data standing in for the real integrations
        listed on each page — nothing here calls a live API.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {agents.map((a) => (
          <Link key={a.slug} href={`/agents/${a.slug}`}>
            <Card className="h-full hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors">
              <p className="font-medium text-neutral-900 dark:text-neutral-100">{a.name}</p>
              <p className="text-xs text-neutral-400 mt-2 font-mono">{a.tool}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
