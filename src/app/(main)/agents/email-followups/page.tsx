import { emailSequences } from "@/lib/data";
import { Card, PageHeader, Badge } from "@/components/ui";

export default function Page() {
  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Email Follow-ups"
        subtitle="Runs multi-step follow-up sequences per lead temperature, automatically."
        tool="Resend / SendGrid / Mailgun + Nylas (inbox sync)"
      />

      <div className="space-y-4">
        {emailSequences.map((e) => (
          <Card key={e.id}>
            <div className="flex items-center justify-between mb-3">
              <p className="font-medium text-neutral-900 text-base">{e.lead}</p>
              <span className="text-base text-neutral-500">{e.sequence}</span>
            </div>
            <div className="space-y-2">
              {e.steps.map((s, i) => (
                <div key={i} className="flex items-center justify-between text-base">
                  <span className="text-neutral-500 w-16 text-base">Day {s.day}</span>
                  <span className="flex-1 text-neutral-700">{s.subject}</span>
                  <Badge>{s.status}</Badge>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
