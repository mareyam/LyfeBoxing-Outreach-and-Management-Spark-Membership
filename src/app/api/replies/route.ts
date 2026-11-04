import { NextResponse } from "next/server";
import { SupabaseNotConfiguredError } from "@/lib/supabaseServer";
import { listReplies } from "@/lib/replies";

export async function GET() {
  try {
    const replies = await listReplies();
    return NextResponse.json({ replies });
  } catch (err) {
    if (err instanceof SupabaseNotConfiguredError) {
      return NextResponse.json({ error: err.message, notConfigured: true }, { status: 503 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't load replies." }, { status: 500 });
  }
}
