// Dummy data for the agent dashboard demo. No real APIs are called —
// every agent "action" below is pre-baked output standing in for what
// the real integration (listed in `tool`) would produce.

export const agents = [
  { slug: "research-underwriting", name: "Research + Underwriting", icon: "search", tool: "Attom / SEC EDGAR / Firecrawl" },
  { slug: "lead-qualification", name: "Lead Qualification", icon: "target", tool: "HubSpot / Salesforce" },
  { slug: "support-assistant", name: "Support Assistant", icon: "message-circle", tool: "Pinecone RAG + Cal.com" },
  { slug: "document-review", name: "Document Review", icon: "file-text", tool: "LlamaParse / Unstructured.io" },
  { slug: "reporting", name: "Reporting Agent", icon: "bar-chart-2", tool: "Google Sheets API" },
  { slug: "report-design", name: "Report/Design Generation", icon: "layout-template", tool: "WeasyPrint / Pandoc" },
  { slug: "social-media", name: "Social Media Posting", icon: "share-2", tool: "Buffer / LinkedIn API" },
  { slug: "email-followups", name: "Email Follow-ups", icon: "mail", tool: "Resend / SendGrid" },
  { slug: "appointment-booking", name: "Appointment Booking", icon: "calendar", tool: "Cal.com / Google Calendar" },
] as const;

export type AgentSlug = (typeof agents)[number]["slug"];

export const dealProperties = [
  {
    id: "d-101",
    address: "4821 Maple Ridge Dr, Austin, TX",
    type: "Multifamily (24 units)",
    askingPrice: 3_250_000,
    noi: 241_500,
    capRate: 7.4,
    riskFlags: ["Flood zone AE (partial)", "Roof age 18 yrs"],
    riskLevel: "Medium",
    summary:
      "Stabilized 24-unit asset in a growth corridor. Cap rate is in line with comps (7.1–7.6%). Two risk flags worth underwriting into reserves: partial flood-zone overlap and an aging roof likely needing replacement within 3–5 years.",
  },
  {
    id: "d-102",
    address: "1190 Harborview Industrial Pkwy, Tampa, FL",
    type: "Industrial / Warehouse",
    askingPrice: 5_800_000,
    noi: 412_000,
    capRate: 7.1,
    riskFlags: ["Single tenant, lease expires 14 mo", "No environmental Phase I on file"],
    riskLevel: "High",
    summary:
      "Single-tenant exposure with a lease expiring in 14 months is the dominant risk — re-leasing risk should be priced into the offer. Recommend making Phase I environmental a closing condition before proceeding.",
  },
  {
    id: "d-103",
    address: "77 Birchwood Office Plaza, Denver, CO",
    type: "Office (Class B)",
    askingPrice: 2_100_000,
    noi: 151_000,
    capRate: 7.2,
    riskFlags: ["Occupancy 81%", "Submarket vacancy trending up"],
    riskLevel: "Medium",
    summary:
      "Class B office in a softening submarket. Occupancy below comps (81% vs 88% submarket avg). Underwrite conservatively on renewal probability and budget for TI/leasing commissions on rollover.",
  },
] as const;

export const leads = [
  { id: "l-1", name: "Dana Whitfield", company: "Whitfield Capital", source: "Website form", budget: 450_000, timeline: "0-3 months", score: 92, status: "Hot", notes: "Pre-approved financing, matches buy-box exactly." },
  { id: "l-2", name: "Marcus Oyelaran", company: "Oyelaran Holdings", source: "LinkedIn DM", budget: 180_000, timeline: "6-12 months", score: 54, status: "Warm", notes: "Budget below target range, long timeline." },
  { id: "l-3", name: "Priya Nandakumar", company: "—", source: "Referral", budget: 900_000, timeline: "0-3 months", score: 97, status: "Hot", notes: "Referred by existing client, cash buyer." },
  { id: "l-4", name: "Tom Esguerra", company: "Esguerra & Co", source: "Cold email reply", budget: 75_000, timeline: "12+ months", score: 21, status: "Unqualified", notes: "Below minimum deal size, exploratory only." },
  { id: "l-5", name: "Helena Vuković", company: "Vukovic Properties", source: "Website form", budget: 620_000, timeline: "3-6 months", score: 81, status: "Hot", notes: "Strong fit, awaiting proof of funds." },
] as const;

export const faqs = [
  { q: "What areas do you invest in?", a: "We currently focus on Austin TX, Tampa FL, and Denver CO metro areas, with occasional off-market deals elsewhere." },
  { q: "What's your minimum deal size?", a: "Our typical buy-box starts at $750,000 in asking price, though we'll review smaller off-market opportunities case by case." },
  { q: "How fast can you close?", a: "Cash deals typically close in 14-21 days. Financed deals average 30-45 days depending on lender." },
  { q: "Do you take on JV partners?", a: "Yes, on deals above $2M we frequently structure joint ventures. Book a call to discuss terms." },
] as const;

