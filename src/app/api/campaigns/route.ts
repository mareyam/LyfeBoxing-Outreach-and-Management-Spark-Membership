import { NextRequest, NextResponse } from "next/server";
import { listCampaigns, appendCampaign, updateCampaignContent, SheetsNotConfiguredError } from "@/lib/googleSheetsServer";

export async function GET() {
  try {
    const campaigns = await listCampaigns();
    return NextResponse.json({ campaigns });
  } catch (err) {
    if (err instanceof SheetsNotConfiguredError) {
      return NextResponse.json({ error: err.message, notConfigured: true }, { status: 503 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { campaignName, channel, audience, subject, messageBody, notes, smsBody } = body ?? {};

    // audience may be legitimately blank — per-contact drafts (e.g. win-back)
    // target one named person who isn't in the audience dropdown.
    if (!campaignName || !channel) {
      return NextResponse.json({ error: "campaignName and channel are required." }, { status: 400 });
    }
    const needsEmail = channel === "Email" || channel === "Both";
    const needsSms = channel === "SMS" || channel === "Both";
    if (needsEmail && !messageBody) {
      return NextResponse.json({ error: "Message body is required for email campaigns." }, { status: 400 });
    }
    if (needsEmail && !subject) {
      return NextResponse.json({ error: "Subject is required for email campaigns." }, { status: 400 });
    }
    if (needsSms && !smsBody) {
      return NextResponse.json({ error: "SMS message is required for SMS campaigns." }, { status: 400 });
    }

    await appendCampaign({
      campaignName,
      channel,
      audience,
      subject: subject ?? "",
      messageBody: messageBody ?? "",
      notes,
      smsBody: smsBody ?? "",
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof SheetsNotConfiguredError) {
      return NextResponse.json({ error: err.message, notConfigured: true }, { status: 503 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const row = Number(body?.row);
    const { subject, messageBody, smsBody, audience } = body ?? {};

    if (!row || row < 2) {
      return NextResponse.json({ error: "A valid row number is required." }, { status: 400 });
    }
    if (!messageBody && !smsBody) {
      return NextResponse.json({ error: "messageBody or smsBody is required." }, { status: 400 });
    }

    await updateCampaignContent(row, { subject: subject ?? "", messageBody: messageBody ?? "", smsBody, audience });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof SheetsNotConfiguredError) {
      return NextResponse.json({ error: err.message, notConfigured: true }, { status: 503 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 400 });
  }
}
