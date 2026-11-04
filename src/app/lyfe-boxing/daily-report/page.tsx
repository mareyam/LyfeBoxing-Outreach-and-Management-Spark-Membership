import { Suspense } from "react";
import { DailyReportView } from "@/components/lyfeBoxing/dailyReport";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <DailyReportView />
    </Suspense>
  );
}
