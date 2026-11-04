import { NextRequest, NextResponse } from "next/server";
import { SupabaseNotConfiguredError } from "@/lib/supabaseServer";
import { updateNurtureStep } from "@/lib/nurture";

/** Edit a step's content/delay, toggle active, or move it to a new step_no (reorder). Never deletes a step. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const step = await updateNurtureStep(id, {
      stepNo: body?.stepNo !== undefined ? Number(body.stepNo) : undefined,
      delayDays: body?.delayDays !== undefined ? Number(body.delayDays) : undefined,
      subject: body?.subject !== undefined ? String(body.subject) : undefined,
      body: body?.body !== undefined ? String(body.body) : undefined,
      active: body?.active !== undefined ? Boolean(body.active) : undefined,
    });
    return NextResponse.json({ step });
  } catch (err) {
    if (err instanceof SupabaseNotConfiguredError) {
      return NextResponse.json({ error: err.message, notConfigured: true }, { status: 503 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't update the step." }, { status: 500 });
  }
}
