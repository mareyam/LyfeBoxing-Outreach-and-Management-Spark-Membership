import { AlertTriangle, Inbox } from "lucide-react";
import { Card } from "@/components/ui";

export function SetupNeeded() {
  return (
    <Card className="border-amber-200 bg-amber-50">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-neutral-900">
            Google Sheets isn&apos;t connected yet
          </p>
          <p className="text-sm text-neutral-600 mt-1 max-w-xl">
            This page reads live from the &quot;Spark Memberships&quot; sheet
            using a Google service account. Add{" "}
            <code className="bg-white px-1.5 py-0.5 rounded border border-amber-200 text-xs">
              GOOGLE_SERVICE_ACCOUNT_EMAIL
            </code>{" "}
            and{" "}
            <code className="bg-white px-1.5 py-0.5 rounded border border-amber-200 text-xs">
              GOOGLE_PRIVATE_KEY
            </code>{" "}
            as environment variables, and share the sheet with that service
            account&apos;s email (Viewer for read-only pages, Editor for
            pages that write rows).
          </p>
        </div>
      </div>
    </Card>
  );
}

export function SheetError({ message }: { message: string }) {
  return (
    <Card className="border-red-200 bg-red-50">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-neutral-900">Couldn&apos;t load this sheet</p>
          <p className="text-sm text-neutral-600 mt-1">{message}</p>
        </div>
      </div>
    </Card>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <Card className="text-center py-10">
      <Inbox className="h-8 w-8 text-neutral-300 mx-auto" />
      <p className="font-semibold text-neutral-900 mt-3">{title}</p>
      <p className="text-sm text-neutral-500 mt-1 max-w-sm mx-auto">{body}</p>
    </Card>
  );
}

export function TabMissing({ tabName }: { tabName: string }) {
  return (
    <EmptyState
      title={`Waiting on the "${tabName}" tab`}
      body={`Once this tab is added to the Spark Memberships sheet with the right columns, this page will start showing data automatically.`}
    />
  );
}
