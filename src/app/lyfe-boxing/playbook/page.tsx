import { Suspense } from "react";
import { PlaybookView } from "@/components/lyfeBoxing/playbook";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PlaybookView />
    </Suspense>
  );
}
