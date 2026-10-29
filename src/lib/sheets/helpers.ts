import type { SheetRow } from "./client";

/** Finds a header on a row by fuzzy match (case-insensitive substring). */
export function findField(row: SheetRow, ...candidates: string[]): string {
  const keys = Object.keys(row);
  for (const candidate of candidates) {
    const exact = keys.find((k) => k.toLowerCase() === candidate.toLowerCase());
    if (exact) return row[exact] ?? "";
  }
  for (const candidate of candidates) {
    const partial = keys.find((k) => k.toLowerCase().includes(candidate.toLowerCase()));
    if (partial) return row[partial] ?? "";
  }
  return "";
}

export function parseMoney(value: string): number {
  const n = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function formatMoney(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
