import { NextRequest, NextResponse } from "next/server";
import {
  listCampaignSequences,
  appendCampaignSequence,
  updateCampaignSequence,
  getCampaignSequenceStatus,
  deleteSheetRow,
  SheetsNotConfiguredError,
} from "@/lib/googleSheetsServer";
import { notifyGrok } from "@/lib/notifyGrok";
import { webhookErrorResponse } from "@/lib/webhookResponse";

/** A row in one of these statuses is already in flight or finished — refuse to re-queue it. */
const BLOCKED_FOR_QUEUE = new Set(["Queued", "Running", "Sending", "Completed"]);

export async function GET() {
  try {
    const sequences = await listCampaignSequences();
    return NextResponse.json({ sequences });
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
    const { name, audience, startDate, nodes, status } = body ?? {};
    if (!name || !nodes) {
      return NextResponse.json({ error: "name and nodes are required." }, { status: 400 });
    }
    const starting = status === "Queued";
    const row = await appendCampaignSequence({
      name,
      audience: audience ?? "",
      startDate: startDate ?? "",
      nodes,
      status,
      currentStep: starting ? "0" : undefined,
      nextRunAt: starting ? new Date().toISOString() : undefined,
    });

    if (starting && row) {
      try {
        await notifyGrok({ tab: "Campaign Sequences", rows: [row], kind: "sequence", row, action: "send" });
      } catch (err) {
        return webhookErrorResponse(err);
      }
    }

    return NextResponse.json({ ok: true, row });
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
    const { name, audience, startDate, nodes, status } = body ?? {};
    if (!row || row < 2) {
      return NextResponse.json({ error: "A valid row number is required." }, { status: 400 });
    }

    const starting = status === "Queued";
    if (starting) {
      const currentStatus = await getCampaignSequenceStatus(row);
      if (BLOCKED_FOR_QUEUE.has(currentStatus)) {
        return NextResponse.json({ error: `Row ${row} can't be queued from status "${currentStatus}".` }, { status: 409 });
      }
    }

    await updateCampaignSequence(row, {
      name,
      audience,
      startDate,
      nodes,
      status,
      currentStep: starting ? "0" : undefined,
      nextRunAt: starting ? new Date().toISOString() : undefined,
    });

    if (starting) {
      try {
        await notifyGrok({ tab: "Campaign Sequences", rows: [row], kind: "sequence", row, action: "send" });
      } catch (err) {
        return webhookErrorResponse(err);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof SheetsNotConfiguredError) {
      return NextResponse.json({ error: err.message, notConfigured: true }, { status: 503 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const row = Number(req.nextUrl.searchParams.get("row"));
    if (!row || row < 2) {
      return NextResponse.json({ error: "A valid row number is required." }, { status: 400 });
    }
    await deleteSheetRow("Campaign Sequences", row);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof SheetsNotConfiguredError) {
      return NextResponse.json({ error: err.message, notConfigured: true }, { status: 503 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
