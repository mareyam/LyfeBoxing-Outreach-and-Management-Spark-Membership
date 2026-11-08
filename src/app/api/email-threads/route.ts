import { NextResponse } from "next/server";
import { SupabaseNotConfiguredError } from "@/lib/supabaseServer";
import { listEmailThreads } from "@/lib/emailThreads";

export async function GET() {
  try {
    const threads = await listEmailThreads();
    return NextResponse.json({ threads });
  } catch (err) {
    if (err instanceof SupabaseNotConfiguredError) {
      return NextResponse.json({ error: err.message, notConfigured: true }, { status: 503 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't load email threads." }, { status: 500 });
  }
}
