This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

The Lyfe Boxing dashboard lives at `/lyfe-boxing`. Send does not deliver email itself: it saves the draft, sets the row/draft to `Queued`/`approved`, then POSTs to the Grok webhook.

## Supabase migration (in progress)

Supabase (project `lufmusfeyjdwmtabmvmd`, business slug `lyfe-boxing`) is becoming the single source of truth the app reads from. Most core tables already exist (`contacts`, `memberships`, `cancelled_memberships`, `past_due`, `payments`, `sms_conversations`, `campaigns`, `leads`, `examples`, `digests`, `email_templates`, `attendance`, `email_unsubscribes`, `sms_unsubscribes`, etc. — see `supabase/migrations/0001_contacts.sql`). This pass added `playbook`, `lead_drafts`, `appointments`, and `email_log` (`supabase/migrations/0002_lead_followups.sql`), and migrated the full **lead follow-up system** end to end onto Supabase:

- **Reads**: `src/app/api/contacts/route.ts` and everything under `src/lib/supabaseLeadFollowup.ts` / `src/lib/playbook.ts` (playbook, examples, leads, lead_drafts, appointments) read Supabase only.
- **Sync/intake**: nothing in this app writes *into* Supabase from Sheets automatically yet — see `scripts/backfill-from-sheets.ts` below. No new `/api/sync/*` routes were added in this pass; the backfill script is the intake path for now.
- **Still Sheets-backed** (not migrated in this pass — see the PR description for the full inventory): `src/app/api/lyfe-data/route.ts` (the generic tab reader every other `/lyfe-boxing/*` page still calls), `src/lib/googleSheetsServer.ts`, `src/lib/leadFollowup.ts` (the old sheet-based lead sequence, superseded by `src/lib/supabaseLeadFollowup.ts` but left in place since `/api/leads/{draft,generate,send,send-bulk}` and `/api/cron/lead-sequence` still use it), `src/lib/sendCampaign.ts`, and the Contacts/Memberships/Cancelled/Past-due/Payments/Attendance/Campaigns/Email-templates/SMS/Trial-conversion/Summary pages.

### Backfill

`npx tsx scripts/backfill-from-sheets.ts` reads the `Leads` sheet tab and upserts into `public.leads`, matching by email (falling back to name when a row has no email) so it never creates duplicates — safe to re-run on a schedule or by hand. It only inserts/updates, never deletes. Extending it to the remaining tabs follows the same pattern; see the comment at the top of the script for the natural key to use per tab.

### Daily lead follow-up cron

`GET /api/cron/lead-followups`, protected like the existing cron routes (`Authorization: Bearer <CRON_SECRET>`, checked with `tokensMatch` from `src/lib/siteAuth.ts`), runs once a day (`vercel.json`). For every lead (scoped by `business_id`) without a booked appointment it:

1. Flags any booked appointment whose `scheduled_at` has passed and isn't `attended` as `no_show` (a status update only).
2. Decides what's due — day 1/3/7/14 of the sequence, or a no-show follow-up — via the pure `decideLeadFollowup` / `isAppointmentNoShow` helpers in `src/lib/leadSequence.ts` (tested in `src/lib/leadSequence.test.ts`).
3. Skips leads that unsubscribed, became members, or finished the sequence; marks a lead that replied as `needs_reply` instead of drafting.
4. If no `lead_drafts` row exists yet for that `(lead_id, step)` — the unique constraint makes this safe to re-run — generates one with `generateLeadEmail` (playbook tone/rules + latest examples) and inserts it with `status = "draft"`.

**Nothing is ever sent automatically.** Every row the cron writes is a draft. A human reviews it on the Leads page and clicks **Approve & Send**, which calls `POST /api/leads/drafts/[id]/send` — the only route that calls the Grok send webhook for a lead follow-up and the only place that writes to `email_log`. "Skip" (`POST /api/leads/drafts/[id]/skip`) only flags the draft `skipped`; it is never deleted.

