import { dealProperties } from "@/lib/data";
import { Card, PageHeader, Badge, Stat } from "@/components/ui";

export default function Page() {
  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Research + Underwriting Agent"
        subtitle="Pulls property/company data from public sources, reviews deal numbers and risk, writes up a summary."
        tool="Attom / Reonomy API, SEC EDGAR, Firecrawl"
      />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Stat label="Deals in pipeline" value={dealProperties.length} />
        <Stat label="High risk flags" value={dealProperties.filter((d) => d.riskLevel === "High").length} />
        <Stat
          label="Avg cap rate"
          value={`${(dealProperties.reduce((s, d) => s + d.capRate, 0) / dealProperties.length).toFixed(1)}%`}
        />
      </div>

      <div className="space-y-4">
        {dealProperties.map((d) => (
          <Card key={d.id}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-neutral-900">{d.address}</p>
                <p className="text-base text-neutral-500">{d.type}</p>
              </div>
              <Badge>{d.riskLevel}</Badge>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4 text-base">
              <div>
                <p className="text-base text-neutral-500">Asking price</p>
                <p className="font-medium text-neutral-900">${d.askingPrice.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-base text-neutral-500">NOI</p>
                <p className="font-medium text-neutral-900">${d.noi.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-base text-neutral-500">Cap rate</p>
                <p className="font-medium text-neutral-900">{d.capRate}%</p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-base text-neutral-500 mb-1">Risk flags</p>
              <div className="flex gap-2 flex-wrap">
                {d.riskFlags.map((f) => (
                  <span
                    key={f}
                    className="text-base rounded-md bg-neutral-100 px-2 py-1 text-neutral-600"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
            <p className="text-base text-neutral-600 mt-4 leading-relaxed">
              {d.summary}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
