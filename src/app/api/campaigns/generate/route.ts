import { NextRequest, NextResponse } from "next/server";
import "server-only";
import { AiNotConfiguredError, draftWithClaude, loadGenerationContext, parseSubjectBody } from "@/lib/generateDraft";

// Turns a rough campaign idea into a draft subject + body using Claude.
// Never sends anything itself — this just fills the New Campaign form.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const brief: string = (body?.brief ?? "").trim();
    const channel: "Email" | "SMS" = body?.channel === "SMS" ? "SMS" : "Email";

    if (!brief) {
      return NextResponse.json({ error: "Describe what the campaign is about first." }, { status: 400 });
    }

    const context = await loadGenerationContext();
    const instructions =
      channel === "SMS"
        ? "Write a short SMS campaign message, under 145 characters, no subject line."
        : "Write a marketing email with a short subject line and a body of 3-5 short sentences.";

    let text: string;
    try {
      text = await draftWithClaude({
        maxTokens: 500,
        system:
          "You write short, friendly marketing messages for Lyfe Boxing, a boxing gym. " +
          "Always use the literal placeholder {First name} wherever the recipient's name would go — never invent a name. " +
          "Keep the tone warm and motivating, not salesy. " +
          (channel === "SMS"
            ? "Respond with ONLY the SMS body text, nothing else."
            : 'Respond with strict JSON only: {"subject": "...", "body": "..."}. No markdown, no extra text.') +
          (context.block ? `\n\n${context.block}` : ""),
        user: `${instructions}\n\nWhat the campaign is about: ${brief}`,
      });
    } catch (err) {
      if (err instanceof AiNotConfiguredError) {
        return NextResponse.json({ error: err.message, notConfigured: true }, { status: 503 });
      }
      throw err;
    }

    if (channel === "SMS") {
      return NextResponse.json({ subject: "", body: text });
    }

    const parsed = parseSubjectBody(text);
    return NextResponse.json({ subject: parsed.subject, body: parsed.body });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't generate a draft." }, { status: 500 });
  }
}
