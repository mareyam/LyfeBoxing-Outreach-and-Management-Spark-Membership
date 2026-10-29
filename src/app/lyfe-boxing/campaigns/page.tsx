import { Suspense } from "react";
import { CampaignsView } from "@/components/lyfeBoxing/views";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CampaignsView />
    </Suspense>
  );
}
