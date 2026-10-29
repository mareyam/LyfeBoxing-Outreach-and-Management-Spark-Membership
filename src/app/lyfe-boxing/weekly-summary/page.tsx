import { Suspense } from "react";
import { WeeklySummaryView } from "@/components/lyfeBoxing/views";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <WeeklySummaryView />
    </Suspense>
  );
}
