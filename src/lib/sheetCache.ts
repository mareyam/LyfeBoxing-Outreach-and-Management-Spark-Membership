import { revalidateTag } from "next/cache";

/** About 5 minutes. Repeated Summary / Contacts / Payments loads reuse this instead of re-reading the sheet. */
export const LYFE_SHEETS_REVALIDATE_SECONDS = 300;
export const LYFE_SHEETS_CACHE_TAG = "lyfe-sheets";

/** Drop the sheet cache after a write so a draft save is visible on the next read. */
export function invalidateLyfeSheetCache(): void {
  try {
    revalidateTag(LYFE_SHEETS_CACHE_TAG, "max");
  } catch {
    // Scripts and non-request contexts cannot revalidate. The TTL still expires the cache.
  }
}
