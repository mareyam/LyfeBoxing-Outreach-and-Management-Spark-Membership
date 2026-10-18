import Link from "next/link";
import { agents } from "@/lib/data";
import { Card } from "@/components/ui";

export default function Home() {
  return (
    <div className="max-w-5xl">
      <h1 className="text-3xl font-bold text-black">Your Assistants</h1>
      <p className="text-base text-neutral-700 mt-2 max-w-2xl">
        Here&apos;s a preview of 9 assistants that could run parts of your
        business for you. Click any one to see an example of what it would do.
        Everything on these pages is a sample — no real emails, posts, or
        bookings are being made yet.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-8">
        {agents.map((a) => (
          <Link key={a.slug} href={`/agents/${a.slug}`}>
            <Card className="h-full hover:bg-neutral-50 transition-colors">
              <p className="text-lg font-bold text-black">{a.name}</p>
              <p className="text-base text-neutral-600 mt-2">{a.blurb}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
