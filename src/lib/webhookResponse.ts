import { NextResponse } from "next/server";
import { WebhookNotConfiguredError } from "@/lib/notifyGrok";

export function webhookErrorFields(err: unknown): { error: string; status: number } {
  if (err instanceof WebhookNotConfiguredError) {
    return { error: err.message, status: 503 };
  }
  return {
    error: err instanceof Error ? err.message : "Couldn't reach the webhook.",
    status: 502,
  };
}

export function webhookErrorResponse(err: unknown) {
  const { error, status } = webhookErrorFields(err);
  return NextResponse.json({ error }, { status });
}
