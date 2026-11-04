import { NextRequest, NextResponse } from "next/server";
import { SupabaseNotConfiguredError } from "@/lib/supabaseServer";
import { recategorizeReply, setReplyHandled, type ReplyCategory } from "@/lib/replies";

const CATEGORIES: ReplyCategory[] = ["interested", "positive", "not_interested", "unsubscribe", "question", "other"];

/** Body: { category?: ReplyCategory, handled?: boolean }. Manual re-categorize and "mark handled". */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = (await req.json()) as { category?: string; handled?: boolean };
    if (body.category !== undefined) {
      if (!CATEGORIES.includes(body.category as ReplyCategory)) {
        return NextResponse.json({ error: "Unknown category." }, { status: 400 });
      }
      const reply = await recategorizeReply(id, body.category as ReplyCategory);
      return NextResponse.json({ reply });
    }
    if (body.handled !== undefined) {
      await setReplyHandled(id, Boolean(body.handled));
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  } catch (err) {
    if (err instanceof SupabaseNotConfiguredError) {
      return NextResponse.json({ error: err.message, notConfigured: true }, { status: 503 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't update the reply." }, { status: 500 });
  }
}
