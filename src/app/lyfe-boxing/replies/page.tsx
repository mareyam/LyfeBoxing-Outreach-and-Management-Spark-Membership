import { Suspense } from "react";
import { RepliesView } from "@/components/lyfeBoxing/replies";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <RepliesView />
    </Suspense>
  );
}
