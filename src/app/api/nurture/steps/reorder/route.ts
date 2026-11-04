import { NextRequest, NextResponse } from "next/server";
import { SupabaseNotConfiguredError } from "@/lib/supabaseServer";
import { reorderNurtureSteps } from "@/lib/nurture";

/** Body: { order: [{ id, stepNo }, ...] }. Reassigns step_no for each step given; never deletes one. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const order = Array.isArray(body?.order) ? body.order : [];
    await reorderNurtureSteps(
      order.map((entry: { id: string; stepNo: number }) => ({ id: entry.id, stepNo: Number(entry.stepNo) }))
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof SupabaseNotConfiguredError) {
      return NextResponse.json({ error: err.message, notConfigured: true }, { status: 503 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't reorder steps." }, { status: 500 });
  }
}
