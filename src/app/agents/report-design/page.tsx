import { generatedReports } from "@/lib/data";
import { Card, PageHeader } from "@/components/ui";

export default function Page() {
  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Report / Design Generation"
        subtitle="Turns raw data into branded, ready-to-send PDF reports and one-pagers."
        tool="WeasyPrint / ReportLab / Pandoc"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {generatedReports.map((r) => (
          <Card key={r.id}>
            <div className="h-28 rounded-lg bg-gradient-to-br from-neutral-100 to-neutral-200 mb-3 flex items-center justify-center text-base text-neutral-400">
              PDF preview
            </div>
            <p className="font-medium text-neutral-900 text-base">{r.title}</p>
            <div className="flex items-center justify-between mt-2 text-base text-neutral-500">
              <span>{r.type}</span>
              <span>{r.pages} pages</span>
            </div>
            <p className="text-base text-neutral-400 mt-1">Generated {r.createdAt}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
