import { Suspense } from "react";
import { LeadsView } from "@/components/lyfeBoxing/leads";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LeadsView />
    </Suspense>
  );
}
