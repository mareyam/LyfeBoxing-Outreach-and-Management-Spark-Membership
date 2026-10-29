import { SheetsNotConfiguredError } from "./client";

export type SheetResult<T> =
  | { state: "ok"; data: T }
  | { state: "not-configured" }
  | { state: "error"; message: string };

export async function safeRead<T>(fn: () => Promise<T>): Promise<SheetResult<T>> {
  try {
    const data = await fn();
    return { state: "ok", data };
  } catch (err) {
    if (err instanceof SheetsNotConfiguredError) return { state: "not-configured" };
    return { state: "error", message: err instanceof Error ? err.message : "Unknown error" };
  }
}
