import { Suspense } from "react";
import { NurtureView } from "@/components/lyfeBoxing/nurture";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <NurtureView />
    </Suspense>
  );
}
