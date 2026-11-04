import { NextRequest, NextResponse } from "next/server";
import { SupabaseNotConfiguredError } from "@/lib/supabaseServer";
import { createNurtureStep, listNurtureSteps } from "@/lib/nurture";

export async function GET() {
  try {
    const steps = await listNurtureSteps();
    return NextResponse.json({ steps });
  } catch (err) {
    if (err instanceof SupabaseNotConfiguredError) {
      return NextResponse.json({ error: err.message, notConfigured: true }, { status: 503 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't load nurture steps." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const step = await createNurtureStep({
      stepNo: Number(body?.stepNo),
      delayDays: Number(body?.delayDays ?? 0),
      subject: String(body?.subject ?? ""),
      body: String(body?.body ?? ""),
    });
    return NextResponse.json({ step });
  } catch (err) {
    if (err instanceof SupabaseNotConfiguredError) {
      return NextResponse.json({ error: err.message, notConfigured: true }, { status: 503 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't create the step." }, { status: 500 });
  }
}
