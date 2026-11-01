import "server-only";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super("Supabase credentials aren't configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    this.name = "SupabaseNotConfiguredError";
  }
}

export function getSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new SupabaseNotConfiguredError();
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

export const LYFE_BOXING_BUSINESS_SLUG = "lyfe-boxing";

export class BusinessNotFoundError extends Error {
  constructor(slug: string) {
    super(`No business found for slug "${slug}".`);
    this.name = "BusinessNotFoundError";
  }
}

/** Resolves a business slug (e.g. "lyfe-boxing") to its business_id. Every query downstream must filter by this. */
export async function resolveBusinessId(
  supabase: ReturnType<typeof getSupabaseClient>,
  slug: string = LYFE_BOXING_BUSINESS_SLUG
): Promise<string> {
  const { data, error } = await supabase.from("businesses").select("id").eq("slug", slug).single();
  if (error || !data) throw new BusinessNotFoundError(slug);
  return data.id as string;
}
