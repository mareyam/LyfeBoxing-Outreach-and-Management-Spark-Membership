import { NextRequest, NextResponse } from "next/server";
import { SupabaseNotConfiguredError } from "@/lib/supabaseServer";
import { resumeEnrollment, setEnrollmentStatus } from "@/lib/nurture";

/**
 * Body: { action: "pause" | "resume" | "remove" }.
 * Never deletes the enrollment row — pause/remove only change its status
 * ("remove" sets it to completed so it stops sending but stays visible).
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = (await req.json()) as { action?: string };
    if (body.action === "pause") {
      await setEnrollmentStatus(id, "paused");
    } else if (body.action === "resume") {
      await resumeEnrollment(id);
    } else if (body.action === "remove") {
      await setEnrollmentStatus(id, "completed");
    } else {
      return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof SupabaseNotConfiguredError) {
      return NextResponse.json({ error: err.message, notConfigured: true }, { status: 503 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't update the enrollment." }, { status: 500 });
  }
}
