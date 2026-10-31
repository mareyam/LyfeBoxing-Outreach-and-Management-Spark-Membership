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
