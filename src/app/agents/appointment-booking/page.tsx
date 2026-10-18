import { appointments } from "@/lib/data";
import { Card, PageHeader, Badge } from "@/components/ui";

export default function Page() {
  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Appointment Booking"
        subtitle="Books calls and walkthroughs directly on the calendar, with optional SMS confirmation."
        tool="Cal.com / Google Calendar API + Twilio (SMS)"
      />

      <div className="space-y-3">
        {appointments.map((a) => (
          <Card key={a.id} className="flex items-center justify-between">
            <div>
              <p className="font-medium text-neutral-900 dark:text-neutral-100 text-sm">{a.name}</p>
              <p className="text-xs text-neutral-500">{a.type} · with {a.withWhom}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-neutral-700 dark:text-neutral-300">{a.date}</p>
              <p className="text-xs text-neutral-500">{a.time}</p>
            </div>
            <Badge>{a.status}</Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}
