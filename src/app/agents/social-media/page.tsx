import { socialDrafts } from "@/lib/data";
import { Card, PageHeader, Badge } from "@/components/ui";

export default function Page() {
  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Social Media Posting"
        subtitle="Drafts posts from deal activity; a human approves before anything goes live."
        tool="Buffer API / LinkedIn API / X API v2"
      />

      <div className="space-y-4">
        {socialDrafts.map((s) => (
          <Card key={s.id}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-base font-medium text-neutral-500">{s.platform}</span>
              <Badge>{s.status}</Badge>
            </div>
            <p className="text-base text-neutral-700 leading-relaxed">{s.text}</p>
            <p className="text-base text-neutral-400 mt-3">Scheduled for {s.scheduledFor}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
