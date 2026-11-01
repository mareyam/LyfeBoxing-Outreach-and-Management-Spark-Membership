"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar } from "lucide-react";
import { Card } from "@/components/ui";

type AppointmentRow = {
  id: string;
  scheduled_at: string;
  type: string;
  status: string;
  leads?: { full_name?: string | null; email?: string | null } | { full_name?: string | null; email?: string | null }[] | null;
};

function leadName(leads: AppointmentRow["leads"]): string {
  const lead = Array.isArray(leads) ? leads[0] : leads;
  return lead?.full_name?.trim() || "Unknown lead";
}

export default function AppointmentsPage() {
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [message, setMessage] = useState("");
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);

  useEffect(() => {
    fetch("/api/appointments")
      .then(async (res) => {
        const data = await res.json();
        if (data.notConfigured) {
          setState("missing");
          setMessage(data.error ?? "Supabase isn't configured.");
          return;
        }
        if (!res.ok) {
          setState("error");
          setMessage(data.error ?? "Couldn't load appointments.");
          return;
        }
        setAppointments(data.appointments ?? []);
        setState("ready");
      })
      .catch(() => {
        setState("error");
        setMessage("Couldn't load appointments.");
      });
  }, []);

  return (
    <div className="max-w-[1600px]">
      <div className="mb-2 flex items-center gap-1.5 text-sm text-neutral-400">
        <Link href="/lyfe-boxing" className="hover:text-blue-600">
          Home
        </Link>
        <span>›</span>
        <span className="text-neutral-600 font-medium">Appointments</span>
      </div>
      <div className="mb-6">
        <h1 className="text-[28px] leading-tight font-semibold text-neutral-900 tracking-tight">Appointments</h1>
        <p className="text-base text-neutral-500 mt-2 max-w-2xl">
          Booked and no-show appointments. This page only reads them.
        </p>
      </div>
      {state === "loading" && (
        <div className="space-y-3" aria-busy="true" aria-label="Loading appointments">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-2xl bg-neutral-100 animate-pulse" />
          ))}
        </div>
      )}
      {state === "missing" && (
        <Card className="text-center py-12">
          <Calendar className="h-8 w-8 text-neutral-300 mx-auto" strokeWidth={1.5} />
          <p className="font-semibold text-neutral-900 mt-3">Supabase isn&apos;t configured</p>
          <p className="text-sm text-neutral-500 mt-1 max-w-md mx-auto">{message}</p>
        </Card>
      )}
      {state === "error" && (
        <Card className="border-red-200 bg-red-50">
          <p className="font-semibold text-neutral-900">Couldn&apos;t load appointments</p>
          <p className="text-sm text-neutral-600 mt-1">{message}</p>
        </Card>
      )}
      {state === "ready" && appointments.length === 0 && (
        <Card className="text-center py-12">
          <Calendar className="h-8 w-8 text-neutral-300 mx-auto" strokeWidth={1.5} />
          <p className="font-semibold text-neutral-900 mt-3">No appointments yet</p>
          <p className="text-sm text-neutral-500 mt-1 max-w-md mx-auto">
            Booked and no-show appointments will show here once they are stored.
          </p>
        </Card>
      )}
      {state === "ready" && appointments.length > 0 && (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-neutral-400 uppercase tracking-wide border-b border-neutral-100">
                <th className="py-3 pr-4">When</th>
                <th className="py-3 pr-4">Lead</th>
                <th className="py-3 pr-4">Type</th>
                <th className="py-3 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((appointment) => (
                <tr key={appointment.id} className="border-b border-neutral-50 last:border-0">
                  <td className="py-3 pr-4 text-neutral-700 whitespace-nowrap">
                    {appointment.scheduled_at ? new Date(appointment.scheduled_at).toLocaleString() : "—"}
                  </td>
                  <td className="py-3 pr-4 font-medium text-neutral-900">{leadName(appointment.leads)}</td>
                  <td className="py-3 pr-4 text-neutral-600">{appointment.type || "—"}</td>
                  <td className="py-3 pr-4 text-neutral-600">{appointment.status || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
