// Draft content for the auto-generated campaigns. Every one of these is
// written to the sheet as Draft / Send FALSE — a human always reviews
// and ticks Send before anything goes out. [OFFER] is a placeholder;
// nothing here invents a real price or promotion.

export const winbackEmail = {
  "Campaign Name": "Win-back: Free comeback class",
  Channel: "Email" as const,
  Subject: "We miss you at Lyfe Boxing, {First name}",
  "Message Body":
    "Hey {First name},\n\nIt's been a minute since we've seen you in the gym — and honestly, it's not the same without you.\n\nWe'd love to have you back for a free class, on us: [OFFER]\n\nNo pressure, no sales pitch. Just come throw some punches and remember why you started.\n\nLyfe Boxing",
  Notes: "Cancelled members",
};

export const winbackSms = {
  "Campaign Name": "Win-back: Why'd you leave?",
  Channel: "SMS" as const,
  "Message Body":
    "Hey {First name}, it's Lyfe Boxing. We noticed you stepped away — mind telling us why? Just reply, we read every one. 🥊",
  Notes: "Cancelled members",
};

export const trialFirstClassSms = {
  "Campaign Name": "Trial: After first class",
  Channel: "SMS" as const,
  "Message Body":
    "Great first class, {First name}! How are you feeling? We're pumped to have you training with us at Lyfe Boxing.",
  Notes: "Trial / 1 Day Boxing Program members",
};

export const trialDay3UpgradeEmail = {
  "Campaign Name": "Trial: Day 3 upgrade offer",
  Channel: "Email" as const,
  Subject: "Ready to make it official, {First name}?",
  "Message Body":
    "Hey {First name},\n\nYou're a few days into training with us and we love having you in the gym.\n\nIf you're feeling it, now's a great time to lock in a membership — Basic Boxer 2x or Knock Out Boxer Unlimited both give you room to keep building momentum. [OFFER]\n\nLet us know and we'll get you set up.\n\nLyfe Boxing",
  Notes: "Trial / 1 Day Boxing Program members",
};

export const atRiskSms = {
  "Campaign Name": "At risk: We miss you SMS",
  Channel: "SMS" as const,
  "Message Body":
    "Hey {First name}, haven't seen you at Lyfe Boxing in a bit — everything okay? Your spot's waiting whenever you're ready. 🥊",
  Notes: "At-risk members (10+ days no attendance)",
};

export const atRiskEmail = {
  "Campaign Name": "At risk: We miss you email",
  Channel: "Email" as const,
  Subject: "We've missed you, {First name}",
  "Message Body":
    "Hey {First name},\n\nWe noticed you haven't been in for a little while, and we wanted to check in. Life gets busy — we get it.\n\nYour spot is still here whenever you're ready to get back to it. If something's holding you back, just reply and let us know, we're happy to help.\n\nLyfe Boxing",
  Notes: "At-risk members (10+ days no attendance)",
};

export const upgradeCandidateEmail = {
  "Campaign Name": "Upgrade: Move to Unlimited",
  Channel: "Email" as const,
  Subject: "You're training more than your plan covers, {First name}",
  "Message Body":
    "Hey {First name},\n\nWe love your consistency — you've been showing up more than your current plan technically allows for, and we don't want that to slow you down.\n\nSwitching to Knock Out Boxer Unlimited means you can train as often as you want without thinking about it. [OFFER]\n\nWant us to switch you over?\n\nLyfe Boxing",
  Notes: "Upgrade candidates (Light Boxer 1x / Basic Boxer 2x over plan limit)",
};
