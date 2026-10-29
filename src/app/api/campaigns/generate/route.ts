import { NextRequest, NextResponse } from "next/server";
import "server-only";

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

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI drafting isn't configured yet — set ANTHROPIC_API_KEY on Vercel.", notConfigured: true },
        { status: 503 }
      );
    }

    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey });

    const instructions =
      channel === "SMS"
        ? "Write a short SMS campaign message, under 145 characters, no subject line."
        : "Write a marketing email with a short subject line and a body of 3-5 short sentences.";

    const message = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 500,
      system:
        "You write short, friendly marketing messages for Lyfe Boxing, a boxing gym. " +
        "Always use the literal placeholder {First name} wherever the recipient's name would go — never invent a name. " +
        "Keep the tone warm and motivating, not salesy. " +
        (channel === "SMS"
          ? "Respond with ONLY the SMS body text, nothing else."
          : 'Respond with strict JSON only: {"subject": "...", "body": "..."}. No markdown, no extra text.'),
      messages: [{ role: "user", content: `${instructions}\n\nWhat the campaign is about: ${brief}` }],
    });

    const text = message.content
      .filter((block) => block.type === "text")
      .map((block) => (block as { text: string }).text)
      .join("")
      .trim();

    if (channel === "SMS") {
      return NextResponse.json({ subject: "", body: text });
    }

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
      return NextResponse.json({ subject: parsed.subject ?? "", body: parsed.body ?? "" });
    } catch {
      return NextResponse.json({ subject: "", body: text });
    }
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't generate a draft." }, { status: 500 });
  }
}
