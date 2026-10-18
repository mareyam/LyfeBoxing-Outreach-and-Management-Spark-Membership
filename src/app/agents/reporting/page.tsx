import { weeklyReport } from "@/lib/data";
import { Card, PageHeader, Stat } from "@/components/ui";

export default function Page() {
  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Reporting Agent"
        subtitle="Pulls from the CRM and spreadsheets to generate daily/weekly summaries automatically."
        tool="Google Sheets API / Microsoft Graph API"
      />

      <p className="text-base text-neutral-500 mb-4">Week of {weeklyReport.period}</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Stat label="New leads" value={weeklyReport.newLeads} />
        <Stat label="Qualified leads" value={weeklyReport.qualifiedLeads} />
        <Stat label="Deals under review" value={weeklyReport.dealsUnderReview} />
        <Stat label="Deals closed" value={weeklyReport.dealsClosed} />
      </div>

      <Card>
        <p className="text-base text-neutral-500">Revenue this week</p>
        <p className="text-2xl font-semibold text-neutral-900 mt-1">
          ${weeklyReport.revenue.toLocaleString()}
        </p>
        <div className="mt-4 pt-4 border-t border-neutral-100">
          <p className="text-base text-neutral-500 mb-1">Top insight</p>
          <p className="text-base text-neutral-600 leading-relaxed">
            {weeklyReport.topInsight}
          </p>
        </div>
      </Card>
    </div>
  );
}