The Leads page (`src/components/lyfeBoxing/dueFollowups.tsx`, mounted at the top of `src/components/lyfeBoxing/leads.tsx`) shows today's due drafts with Edit / Approve & Send / Skip, a "Book appointment" button per lead (`POST /api/appointments`, which stops that lead's sequence by making `hasBookedAppointment` true for `decideLeadFollowup`), and today's + upcoming appointments. The Playbook page (`src/components/lyfeBoxing/playbook.tsx`) has a `bookingLink` field that's included as a clear CTA in every generated draft (`playbookPromptBlock` in `src/lib/playbook.ts`).

To test locally:

```bash
curl -X GET http://localhost:3000/api/cron/lead-followups -H "Authorization: Bearer $CRON_SECRET"
```

Check `public.lead_drafts` afterwards (Supabase SQL editor or `select * from lead_drafts order by created_at desc`) — every new row should have `status = 'draft'`. Run it again immediately; it should insert nothing new (the unique `(lead_id, step)` constraint). To confirm nothing sends automatically: no code path other than `POST /api/leads/drafts/[id]/send` calls `notifyGrok` for a lead draft, and that route is only ever called from the Leads page's Approve & Send button.

## Environment variables

Set these on the Vercel project (Production) and in `.env.local` for local dev. `.env.local` is gitignored — do not commit secrets. Names and placeholders are listed in `.env.example`.

| Variable | Required | Purpose |
| --- | --- | --- |
| `GROK_WEBHOOK_URL` | Yes, for Send | URL the server POSTs when a row is queued. Body: `{ tab, rows, kind, site: "lyfe-boxing", queuedAt }`. |
| `GROK_WEBHOOK_AUTH` | Yes, for Send | Full `Authorization` header value sent with that POST (for example `Bearer <token>`). |
| `SITE_PASSWORD` | No | When set, every page and `/api` route asks for this password on `/login` and then stores an HttpOnly cookie. The check lives in `src/proxy.ts` (Next.js 16's middleware). When unset, the site stays open. `/api/cron/*` skips the password and uses `CRON_SECRET` instead. |
| `ANTHROPIC_API_KEY` | Yes, for AI drafts | Claude key used by campaign "Generate with AI", lead "Generate draft", and the lead-sequence cron. |
| `TRIAL_BOOKING_URL` | No | Exact trial-booking link inserted into every lead draft. If unset, drafts use the Trial link stored on the Playbook sheet tab. |
| `CRON_SECRET` | Yes, for the cron | Shared secret. Vercel Cron calls `GET /api/cron/lead-sequence` with `Authorization: Bearer <CRON_SECRET>` once daily at 9 AM New York (`0 13 * * *` in `vercel.json`). The route returns 401 without it. |
| `AUTO_SEND_STEP1` | No | Default off. Set to `true` or `1` to let the **old**, Sheets-backed `/api/cron/lead-sequence` route queue day-1 drafts and call the Grok webhook. Does not apply to `/api/cron/lead-followups`, which never auto-sends anything. |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Yes, for Supabase-backed routes | Server-only service-role client (`src/lib/supabaseServer.ts`). Required for Contacts, the Playbook, and the lead follow-up system. |

Lead follow-up reads the `Leads` and `Digest` tabs. The cron writes `Email Draft` / `Email Status` and advances `Sequence Step` and `Next Follow-up Date`. It does not send mail itself. Grok writes `Last Contacted` after a successful send. The Playbook page stores tone, offers, prices, FAQs, and the trial link on a `Playbook` tab (created automatically). Edits that differ from the AI original are appended to an `Examples` tab and the five newest are included in later prompts.

Google Sheets (`GOOGLE_SHEETS_SPREADSHEET_ID`, `GOOGLE_SHEETS_CLIENT_EMAIL`, `GOOGLE_SHEETS_PRIVATE_KEY`) are also required for live data. See `.env.example`.

If `GROK_WEBHOOK_URL` or `GROK_WEBHOOK_AUTH` is missing, Send still writes `Queued` and the UI shows **Webhook not configured**.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
