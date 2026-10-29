import { NextRequest, NextResponse } from "next/server";
import { SheetsNotConfiguredError } from "@/lib/googleSheetsServer";
import { readPlaybook, writePlaybook, type Playbook } from "@/lib/playbook";

export async function GET() {
  try {
    const playbook = await readPlaybook();
    return NextResponse.json({
      playbook,
      trialUrlFromEnv: Boolean(process.env.TRIAL_BOOKING_URL?.trim()),
    });
  } catch (err) {
    if (err instanceof SheetsNotConfiguredError) {
      return NextResponse.json({ error: err.message, notConfigured: true }, { status: 503 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't load the playbook." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const playbook: Playbook = {
      tone: String(body?.tone ?? ""),
      offers: String(body?.offers ?? ""),
      prices: String(body?.prices ?? ""),
      faqs: String(body?.faqs ?? ""),
      trialLink: String(body?.trialLink ?? ""),
    };
    await writePlaybook(playbook);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof SheetsNotConfiguredError) {
      return NextResponse.json({ error: err.message, notConfigured: true }, { status: 503 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't save the playbook." }, { status: 500 });
  }
}
