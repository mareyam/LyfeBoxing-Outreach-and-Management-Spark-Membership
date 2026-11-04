import "server-only";
import { NextRequest } from "next/server";
import { tokensMatch } from "@/lib/siteAuth";

/** Bearer-auth check for routes Grok calls back into (POST /api/grok/*). */
export function grokAuthorized(req: NextRequest): boolean {
  const secret = process.env.GROK_WEBHOOK_AUTH?.trim();
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  const supplied = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
  return tokensMatch(supplied, secret);
}

/** Bearer-auth check for Vercel Cron routes. */
export function cronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  const supplied = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
  return tokensMatch(supplied, secret);
}
