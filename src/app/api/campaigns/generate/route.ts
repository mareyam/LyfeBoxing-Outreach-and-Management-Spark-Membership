import { NextRequest, NextResponse } from "next/server";
import "server-only";
import { AiNotConfiguredError, draftWithClaude, loadGenerationContext, parseSubjectBody } from "@/lib/generateDraft";

// Turns a rough campaign idea into a draft subject + body (and/or SMS text)
// using Claude. Never sends anything itself — this just fills the New
// Campaign form.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const brief: string = (body?.brief ?? "").trim();
    const channel: "Email" | "SMS" | "Both" =
      body?.channel === "SMS" ? "SMS" : body?.channel === "Both" ? "Both" : "Email";

    if (!brief) {
      return NextResponse.json({ error: "Describe what the campaign is about first." }, { status: 400 });
    }

    const context = await loadGenerationContext();
    const baseSystem =
      "You write short, friendly marketing messages for Lyfe Boxing, a boxing gym. " +
      "Always use the literal placeholder {First name} wherever the recipient's name would go — never invent a name. " +
      "Keep the tone warm and motivating, not salesy." +
      (context.block ? `\n\n${context.block}` : "");

    async function generateEmail(): Promise<{ subject: string; body: string }> {
      const text = await draftWithClaude({
        maxTokens: 500,
        system:
          baseSystem + ' Respond with strict JSON only: {"subject": "...", "body": "..."}. No markdown, no extra text.',
        user: `Write a marketing email with a short subject line and a body of 3-5 short sentences.\n\nWhat the campaign is about: ${brief}`,
      });
      return parseSubjectBody(text);
    }

    async function generateSms(): Promise<string> {
      return draftWithClaude({
        maxTokens: 200,
        system: baseSystem + " Respond with ONLY the SMS body text, nothing else.",
        user: `Write a short SMS campaign message, under 160 characters, no subject line.\n\nWhat the campaign is about: ${brief}`,
      });
    }

    try {
      if (channel === "SMS") {
        const smsBody = await generateSms();
        return NextResponse.json({ subject: "", body: "", smsBody });
      }
      if (channel === "Both") {
        const [email, smsBody] = await Promise.all([generateEmail(), generateSms()]);
        return NextResponse.json({ subject: email.subject, body: email.body, smsBody });
      }
      const email = await generateEmail();
      return NextResponse.json({ subject: email.subject, body: email.body, smsBody: "" });
    } catch (err) {
      if (err instanceof AiNotConfiguredError) {
        return NextResponse.json({ error: err.message, notConfigured: true }, { status: 503 });
      }
      throw err;
    }
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't generate a draft." }, { status: 500 });
  }
}
