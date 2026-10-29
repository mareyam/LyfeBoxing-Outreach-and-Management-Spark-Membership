import { Suspense } from "react";
import { CancelledView } from "@/components/lyfeBoxing/views";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CancelledView />
    </Suspense>
  );
}
