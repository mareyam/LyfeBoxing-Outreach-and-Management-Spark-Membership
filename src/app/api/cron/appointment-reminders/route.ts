import { NextRequest, NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/grokAuth";
import { getSupabaseClient, resolveBusinessId, SupabaseNotConfiguredError } from "@/lib/supabaseServer";
import { notifyGrokPayload } from "@/lib/notifyGrok";

export const maxDuration = 300;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

type Window = { daysBefore: 3 | 1; column: "reminder_3d_sent_at" | "reminder_1d_sent_at" };
const WINDOWS: Window[] = [
  { daysBefore: 3, column: "reminder_3d_sent_at" },
  { daysBefore: 1, column: "reminder_1d_sent_at" },
];

/**
 * Hourly: for each booked appointment landing in the next [N days, N days + 1h)
 * window that hasn't had that reminder sent yet, queues a reminder through the
 * Grok webhook and records reminder_{3d,1d}_sent_at so it's never sent twice.
 */
export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const supabase = getSupabaseClient();
    const businessId = await resolveBusinessId(supabase);
    const now = Date.now();

    let sent = 0;
    let errors = 0;

    for (const window of WINDOWS) {
      const from = new Date(now + window.daysBefore * DAY_MS).toISOString();
      const to = new Date(now + window.daysBefore * DAY_MS + HOUR_MS).toISOString();

      const { data: appointments, error } = await supabase
        .from("appointments")
        .select("id, lead_id, scheduled_at, leads(full_name, email)")
        .eq("business_id", businessId)
        .eq("status", "booked")
        .is(window.column, null)
        .gte("scheduled_at", from)
        .lt("scheduled_at", to);
      if (error || !appointments) {
        errors += 1;
        continue;
      }

      for (const appt of appointments) {
        const lead = appt.leads as unknown as { full_name: string | null; email: string | null } | null;
        if (!lead?.email) continue;
        const firstName = (lead.full_name ?? "").trim().split(/\s+/)[0] || "there";

        try {
          await notifyGrokPayload(
            {
              type: "appointment_reminder",
              days_before: window.daysBefore,
              business_id: businessId,
              lead_id: appt.lead_id,
              to: lead.email,
              first_name: firstName,
              scheduled_at: appt.scheduled_at,
            },
            `appointment_reminder appt=${appt.id} days=${window.daysBefore}`
          );
          await supabase
            .from("appointments")
            .update({ [window.column]: new Date().toISOString() })
            .eq("id", appt.id);
          sent += 1;
        } catch {
          errors += 1;
        }
      }
    }

    return NextResponse.json({ ok: true, sent, errors });
  } catch (err) {
    if (err instanceof SupabaseNotConfiguredError) {
      return NextResponse.json({ error: err.message, notConfigured: true }, { status: 503 });
    }
    console.error("[cron/appointment-reminders] run failed", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Reminder run failed." }, { status: 500 });
  }
}
