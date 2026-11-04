import { NextResponse } from "next/server";
import { SupabaseNotConfiguredError } from "@/lib/supabaseServer";
import { listNurtureEnrollments } from "@/lib/nurture";

export async function GET() {
  try {
    const enrollments = await listNurtureEnrollments();
    return NextResponse.json({ enrollments });
  } catch (err) {
    if (err instanceof SupabaseNotConfiguredError) {
      return NextResponse.json({ error: err.message, notConfigured: true }, { status: 503 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't load enrollments." }, { status: 500 });
  }
}
