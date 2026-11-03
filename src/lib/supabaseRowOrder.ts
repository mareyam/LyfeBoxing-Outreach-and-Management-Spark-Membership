import "server-only";
import type { getSupabaseClient } from "@/lib/supabaseServer";

/**
 * The old Sheets-based UI identified a record by its 1-based sheet row
 * number (row 1 = header, data from row 2). Several routes/components still
 * pass that same `row` number around as a record's identity. Rather than
 * touch every call site, these tables are ordered by `created_at` ascending
 * and that same row-2-based numbering is kept as a stable stand-in for a
 * Supabase row's real uuid id.
 */
export function rowNumberToIndex(row: number): number | null {
  const index = row - 2;
  return index < 0 ? null : index;
}

export async function rowNumberToId(
  supabase: ReturnType<typeof getSupabaseClient>,
  table: string,
  businessId: string,
  row: number
): Promise<string | null> {
  const index = rowNumberToIndex(row);
  if (index === null) return null;
  const { data, error } = await supabase
    .from(table)
    .select("id")
    .eq("business_id", businessId)
    .order("created_at", { ascending: true })
    .range(index, index);
  if (error || !data || data.length === 0) return null;
  return data[0].id as string;
}
