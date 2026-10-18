import { documents } from "@/lib/data";
import { Card, PageHeader, Badge } from "@/components/ui";

export default function Page() {
  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Document Review Agent"
        subtitle="Reads contracts and reports (OCR'd to clean text), flags risky clauses for human review."
        tool="LlamaParse / Unstructured.io + AWS S3"
      />

      <div className="space-y-4">
        {documents.map((d) => (
          <Card key={d.id}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-neutral-900 font-mono text-base">{d.name}</p>
                <p className="text-base text-neutral-500 mt-0.5">{d.pages} pages</p>
              </div>
              <Badge>{d.status}</Badge>
            </div>
            {d.flaggedClauses.length > 0 ? (
              <div className="mt-4 space-y-2">
                {d.flaggedClauses.map((c, i) => (
                  <div key={i} className="rounded-lg bg-neutral-50 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-base font-medium text-neutral-800">{c.clause}</p>
                      <Badge>{c.severity}</Badge>
                    </div>
                    <p className="text-base text-neutral-500 mt-1">{c.issue}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-base text-neutral-400 mt-4">Still processing — no clauses extracted yet.</p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