export const supportChatLog = [
  { from: "user", text: "Hi, do you guys buy properties outside of Texas?" },
  { from: "agent", text: "Yes! We currently invest in Austin TX, Tampa FL, and Denver CO, and occasionally look at off-market deals elsewhere. Is there a specific property or market you had in mind?" },
  { from: "user", text: "I have a multifamily in Tampa, might want to sell" },
  { from: "agent", text: "Great, Tampa multifamily is right in our buy-box. I can get you on a call with our acquisitions team this week — want me to book that now?" },
  { from: "user", text: "sure, Thursday afternoon works" },
  { from: "agent", text: "Booked: Thursday 2:00 PM with Alex — confirmation sent to your email. Anything else I can help with?" },
] as const;

export const documents = [
  {
    id: "doc-1",
    name: "Purchase Agreement - 4821 Maple Ridge Dr.pdf",
    pages: 18,
    status: "Reviewed",
    flaggedClauses: [
      { clause: "Section 8.2 - Financing Contingency", issue: "Contingency window is 10 days — shorter than our standard 21-day ask.", severity: "High" },
      { clause: "Section 12.1 - Earnest Money", issue: "Earnest money is non-refundable after day 5, not day 10 as discussed.", severity: "Medium" },
    ],
  },
  {
    id: "doc-2",
    name: "Lease Agreement - Harborview Industrial.pdf",
    pages: 34,
    status: "Reviewed",
    flaggedClauses: [
      { clause: "Section 4.3 - Renewal Option", issue: "Tenant has a unilateral 5-year renewal option at a fixed (below-market) rate.", severity: "High" },
    ],
  },
  {
    id: "doc-3",
    name: "Phase I Environmental Report - Birchwood Plaza.pdf",
    pages: 52,
    status: "Processing",
    flaggedClauses: [],
  },
] as const;

export const weeklyReport = {
  period: "Oct 12 - Oct 18, 2026",
  newLeads: 14,
  qualifiedLeads: 6,
  dealsUnderReview: 3,
  dealsClosed: 1,
  revenue: 184_500,
  topInsight:
    "Lead-to-qualified rate rose to 43% this week (up from 31% last week), largely driven by referral-source leads converting at 2x the rate of cold outreach.",
} as const;

export const generatedReports = [
  { id: "r-1", title: "Q3 Portfolio Performance Summary", type: "PDF Report", createdAt: "2026-10-15", pages: 6 },
  { id: "r-2", title: "4821 Maple Ridge — Investment Memo", type: "Deal One-Pager", createdAt: "2026-10-17", pages: 2 },
  { id: "r-3", title: "October Market Snapshot (Austin/Tampa/Denver)", type: "Branded PDF", createdAt: "2026-10-18", pages: 4 },
] as const;

export const socialDrafts = [
  { id: "s-1", platform: "LinkedIn", status: "Pending approval", text: "Just closed on a 24-unit multifamily in Austin at a 7.4% cap — stabilized asset, strong rent growth corridor. DM if you're looking to place capital in similar deals. 🏢📈", scheduledFor: "2026-10-19 09:00" },
  { id: "s-2", platform: "X (Twitter)", status: "Pending approval", text: "Underwriting tip: a single-tenant industrial deal with <18mo lease runway isn't a red flag — it's a re-leasing opportunity if you price the vacancy risk correctly. Most buyers overpay for 'stability.'", scheduledFor: "2026-10-19 13:00" },
  { id: "s-3", platform: "LinkedIn", status: "Approved", text: "Looking for JV partners on a $5.8M industrial acquisition in Tampa. Strong in-place NOI, value-add upside on lease rollover. Reach out if interested.", scheduledFor: "2026-10-20 10:00" },
] as const;

export const emailSequences = [
  {
    id: "e-1",
    lead: "Dana Whitfield",
    sequence: "Hot lead — fast follow-up",
    steps: [
      { day: 0, subject: "Great connecting, Dana — next steps", status: "Sent" },
      { day: 2, subject: "Quick follow-up on the Austin multifamily", status: "Sent" },
      { day: 5, subject: "Still interested? Here's our current inventory", status: "Scheduled" },
    ],
  },
  {
    id: "e-2",
    lead: "Marcus Oyelaran",
    sequence: "Warm lead — nurture",
    steps: [
      { day: 0, subject: "Thanks for reaching out", status: "Sent" },
      { day: 7, subject: "Market update: what's changed this month", status: "Scheduled" },
      { day: 21, subject: "Checking in — any timeline updates?", status: "Scheduled" },
    ],
  },
] as const;

export const appointments = [
  { id: "a-1", name: "Helena Vuković", type: "Acquisitions call", date: "2026-10-20", time: "11:00 AM", withWhom: "Alex", status: "Confirmed" },
  { id: "a-2", name: "Tampa seller (Harborview)", type: "Property walkthrough", date: "2026-10-21", time: "2:00 PM", withWhom: "Alex", status: "Confirmed" },
  { id: "a-3", name: "Priya Nandakumar", type: "Deal review call", date: "2026-10-22", time: "9:30 AM", withWhom: "Acquisitions team", status: "Pending confirmation" },
] as const;
