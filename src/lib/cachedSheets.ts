import { unstable_cache } from "next/cache";
import { listSheetTitles, readRawRows, readTabWithHeaders } from "@/lib/googleSheetsServer";
import { LYFE_SHEETS_CACHE_TAG, LYFE_SHEETS_REVALIDATE_SECONDS } from "@/lib/sheetCache";

export const getCachedSheetTitles = unstable_cache(async () => listSheetTitles(), ["lyfe-sheet-titles"], {
  revalidate: LYFE_SHEETS_REVALIDATE_SECONDS,
  tags: [LYFE_SHEETS_CACHE_TAG],
});

export const getCachedTab = unstable_cache(async (tabName: string) => readTabWithHeaders(tabName), ["lyfe-sheet-tab"], {
  revalidate: LYFE_SHEETS_REVALIDATE_SECONDS,
  tags: [LYFE_SHEETS_CACHE_TAG],
});

export const getCachedRawTab = unstable_cache(async (tabName: string) => readRawRows(tabName), ["lyfe-sheet-raw"], {
  revalidate: LYFE_SHEETS_REVALIDATE_SECONDS,
  tags: [LYFE_SHEETS_CACHE_TAG],
});
