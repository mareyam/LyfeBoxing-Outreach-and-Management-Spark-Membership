import "server-only";
import { getSupabaseClient } from "@/lib/supabaseServer";

export type EmailThreadCategory =
  | "interested"
  | "question"
  | "cancellation"
  | "not_interested"
  | "unsubscribe"
  | "other"
  | "needs_review";

export type EmailThread = {
  id: string;
  fromEmail: string;
  fromName: string;
  originalSubject: string;
  originalText: string;
  replyBody: string;
  category: EmailThreadCategory;
  sentAt: string;
};

function toEmailThread(row: Record<string, unknown>): EmailThread {
  return {
    id: row.id as string,
    fromEmail: (row.from_email as string) ?? "",
    fromName: (row.from_name as string) ?? "",
    originalSubject: (row.original_subject as string) ?? "",
    originalText: (row.original_text as string) ?? "",
    replyBody: (row.reply_body as string) ?? "",
    category: (row.category as EmailThreadCategory) ?? "other",
    sentAt: (row.sent_at as string) ?? (row.created_at as string),
  };
}

export async function listEmailThreads(): Promise<EmailThread[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("email_threads").select("*").order("sent_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(toEmailThread);
}
