"use server";

import { revalidatePath } from "next/cache";
import {
  appendCampaign,
  queueCampaignSend,
  appendAppointmentRequest,
} from "@/lib/sheets/lyfe-boxing";
import {
  winbackEmail,
  winbackSms,
  trialFirstClassSms,
  trialDay3UpgradeEmail,
  atRiskSms,
  atRiskEmail,
  upgradeCandidateEmail,
} from "@/lib/sheets/campaign-templates";

export async function createCampaignAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const channel = String(formData.get("channel") ?? "Email") as "Email" | "SMS";
  const audience = String(formData.get("audience") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!name || !audience || !body) {
    throw new Error("Campaign name, audience, and message body are required.");
  }
  if (channel === "SMS" && body.length > 145) {
    throw new Error("SMS body is over 145 characters.");
  }

  await appendCampaign({
    "Campaign Name": name,
    Channel: channel,
    Audience: audience,
    Subject: channel === "Email" ? subject : "",
    "Message Body": body,
  });

  revalidatePath("/lyfe-boxing/campaigns");
}

export async function sendCampaignAction(rowNumber: number) {
  await queueCampaignSend(rowNumber);
  revalidatePath("/lyfe-boxing/campaigns");
}

export async function generateWinbackCampaignsAction() {
  await appendCampaign({ "Campaign Name": winbackEmail["Campaign Name"], Channel: winbackEmail.Channel, Audience: "", Subject: winbackEmail.Subject, "Message Body": winbackEmail["Message Body"], Notes: `Audience: ${winbackEmail.Notes} (not a dropdown option — select recipients manually before sending)` });
  await appendCampaign({ "Campaign Name": winbackSms["Campaign Name"], Channel: winbackSms.Channel, Audience: "", "Message Body": winbackSms["Message Body"], Notes: `Audience: ${winbackSms.Notes} (not a dropdown option — select recipients manually before sending)` });
  revalidatePath("/lyfe-boxing/campaigns");
  revalidatePath("/lyfe-boxing/cancelled");
}

export async function generateTrialCampaignsAction() {
  await appendCampaign({ "Campaign Name": trialFirstClassSms["Campaign Name"], Channel: trialFirstClassSms.Channel, Audience: "1 Day Boxing Program", "Message Body": trialFirstClassSms["Message Body"], Notes: trialFirstClassSms.Notes });
  await appendCampaign({ "Campaign Name": trialDay3UpgradeEmail["Campaign Name"], Channel: trialDay3UpgradeEmail.Channel, Audience: "1 Day Boxing Program", Subject: trialDay3UpgradeEmail.Subject, "Message Body": trialDay3UpgradeEmail["Message Body"], Notes: trialDay3UpgradeEmail.Notes });
  revalidatePath("/lyfe-boxing/campaigns");
  revalidatePath("/lyfe-boxing/trial-conversion");
}

export async function generateAtRiskCampaignsAction() {
  await appendCampaign({ "Campaign Name": atRiskSms["Campaign Name"], Channel: atRiskSms.Channel, Audience: "", "Message Body": atRiskSms["Message Body"], Notes: `Audience: ${atRiskSms.Notes} (not a dropdown option — select recipients manually before sending)` });
  await appendCampaign({ "Campaign Name": atRiskEmail["Campaign Name"], Channel: atRiskEmail.Channel, Audience: "", Subject: atRiskEmail.Subject, "Message Body": atRiskEmail["Message Body"], Notes: `Audience: ${atRiskEmail.Notes} (not a dropdown option — select recipients manually before sending)` });
  revalidatePath("/lyfe-boxing/campaigns");
  revalidatePath("/lyfe-boxing/at-risk");
}

export async function generateUpgradeCampaignAction() {
  await appendCampaign({ "Campaign Name": upgradeCandidateEmail["Campaign Name"], Channel: upgradeCandidateEmail.Channel, Audience: "", Subject: upgradeCandidateEmail.Subject, "Message Body": upgradeCandidateEmail["Message Body"], Notes: `Audience: ${upgradeCandidateEmail.Notes} (not a dropdown option — select recipients manually before sending)` });
  revalidatePath("/lyfe-boxing/campaigns");
  revalidatePath("/lyfe-boxing/upgrade-candidates");
}

export async function bookAppointmentAction(formData: FormData) {
  const date = String(formData.get("date") ?? "").trim();
  const time = String(formData.get("time") ?? "").trim();
  const type = String(formData.get("type") ?? "").trim();
  const member = String(formData.get("member") ?? "").trim();
  const coach = String(formData.get("coach") ?? "").trim();

  if (!date || !time || !type || !member) {
    throw new Error("Date, time, type, and member are required.");
  }

  await appendAppointmentRequest({ Date: date, Time: time, Type: type, Member: member, Coach: coach });
  revalidatePath("/lyfe-boxing/calendar");
}
