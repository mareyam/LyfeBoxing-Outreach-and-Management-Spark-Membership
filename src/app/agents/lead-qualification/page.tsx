import { leads } from "@/lib/data";
import { PageHeader, Badge, Stat } from "@/components/ui";

export default function Page() {
  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Lead Qualification Agent"
        subtitle="Scores incoming leads against Alex's buy-box criteria and routes hot leads for follow-up."
        tool="HubSpot API / Salesforce REST API"
      />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Stat label="New this week" value={leads.length} />
        <Stat label="Hot leads" value={leads.filter((l) => l.status === "Hot").length} />
        <Stat
          label="Avg score"
          value={Math.round(leads.reduce((s, l) => s + l.score, 0) / leads.length)}
        />
      </div>

      <div className="rounded-xl border border-neutral-200 overflow-hidden bg-white">
        <table className="w-full text-base">
          <thead className="bg-neutral-50 text-left text-base text-neutral-500">
            <tr>
              <th className="px-4 py-3">Lead</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Budget</th>
              <th className="px-4 py-3">Timeline</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id} className="border-t border-neutral-100">
                <td className="px-4 py-3">
                  <p className="font-medium text-neutral-900">{l.name}</p>
                  <p className="text-base text-neutral-500">{l.company}</p>
                </td>
                <td className="px-4 py-3 text-neutral-600">{l.source}</td>
                <td className="px-4 py-3 text-neutral-600">${l.budget.toLocaleString()}</td>
                <td className="px-4 py-3 text-neutral-600">{l.timeline}</td>
                <td className="px-4 py-3 font-medium text-neutral-900">{l.score}</td>
                <td className="px-4 py-3">
                  <Badge>{l.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 space-y-2">
        {leads.map((l) => (
          <p key={l.id} className="text-base text-neutral-500">
            <span className="font-medium text-neutral-700">{l.name}:</span> {l.notes}
          </p>
        ))}
      </div>
    </div>
  );
}
